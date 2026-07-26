alter table public.orders
  add column if not exists whatsapp_updates_opt_in boolean not null default false;

drop view if exists public.ops_failed_payments;
drop view if exists public.ops_payment_review_orders;
drop view if exists public.ops_shipment_pending_orders;
drop view if exists public.ops_paid_orders;
drop view if exists public.ops_orders_recent;

create view public.ops_orders_recent as
select
  o.order_number,
  o.status as order_status,
  o.customer_name,
  o.customer_phone,
  o.customer_email,
  o.total_amount_paise,
  o.currency,
  p.status as payment_status,
  s.status as shipment_status,
  s.tracking_number,
  o.created_at,
  o.whatsapp_updates_opt_in
from public.orders o
left join public.payments p on p.order_id = o.id
left join public.shipments s on s.order_id = o.id
order by o.created_at desc;

create view public.ops_paid_orders as
select *
from public.ops_orders_recent
where order_status = 'paid';

create view public.ops_shipment_pending_orders as
select *
from public.ops_orders_recent
where order_status = 'shipment_pending';

create view public.ops_payment_review_orders as
select *
from public.ops_orders_recent
where order_status = 'payment_review_required';

create view public.ops_failed_payments as
select *
from public.ops_orders_recent
where order_status = 'payment_failed' or payment_status = 'failed';

revoke all on public.ops_orders_recent from anon, authenticated;
revoke all on public.ops_paid_orders from anon, authenticated;
revoke all on public.ops_shipment_pending_orders from anon, authenticated;
revoke all on public.ops_payment_review_orders from anon, authenticated;
revoke all on public.ops_failed_payments from anon, authenticated;
