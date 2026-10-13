-- Additive: leaves the legacy service_promotions table and all old booking RPCs intact.
create table public.dated_promotions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text check (char_length(description) <= 500),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  promotional_price numeric(12,2) not null check (promotional_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index dated_promotions_service_dates_idx on public.dated_promotions(service_id, start_date, end_date) where active;
alter table public.dated_promotions enable row level security;
revoke all on public.dated_promotions from public, anon, authenticated;
grant select on public.dated_promotions to anon;
grant select, insert, update, delete on public.dated_promotions to authenticated;
grant all on public.dated_promotions to service_role;
create policy dated_promotions_public_read on public.dated_promotions for select to anon
  using (active and end_date >= (now() at time zone 'America/Sao_Paulo')::date and exists (select 1 from public.services s where s.id = service_id and s.active));
create policy dated_promotions_authenticated_read on public.dated_promotions for select to authenticated
  using ((select public.is_admin()) or (active and end_date >= (now() at time zone 'America/Sao_Paulo')::date and exists (select 1 from public.services s where s.id = service_id and s.active)));
create policy dated_promotions_admin_insert on public.dated_promotions for insert to authenticated with check ((select public.is_admin()));
create policy dated_promotions_admin_update on public.dated_promotions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy dated_promotions_admin_delete on public.dated_promotions for delete to authenticated using ((select public.is_admin()));

create schema if not exists capricho_promotions_internal;
revoke all on schema capricho_promotions_internal from public;
grant usage on schema capricho_promotions_internal to anon, authenticated;

create function capricho_promotions_internal.validate_price() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare regular_price numeric;
begin
  if tg_op = 'UPDATE' then
    if new.service_id = old.service_id and new.promotional_price = old.promotional_price then return new; end if;
  end if;
  select price into regular_price from public.services where id = new.service_id and active;
  if regular_price is null or new.promotional_price >= regular_price then
    raise exception 'Selecione um serviço ativo e um preço promocional menor que o valor normal.';
  end if;
  return new;
end;
$$;
revoke all on function capricho_promotions_internal.validate_price() from public, anon, authenticated;
create trigger dated_promotions_validate before insert or update on public.dated_promotions for each row execute function capricho_promotions_internal.validate_price();

-- Intentionally public booking entry point: the existing RPC validates contact,
-- availability, quantities, honeypot and rate limits before creating the quote.
-- Callers cannot supply a quote ID or a price. Only its newly created quote is repriced.
create function capricho_promotions_internal.submit_request(
  p_client_name text, p_client_phone text, p_requested_date date, p_requested_time time,
  p_notes text, p_items jsonb, p_honeypot text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; v_quote_id uuid; v_total numeric;
begin
  result := public.submit_public_request(p_client_name,p_client_phone,p_requested_date,p_requested_time,p_notes,p_items,p_honeypot);
  v_quote_id := (result->>'quote_id')::uuid;
  update public.quote_items qi set unit_price = least(qi.unit_price, coalesce((
    select min(p.promotional_price) from public.dated_promotions p
    where p.service_id = qi.service_id and p.active and p_requested_date between p.start_date and p.end_date
  ), qi.unit_price)) where qi.quote_id = v_quote_id;
  select coalesce(sum(subtotal),0) into v_total from public.quote_items qi where qi.quote_id = v_quote_id;
  update public.quotes q set total = v_total where q.id = v_quote_id;
  return result || jsonb_build_object('total',v_total);
end;
$$;
revoke all on function capricho_promotions_internal.submit_request(text,text,date,time,text,jsonb,text) from public, anon, authenticated;
grant execute on function capricho_promotions_internal.submit_request(text,text,date,time,text,jsonb,text) to anon, authenticated;

create function public.submit_promotional_request(
  p_client_name text, p_client_phone text, p_requested_date date, p_requested_time time,
  p_notes text, p_items jsonb, p_honeypot text default ''
) returns jsonb language sql security invoker set search_path = '' as $$
  select capricho_promotions_internal.submit_request(p_client_name,p_client_phone,p_requested_date,p_requested_time,p_notes,p_items,p_honeypot)
$$;
revoke all on function public.submit_promotional_request(text,text,date,time,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_promotional_request(text,text,date,time,text,jsonb,text) to anon, authenticated;
notify pgrst, 'reload schema';
