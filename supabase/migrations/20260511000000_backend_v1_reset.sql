create extension if not exists pgcrypto;

drop view if exists public.ops_low_stock_variants;
drop view if exists public.ops_integration_errors;
drop view if exists public.ops_failed_payments;
drop view if exists public.ops_payment_review_orders;
drop view if exists public.ops_shipment_pending_orders;
drop view if exists public.ops_paid_orders;
drop view if exists public.ops_orders_recent;

drop function if exists public.confirm_paid_order(uuid, uuid, text, text, jsonb);

drop table if exists public.integration_events;
drop table if exists public.shipments;
drop table if exists public.payments;
drop table if exists public.order_items;
drop table if exists public.orders;
drop table if exists public.product_variant_sizes;
drop table if exists public.product_variants;
drop table if exists public.product_sizes;
drop table if exists public.payment_events;
drop table if exists public.products;

create table public.products (
  product_id text primary key,
  slug text not null unique,
  title text not null,
  category text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  variant_id text primary key,
  product_id text not null references public.products(product_id) on delete restrict,
  product_code text not null,
  slug text not null unique,
  title text not null,
  color text,
  tag text,
  brand text,
  images text[] not null default '{}',
  mrp_paise integer not null check (mrp_paise >= 0),
  selling_price_paise integer not null check (selling_price_paise >= 0),
  size_chart jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '[]'::jsonb,
  min_order_quantity integer not null default 1 check (min_order_quantity > 0),
  fulfillment_by text,
  shipping_provider text,
  package_length_cm numeric,
  package_breadth_cm numeric,
  package_height_cm numeric,
  package_weight_kg numeric,
  hsn text,
  tax_code text,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (selling_price_paise <= mrp_paise)
);

create table public.product_variant_sizes (
  inventory_id text primary key,
  variant_id text not null references public.product_variants(variant_id) on delete restrict,
  size_label text not null,
  stock_available integer not null default 0 check (stock_available >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_label)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status text not null default 'payment_pending' check (
    status in (
      'payment_pending',
      'paid',
      'payment_failed',
      'payment_review_required',
      'shipment_pending',
      'shipped',
      'delivered',
      'cancelled'
    )
  ),
  currency text not null default 'INR',
  subtotal_amount_paise integer not null check (subtotal_amount_paise >= 0),
  shipping_amount_paise integer not null default 0 check (shipping_amount_paise >= 0),
  total_amount_paise integer not null check (total_amount_paise >= 0),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  whatsapp_updates_opt_in boolean not null default false,
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_amount_paise = subtotal_amount_paise + shipping_amount_paise)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(product_id) on delete restrict,
  variant_id text not null references public.product_variants(variant_id) on delete restrict,
  inventory_id text not null references public.product_variant_sizes(inventory_id) on delete restrict,
  product_slug text not null,
  variant_slug text not null,
  product_code text not null,
  title text not null,
  size_label text not null,
  quantity integer not null check (quantity > 0),
  unit_selling_price_paise integer not null check (unit_selling_price_paise >= 0),
  unit_mrp_paise integer not null check (unit_mrp_paise >= 0),
  discount_amount_paise integer not null default 0 check (discount_amount_paise >= 0),
  line_total_paise integer not null check (line_total_paise >= 0),
  primary_image_url text,
  package_length_cm numeric,
  package_breadth_cm numeric,
  package_height_cm numeric,
  package_weight_kg numeric,
  created_at timestamptz not null default now(),
  check (line_total_paise = unit_selling_price_paise * quantity)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text not null,
  provider_payment_id text,
  signature text,
  status text not null default 'created' check (status in ('created', 'verified', 'failed')),
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  raw_payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_provider_order_id_idx
  on public.payments(provider, provider_order_id);

create unique index payments_provider_payment_id_idx
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'delhivery',
  provider_order_id text,
  tracking_number text,
  status text not null default 'pending' check (
    status in ('pending', 'created', 'in_transit', 'delivered', 'failed', 'cancelled')
  ),
  provider_status text,
  label_url text,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index shipments_provider_order_id_idx
  on public.shipments(provider, provider_order_id)
  where provider_order_id is not null;

create unique index shipments_tracking_number_idx
  on public.shipments(provider, tracking_number)
  where tracking_number is not null;

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  event_key text,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index integration_events_source_event_key_idx
  on public.integration_events(source, event_key)
  where event_key is not null;

