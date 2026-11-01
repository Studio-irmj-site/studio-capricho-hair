-- Pending client requests reserve a slot immediately, before admin confirmation.
-- Do not change, cancel or delete any existing client request.
create unique index quotes_pending_slot_uidx
  on public.quotes(requested_date,requested_time) where status='Pendente';

create schema if not exists capricho_booking_internal;
revoke all on schema capricho_booking_internal from public, anon, authenticated;

-- Both entry points lock the same slot, so a manual appointment and a public
-- request cannot reserve it concurrently. The unique indexes also protect
-- against duplicate requests/appointments within their respective tables.
create function capricho_booking_internal.guard_pending_slot() returns trigger
language plpgsql volatile security definer set search_path='' as $$
begin
  if new.status <> 'Pendente' then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'capricho-slot:' || new.requested_date::text || ':' || new.requested_time::text,0));
  if exists(select 1 from public.quotes q
    where q.requested_date=new.requested_date and q.requested_time=new.requested_time
      and q.status='Pendente' and q.id is distinct from new.id)
    or exists(select 1 from public.appointments a
      where a.scheduled_date=new.requested_date and a.scheduled_time=new.requested_time
        and a.status in ('Agendado','Confirmado','Concluído')) then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
  end if;
  return new;
end;
$$;
revoke all on function capricho_booking_internal.guard_pending_slot() from public,anon,authenticated;
create trigger capricho_guard_pending_slot before insert or update of requested_date,requested_time,status
  on public.quotes for each row execute function capricho_booking_internal.guard_pending_slot();

create function capricho_booking_internal.guard_appointment_slot() returns trigger
language plpgsql volatile security definer set search_path='' as $$
begin
  if new.status not in ('Agendado','Confirmado','Concluído') then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'capricho-slot:' || new.scheduled_date::text || ':' || new.scheduled_time::text,0));
  if exists(select 1 from public.quotes q
    where q.requested_date=new.scheduled_date and q.requested_time=new.scheduled_time
      and q.status='Pendente' and q.id is distinct from new.quote_id)
    or exists(select 1 from public.appointments a
      where a.scheduled_date=new.scheduled_date and a.scheduled_time=new.scheduled_time
        and a.status in ('Agendado','Confirmado','Concluído') and a.id is distinct from new.id) then
    raise exception 'Este horário já está reservado para outra cliente.';
  end if;
  return new;
end;
$$;
revoke all on function capricho_booking_internal.guard_appointment_slot() from public,anon,authenticated;
create trigger capricho_guard_appointment_slot before insert or update of scheduled_date,scheduled_time,status,quote_id
  on public.appointments for each row execute function capricho_booking_internal.guard_appointment_slot();

create or replace function public.public_available_dates()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(d.available_date order by d.available_date),'[]'::jsonb)
  from (
    select distinct a.available_date from public.availability a
    where a.active and not a.blocked and a.available_date >= current_date
      and not exists(select 1 from public.appointments ap
        where ap.scheduled_date=a.available_date and ap.scheduled_time=a.start_time
          and ap.status in ('Agendado','Confirmado','Concluído'))
      and not exists(select 1 from public.quotes q
        where q.requested_date=a.available_date and q.requested_time=a.start_time and q.status='Pendente')
    order by a.available_date limit 90
  ) d
$$;

create or replace function public.public_available_slots(p_date date)
returns table(availability_id uuid,date date,start_time time)
language sql stable security definer set search_path=public,pg_temp as $$
  select a.id,a.available_date,a.start_time from public.availability a
  where a.available_date=p_date and a.available_date >= current_date and a.active and not a.blocked
    and not exists(select 1 from public.appointments ap
      where ap.scheduled_date=a.available_date and ap.scheduled_time=a.start_time
        and ap.status in ('Agendado','Confirmado','Concluído'))
    and not exists(select 1 from public.quotes q
      where q.requested_date=a.available_date and q.requested_time=a.start_time and q.status='Pendente')
  order by a.start_time
$$;
revoke all on function public.public_available_dates() from public;
revoke all on function public.public_available_slots(date) from public;
grant execute on function public.public_available_dates() to anon,authenticated;
grant execute on function public.public_available_slots(date) to anon,authenticated;
notify pgrst,'reload schema';
