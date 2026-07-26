do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'size_label'
  ) then
    alter table public.product_variants
      alter column size_label drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'stock_available'
  ) then
    alter table public.product_variants
      alter column stock_available set default 0,
      alter column stock_available drop not null;
  end if;
end;
$$;

notify pgrst, 'reload schema';
