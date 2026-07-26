alter table public.product_variants
  add column if not exists product_code text,
  add column if not exists slug text,
  add column if not exists title text,
  add column if not exists color text,
  add column if not exists tag text,
  add column if not exists brand text,
  add column if not exists images text[] not null default '{}',
  add column if not exists mrp_paise integer not null default 0,
  add column if not exists selling_price_paise integer not null default 0,
  add column if not exists size_chart jsonb not null default '[]'::jsonb,
  add column if not exists attributes jsonb not null default '[]'::jsonb,
  add column if not exists min_order_quantity integer not null default 1,
  add column if not exists fulfillment_by text,
  add column if not exists shipping_provider text,
  add column if not exists package_length_cm numeric,
  add column if not exists package_breadth_cm numeric,
  add column if not exists package_height_cm numeric,
  add column if not exists package_weight_kg numeric,
  add column if not exists hsn text,
  add column if not exists tax_code text,
  add column if not exists featured boolean not null default false;

update public.product_variants
set
  product_code = coalesce(product_code, variant_id),
  slug = coalesce(slug, lower(regexp_replace(variant_id, '[^a-zA-Z0-9]+', '-', 'g'))),
  title = coalesce(title, variant_id),
  active = false
where product_code is null
   or slug is null
   or title is null;

alter table public.product_variants
  alter column product_code set not null,
  alter column slug set not null,
  alter column title set not null,
  alter column min_order_quantity set not null;

create unique index if not exists product_variants_slug_idx
  on public.product_variants(slug);

create index if not exists product_variants_active_featured_idx
  on public.product_variants(active, featured);

create table if not exists public.product_variant_sizes (
  inventory_id text primary key,
  variant_id text not null references public.product_variants(variant_id) on delete restrict,
  size_label text not null,
  stock_available integer not null default 0 check (stock_available >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_label)
);

insert into public.product_variant_sizes (
  inventory_id,
  variant_id,
  size_label,
  stock_available,
  active,
  created_at,
  updated_at
)
select
  pv.variant_id,
  pv.variant_id,
  coalesce(pv.size_label, 'default'),
  coalesce(pv.stock_available, 0),
  false,
  pv.created_at,
  pv.updated_at
from public.product_variants pv
where not exists (
  select 1
  from public.product_variant_sizes pvs
  where pvs.inventory_id = pv.variant_id
);

create index if not exists product_variant_sizes_variant_id_idx
  on public.product_variant_sizes(variant_id);

drop trigger if exists product_variant_sizes_set_updated_at on public.product_variant_sizes;

create trigger product_variant_sizes_set_updated_at
before update on public.product_variant_sizes
for each row execute function public.set_updated_at();

alter table public.order_items
  add column if not exists inventory_id text,
  add column if not exists variant_slug text,
  add column if not exists product_code text,
  add column if not exists package_length_cm numeric,
  add column if not exists package_breadth_cm numeric,
  add column if not exists package_height_cm numeric,
  add column if not exists package_weight_kg numeric;

update public.order_items
set
  inventory_id = coalesce(inventory_id, variant_id),
  variant_slug = coalesce(variant_slug, product_slug),
  product_code = coalesce(product_code, variant_id)
where inventory_id is null
   or variant_slug is null
   or product_code is null;

alter table public.order_items
  alter column inventory_id set not null,
  alter column variant_slug set not null,
  alter column product_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_inventory_id_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_inventory_id_fkey
      foreign key (inventory_id)
      references public.product_variant_sizes(inventory_id)
      on delete restrict;
  end if;
end;
$$;

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
    raw_payload = p_raw_payload,
    verified_at = now(),
    updated_at = now()
  where id = p_payment_id;

  if v_insufficient is not null then
    update public.payments
    set status = 'verified', updated_at = now()
    where id = p_payment_id;

    update public.orders
    set status = 'payment_review_required', updated_at = now()
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
  set status = 'paid', updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'alreadyProcessed', false, 'orderStatus', 'paid');
end;
$$;

revoke all on function public.confirm_paid_order(uuid, uuid, text, text, jsonb) from anon, authenticated;

drop view if exists public.ops_low_stock_variants;

create view public.ops_low_stock_variants as
select
  p.product_id,
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

alter table public.product_variant_sizes enable row level security;

revoke all on public.product_variant_sizes from anon, authenticated;
revoke all on public.ops_low_stock_variants from anon, authenticated;

notify pgrst, 'reload schema';
