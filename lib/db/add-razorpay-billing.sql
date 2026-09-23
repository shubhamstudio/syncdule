-- Run on an InsForge backend branch before merging to production.
-- App-owned billing state: never render payment provider tables directly to users.

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  plan text not null check (plan in ('pro')),
  amount integer not null check (amount > 0),
  currency text not null default 'INR',
  provider_order_id text unique,
  provider_payment_id text,
  status text not null default 'pending'
    check (status in ('pending', 'verification_pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  user_id text primary key,
  plan text not null check (plan in ('pro')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  provider text not null default 'razorpay',
  source_order_id uuid references public.billing_orders(id) on delete set null,
  activated_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.billing_orders enable row level security;
alter table public.user_entitlements enable row level security;

drop policy if exists billing_orders_owner_access on public.billing_orders;
create policy billing_orders_owner_access on public.billing_orders
  for all
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

drop policy if exists user_entitlements_owner_read on public.user_entitlements;
create policy user_entitlements_owner_read on public.user_entitlements
  for select
  using (user_id = public.requesting_user_id());

-- InsForge performs this authorization probe before it creates a Razorpay order.
alter table payments.razorpay_orders enable row level security;
drop policy if exists user_creates_own_razorpay_orders on payments.razorpay_orders;
create policy user_creates_own_razorpay_orders on payments.razorpay_orders
  for insert
  to public
  with check (
    subject_type = 'user'
    and subject_id = public.requesting_user_id()
  );

-- Checkout verification proves the browser callback is genuine, but it must
-- never grant access. Only a processed provider webhook can do that.
create or replace function public.fulfill_razorpay_pro_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_ref text;
  v_order_id uuid;
  v_payment_id text;
begin
  if new.provider <> 'razorpay'
     or new.processing_status <> 'processed'
     or new.event_type not in ('payment.captured', 'order.paid') then
    return new;
  end if;

  v_order_ref := coalesce(
    new.payload -> 'payload' -> 'payment' -> 'entity' -> 'notes' ->> 'internal_order_id',
    new.payload -> 'payload' -> 'order' -> 'entity' -> 'notes' ->> 'internal_order_id'
  );
  v_payment_id := new.payload -> 'payload' -> 'payment' -> 'entity' ->> 'id';

  if v_order_ref is null
     or v_order_ref !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return new;
  end if;

  v_order_id := v_order_ref::uuid;

  update public.billing_orders
  set status = 'paid',
      provider_payment_id = coalesce(v_payment_id, provider_payment_id),
      updated_at = now()
  where id = v_order_id
    and status in ('pending', 'verification_pending');

  insert into public.user_entitlements (user_id, plan, status, provider, source_order_id)
  select user_id, plan, 'active', 'razorpay', id
  from public.billing_orders
  where id = v_order_id
    and status = 'paid'
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'active',
    provider = 'razorpay',
    source_order_id = excluded.source_order_id,
    activated_at = now(),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists fulfill_razorpay_pro_order_from_webhook on payments.webhook_events;
create trigger fulfill_razorpay_pro_order_from_webhook
  after insert or update on payments.webhook_events
  for each row execute function public.fulfill_razorpay_pro_order();
