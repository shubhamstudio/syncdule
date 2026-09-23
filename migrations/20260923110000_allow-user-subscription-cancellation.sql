-- InsForge checks this policy before a user-owned Razorpay subscription can
-- be cancelled or resumed through the server-side billing routes.
alter table payments.razorpay_subscriptions enable row level security;

drop policy if exists user_manages_own_razorpay_subscription on payments.razorpay_subscriptions;
create policy user_manages_own_razorpay_subscription
on payments.razorpay_subscriptions
for update
to public
using (
  subject_type = 'user'
  and subject_id = public.requesting_user_id()
)
with check (
  subject_type = 'user'
  and subject_id = public.requesting_user_id()
);
