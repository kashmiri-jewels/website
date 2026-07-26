alter table public.orders
  add column if not exists invoice_number text;

create table if not exists public.invoice_number_sequences (
  financial_year text primary key,
  last_value integer not null default 0,
  updated_at timestamptz not null default now()
);

revoke all on public.invoice_number_sequences from anon, authenticated;

create or replace function public.current_invoice_financial_year()
returns text
language sql
stable
as $$
  select
    case
      when extract(month from timezone('Asia/Kolkata', now())) >= 4 then
        to_char(timezone('Asia/Kolkata', now()), 'YY') || '-' ||
        to_char(timezone('Asia/Kolkata', now()) + interval '1 year', 'YY')
      else
        to_char(timezone('Asia/Kolkata', now()) - interval '1 year', 'YY') || '-' ||
        to_char(timezone('Asia/Kolkata', now()), 'YY')
    end;
$$;

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_financial_year text := public.current_invoice_financial_year();
  v_existing_max integer := 0;
  v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext('invoice-number:' || v_financial_year));

  select coalesce(
    max((regexp_match(invoice_number, '^KJ/ECOM/([0-9]+)/' || v_financial_year || '$'))[1]::integer),
    0
  )
  into v_existing_max
  from public.orders
  where invoice_number ~ ('^KJ/ECOM/[0-9]+/' || v_financial_year || '$');

  insert into public.invoice_number_sequences (financial_year, last_value)
  values (v_financial_year, v_existing_max)
  on conflict (financial_year) do update
    set last_value = greatest(public.invoice_number_sequences.last_value, excluded.last_value),
        updated_at = now();

  update public.invoice_number_sequences
  set last_value = last_value + 1,
      updated_at = now()
  where financial_year = v_financial_year
  returning last_value into v_next;

  return 'KJ/ECOM/' || lpad(v_next::text, 3, '0') || '/' || v_financial_year;
end;
$$;

revoke all on function public.current_invoice_financial_year() from anon, authenticated;
revoke all on function public.next_invoice_number() from anon, authenticated;
grant execute on function public.next_invoice_number() to service_role;

update public.orders
set invoice_number = order_number
where invoice_number is null
  and order_number ~ '^KJ/ECOM/[0-9]+/[0-9]{2}-[0-9]{2}$';

do $$
declare
  v_row record;
  v_invoice_number text;
begin
  for v_row in
    select id
    from public.orders
    where invoice_number is null
    order by created_at, id
  loop
    v_invoice_number := public.next_invoice_number();

    update public.orders
    set invoice_number = v_invoice_number
    where id = v_row.id;
  end loop;
end;
$$;

alter table public.orders
  alter column invoice_number set not null;

create unique index if not exists orders_invoice_number_idx
  on public.orders(invoice_number);

drop view if exists public.ops_failed_payments;
drop view if exists public.ops_payment_review_orders;
drop view if exists public.ops_shipment_pending_orders;
drop view if exists public.ops_paid_orders;
drop view if exists public.ops_orders_recent;

create view public.ops_orders_recent as
select
  o.order_number,
  o.invoice_number,
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
