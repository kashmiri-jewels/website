do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'images'
  ) then
    alter table public.products
      alter column images set default '{}',
      alter column images drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'mrp_paise'
  ) then
    alter table public.products
      alter column mrp_paise set default 0,
      alter column mrp_paise drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'selling_price_paise'
  ) then
    alter table public.products
      alter column selling_price_paise set default 0,
      alter column selling_price_paise drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'size_chart'
  ) then
    alter table public.products
      alter column size_chart set default '[]'::jsonb,
      alter column size_chart drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'featured'
  ) then
    alter table public.products
      alter column featured set default false,
      alter column featured drop not null;
  end if;
end;
$$;

notify pgrst, 'reload schema';