create index products_active_category_idx on public.products(active, category);
create index products_slug_idx on public.products(slug);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index product_variants_active_featured_idx on public.product_variants(active, featured);
create index product_variant_sizes_variant_id_idx on public.product_variant_sizes(variant_id);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index orders_order_number_idx on public.orders(order_number);
create index order_items_order_id_idx on public.order_items(order_id);
create index payments_order_id_idx on public.payments(order_id);
create index shipments_status_idx on public.shipments(status);
create index integration_events_order_id_idx on public.integration_events(order_id);
create index integration_events_source_status_idx on public.integration_events(source, status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger product_variant_sizes_set_updated_at
before update on public.product_variant_sizes
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

create or replace function public.confirm_paid_order(
  p_order_id uuid,
  p_payment_id uuid,
  p_provider_payment_id text,
  p_signature text,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_insufficient jsonb;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id and order_id = p_order_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.status = 'verified' and v_order.status in ('paid', 'shipment_pending', 'shipped', 'delivered') then
    return jsonb_build_object('ok', true, 'alreadyProcessed', true, 'orderStatus', v_order.status);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'variantId', oi.variant_id,
      'inventoryId', oi.inventory_id,
      'size', oi.size_label,
      'requested', oi.quantity,
      'available', coalesce(pvs.stock_available, 0)
    )
  )
  into v_insufficient
  from public.order_items oi
  left join public.product_variants pv on pv.variant_id = oi.variant_id
  left join public.product_variant_sizes pvs on pvs.inventory_id = oi.inventory_id
  where oi.order_id = p_order_id
    and (
      pv.variant_id is null
      or pv.active is false
      or pvs.inventory_id is null
      or pvs.active is false
      or pvs.stock_available < oi.quantity
    );

  update public.payments
  set
    provider_payment_id = p_provider_payment_id,
    signature = p_signature,
    status = 'verified',
    verified_at = coalesce(verified_at, now()),
    raw_payload = coalesce(p_raw_payload, '{}'::jsonb)
  where id = p_payment_id;

  if v_insufficient is not null then
    update public.orders
    set status = 'payment_review_required'
    where id = p_order_id;

    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_stock',
      'orderStatus', 'payment_review_required',
      'items', v_insufficient
    );
  end if;

  update public.product_variant_sizes pvs
  set stock_available = pvs.stock_available - oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.inventory_id = pvs.inventory_id;

  update public.orders
  set status = 'paid'
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'alreadyProcessed', false, 'orderStatus', 'paid');
end;
$$;

revoke all on function public.confirm_paid_order(uuid, uuid, text, text, jsonb) from anon, authenticated;

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

create view public.ops_integration_errors as
select
  ie.source,
  ie.event_type,
  ie.status,
  o.order_number,
  ie.error_message,
  ie.created_at
from public.integration_events ie
left join public.orders o on o.id = ie.order_id
where ie.status = 'failed' or ie.error_message is not null
order by ie.created_at desc;

create view public.ops_low_stock_variants as
select
  p.product_id,
  p.category,
  pv.variant_id,
  pv.slug,
  pv.title,
  pv.product_code,
  pvs.inventory_id,
  pvs.size_label,
  pvs.stock_available,
  pvs.active as size_active,
  pv.active as variant_active,
  p.active as product_active
from public.product_variant_sizes pvs
join public.product_variants pv on pv.variant_id = pvs.variant_id
join public.products p on p.product_id = pv.product_id
where p.active = true
  and pv.active = true
  and pvs.active = true
  and pvs.stock_available <= 3
order by pvs.stock_available asc, pv.title asc, pvs.size_label asc;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_sizes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.integration_events enable row level security;

revoke all on public.products from anon, authenticated;
revoke all on public.product_variants from anon, authenticated;
revoke all on public.product_variant_sizes from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.shipments from anon, authenticated;
revoke all on public.integration_events from anon, authenticated;
revoke all on public.ops_orders_recent from anon, authenticated;
revoke all on public.ops_paid_orders from anon, authenticated;
revoke all on public.ops_shipment_pending_orders from anon, authenticated;
revoke all on public.ops_payment_review_orders from anon, authenticated;
revoke all on public.ops_failed_payments from anon, authenticated;
revoke all on public.ops_integration_errors from anon, authenticated;
revoke all on public.ops_low_stock_variants from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
