-- Razorpay authorizes subscription creation against this managed table before
-- forwarding the request to the provider. Restrict new subscriptions to the
-- currently authenticated user; the existing UPDATE rule governs cancellation.
alter table payments.razorpay_subscriptions enable row level security;

drop policy if exists user_creates_own_razorpay_subscription
  on payments.razorpay_subscriptions;

create policy user_creates_own_razorpay_subscription
  on payments.razorpay_subscriptions
  for insert
  to public
  with check (
    subject_type = 'user'
    and subject_id = public.requesting_user_id()
  );