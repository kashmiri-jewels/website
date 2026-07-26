alter table public.product_variants
  add column if not exists package_length_cm numeric,
  add column if not exists package_breadth_cm numeric,
  add column if not exists package_height_cm numeric,
  add column if not exists package_weight_kg numeric;

alter table public.order_items
  add column if not exists package_length_cm numeric,
  add column if not exists package_breadth_cm numeric,
  add column if not exists package_height_cm numeric,
  add column if not exists package_weight_kg numeric;
