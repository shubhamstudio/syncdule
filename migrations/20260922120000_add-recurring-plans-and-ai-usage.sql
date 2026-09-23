-- Recurring plan catalogue and quota ledger. Apply on an InsForge backend branch
-- before production so Razorpay's webhook can fulfil subscriptions safely.

create table if not exists public.plan_catalog (
  id text primary key check (id in ('starter', 'creator', 'growth')),
  name text not null,
  price_paise integer not null check (price_paise > 0),
  ai_generation_quota integer not null check (ai_generation_quota > 0),
  interval text not null default 'month' check (interval = 'month'),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

alter table public.scheduled_posts add column if not exists video jsonb;

insert into public.plan_catalog (id, name, price_paise, ai_generation_quota, features) values
  ('starter', 'Starter', 9900, 10, '["Ideas workspace", "Draft posts"]'::jsonb),
  ('creator', 'Creator', 29900, 60, '["Content scheduling", "Basic analytics"]'::jsonb),
  ('growth', 'Growth', 69900, 200, '["Viral Content Suggestor", "Priority generation", "Up to 3 team seats"]'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  price_paise = excluded.price_paise,
  ai_generation_quota = excluded.ai_generation_quota,
  features = excluded.features,
  active = true;

-- The original bootstrap used a single non-recurring `pro` entitlement. Drop
-- its restrictive checks before migrating rows to the recurring catalogue.
alter table public.user_entitlements drop constraint if exists user_entitlements_plan_check;
alter table public.billing_orders drop constraint if exists billing_orders_plan_check;
alter table public.user_entitlements
  add column if not exists ai_quota integer not null default 10,
  add column if not exists cycle_started_at timestamptz,
  add column if not exists renews_at timestamptz,
  add column if not exists provider_subscription_id text,
  add column if not exists pending_plan text,
  add column if not exists canceled_at timestamptz;
alter table public.billing_orders
  add column if not exists provider_subscription_id text,
  add column if not exists billing_interval text not null default 'month';

-- No legacy plan remains permanent: the old `pro` record is placed on Creator.
-- If a pre-bootstrap lifetime/forever value exists, it gets a one-cycle Growth
-- grace period and then needs an explicit recurring plan selection.
update public.user_entitlements
set plan = 'creator', ai_quota = 60,
    cycle_started_at = coalesce(cycle_started_at, activated_at, now()),
    renews_at = coalesce(renews_at, activated_at + interval '1 month', now() + interval '1 month')
where plan = 'pro';

update public.user_entitlements
set plan = 'growth', ai_quota = 200,
    cycle_started_at = coalesce(cycle_started_at, activated_at, now()),
    renews_at = coalesce(renews_at, now() + interval '30 days'),
    expires_at = coalesce(expires_at, now() + interval '30 days')
where lower(plan) in ('lifetime', 'forever', 'permanent');

-- Existing payment attempts keep their historical record, but must use a
-- current catalogue key before the recurring-plan check is restored.
-- The old one-off Pro offer maps to Creator; legacy permanent offers receive
-- the same one-cycle Growth grace mapping as their entitlement records.
update public.billing_orders
set plan = 'creator'
where plan = 'pro';

update public.billing_orders
set plan = 'growth'
where lower(plan) in ('lifetime', 'forever', 'permanent');

alter table public.user_entitlements
  add constraint user_entitlements_plan_check check (plan in ('starter', 'creator', 'growth'));
alter table public.billing_orders
  add constraint billing_orders_plan_check check (plan in ('starter', 'creator', 'growth'));

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  entitlement_plan text not null check (entitlement_plan in ('starter', 'creator', 'growth')),
  feature text not null check (feature in ('ideas', 'post-copy', 'viral-suggestor')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;
drop policy if exists ai_usage_events_owner_read on public.ai_usage_events;
create policy ai_usage_events_owner_read on public.ai_usage_events
  for select using (user_id = public.requesting_user_id());

-- Atomically checks, rolls the monthly window when necessary, and records one
-- generation. This avoids client-side quota races across browser tabs.
create or replace function public.consume_ai_quota(p_feature text)
returns table (allowed boolean, used integer, quota integer, renews_at timestamptz, plan text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_entitlement public.user_entitlements%rowtype;
  v_used integer;
begin
  select * into v_entitlement
  from public.user_entitlements
  where user_id = public.requesting_user_id() and status = 'active'
  order by updated_at desc limit 1 for update;

  if not found or (v_entitlement.expires_at is not null and v_entitlement.expires_at <= now()) then
    return query select false, 0, 0, null::timestamptz, null::text;
    return;
  end if;

  if v_entitlement.renews_at is null or v_entitlement.renews_at <= now() then
    update public.user_entitlements
    set cycle_started_at = now(), renews_at = now() + interval '1 month', updated_at = now()
    where user_id = v_entitlement.user_id
    returning * into v_entitlement;
  end if;

  select count(*) into v_used from public.ai_usage_events
  where user_id = v_entitlement.user_id and created_at >= coalesce(v_entitlement.cycle_started_at, v_entitlement.activated_at);

  if v_used >= v_entitlement.ai_quota then
    return query select false, v_used, v_entitlement.ai_quota, v_entitlement.renews_at, v_entitlement.plan;
    return;
  end if;

  insert into public.ai_usage_events (user_id, entitlement_plan, feature)
  values (v_entitlement.user_id, v_entitlement.plan, p_feature);
  return query select true, v_used + 1, v_entitlement.ai_quota, v_entitlement.renews_at, v_entitlement.plan;
end;
$$;

grant execute on function public.consume_ai_quota(text) to authenticated;

-- Webhook fulfilment is deliberately idempotent. Checkout verification only
-- confirms the browser callback; this is the durable entitlement transition.
create or replace function public.fulfill_recurring_plan_from_razorpay()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_subscription_id text;
  v_order_id uuid;
  v_plan text;
  v_quota integer;
  v_renews_at timestamptz;
begin
  if new.provider <> 'razorpay' or new.processing_status <> 'processed' then
    return new;
  end if;

  v_subscription_id := coalesce(
    new.payload -> 'payload' -> 'subscription' -> 'entity' ->> 'id',
    new.payload -> 'payload' -> 'payment' -> 'entity' ->> 'subscription_id'
  );

  if new.event_type in ('subscription.charged', 'subscription.activated', 'invoice.paid') and v_subscription_id is not null then
    select id, plan into v_order_id, v_plan
    from public.billing_orders
    where provider_subscription_id = v_subscription_id
    order by created_at desc limit 1;

    if v_order_id is not null then
      select ai_generation_quota into v_quota from public.plan_catalog where id = v_plan;
      v_renews_at := coalesce(
        (new.payload -> 'payload' -> 'subscription' -> 'entity' ->> 'charge_at')::bigint * interval '1 second' + timestamptz 'epoch',
        now() + interval '1 month'
      );
      update public.billing_orders set status = 'paid', updated_at = now() where id = v_order_id and status <> 'paid';
      insert into public.user_entitlements (user_id, plan, status, provider, source_order_id, activated_at, ai_quota, cycle_started_at, renews_at, provider_subscription_id, updated_at)
      select user_id, v_plan, 'active', 'razorpay', id, now(), v_quota, now(), v_renews_at, provider_subscription_id, now()
      from public.billing_orders where id = v_order_id
      on conflict (user_id) do update set
        plan = excluded.plan, status = 'active', source_order_id = excluded.source_order_id,
        ai_quota = excluded.ai_quota, cycle_started_at = excluded.cycle_started_at,
        renews_at = excluded.renews_at, provider_subscription_id = excluded.provider_subscription_id,
        expires_at = null, updated_at = now();
    end if;
  elsif new.event_type in ('subscription.cancelled', 'subscription.halted', 'subscription.expired') and v_subscription_id is not null then
    update public.user_entitlements
    set status = 'revoked', canceled_at = now(), updated_at = now()
    where provider_subscription_id = v_subscription_id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists fulfill_recurring_plan_from_razorpay on payments.webhook_events;
create trigger fulfill_recurring_plan_from_razorpay
after insert or update on payments.webhook_events
for each row execute function public.fulfill_recurring_plan_from_razorpay();
