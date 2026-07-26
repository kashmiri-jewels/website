create table if not exists public.order_number_sequences (
  financial_year text primary key,
  last_value integer not null check (last_value >= 0),
  updated_at timestamptz not null default now()
);

revoke all on public.order_number_sequences from anon, authenticated;

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_start_year integer;
  v_end_year integer;
  v_financial_year text;
  v_existing_max integer;
  v_next integer;
begin
  if extract(month from v_today)::integer >= 4 then
    v_start_year := extract(year from v_today)::integer;
    v_end_year := v_start_year + 1;
  else
    v_end_year := extract(year from v_today)::integer;
    v_start_year := v_end_year - 1;
  end if;

  v_financial_year := right(v_start_year::text, 2) || '-' || right(v_end_year::text, 2);

  perform pg_advisory_xact_lock(hashtext('kashmiri-jewels-order-number-' || v_financial_year));

  select coalesce(
    max((regexp_match(order_number, '^KJ/ECOM/([0-9]+)/' || v_financial_year || '$'))[1]::integer),
    0
  )
  into v_existing_max
  from public.orders
  where order_number ~ ('^KJ/ECOM/[0-9]+/' || v_financial_year || '$');

  insert into public.order_number_sequences (financial_year, last_value)
  values (v_financial_year, v_existing_max)
  on conflict (financial_year) do update
    set last_value = greatest(public.order_number_sequences.last_value, excluded.last_value),
        updated_at = now()
  returning last_value + 1 into v_next;

  update public.order_number_sequences
  set last_value = v_next,
      updated_at = now()
  where financial_year = v_financial_year;

  return 'KJ/ECOM/' || lpad(v_next::text, 3, '0') || '/' || v_financial_year;
end;
$$;

grant execute on function public.next_order_number() to service_role;
