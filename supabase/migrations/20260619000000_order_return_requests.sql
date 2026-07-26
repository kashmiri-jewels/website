create table if not exists public.order_return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_number text not null,
  customer_phone text not null,
  status text not null default 'requested' check (
    status in (
      'requested',
      'reviewing',
      'approved',
      'rejected',
      'pickup_scheduled',
      'received',
      'refunded',
      'cancelled'
    )
  ),
  reason text not null,
  customer_note text,
  requested_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_return_requests_order_id_idx
  on public.order_return_requests(order_id);

create index if not exists order_return_requests_status_created_at_idx
  on public.order_return_requests(status, created_at desc);

create unique index if not exists order_return_requests_one_active_per_order_idx
  on public.order_return_requests(order_id)
  where status in ('requested', 'reviewing', 'approved', 'pickup_scheduled');

drop trigger if exists order_return_requests_set_updated_at on public.order_return_requests;

create trigger order_return_requests_set_updated_at
before update on public.order_return_requests
for each row execute function public.set_updated_at();

drop view if exists public.ops_return_requests;

create view public.ops_return_requests as
select
  rr.id,
  rr.order_number,
  rr.status,
  rr.reason,
  rr.customer_note,
  rr.created_at,
  o.customer_name,
  o.customer_phone,
  o.customer_email,
  o.status as order_status,
  o.total_amount_paise,
  o.currency
from public.order_return_requests rr
join public.orders o on o.id = rr.order_id
order by rr.created_at desc;

alter table public.order_return_requests enable row level security;

revoke all on public.order_return_requests from anon, authenticated;
revoke all on public.ops_return_requests from anon, authenticated;
