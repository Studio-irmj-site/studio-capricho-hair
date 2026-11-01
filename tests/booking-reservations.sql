-- Regression checks run in one transaction; all fixtures are rolled back.
begin;
do $test$
declare
  day date := '2099-12-31';
  request_id uuid;
  other_id uuid;
  appointment_id uuid;
begin
  insert into public.availability(available_date,start_time,active,blocked)
    values(day,'09:00',true,false),(day,'09:30',true,false);
  insert into public.quotes(protocol,client_name,client_phone,requested_date,requested_time,status)
    values('TEST-'||gen_random_uuid(),'Verificação temporária','5511000000000',day,'09:00','Pendente') returning id into request_id;
  if exists(select 1 from public.public_available_slots(day) where start_time='09:00') then
    raise exception 'Pending request still advertised as available';
  end if;
  if not exists(select 1 from public.public_available_slots(day) where start_time='09:30') then
    raise exception 'Unrelated slot was incorrectly hidden';
  end if;
  begin
    insert into public.quotes(protocol,client_name,client_phone,requested_date,requested_time,status)
      values('TEST-'||gen_random_uuid(),'Verificação duplicada','5511000000001',day,'09:00','Pendente');
    raise exception 'Second pending request unexpectedly accepted';
  exception when others then
    if sqlerrm not like 'Este horário%' then raise; end if;
  end;
  begin
    insert into public.appointments(client_name,client_phone,service_summary,scheduled_date,scheduled_time,total,status)
      values('Verificação duplicada','5511000000001','Teste',day,'09:00',100,'Agendado');
    raise exception 'Manual appointment displaced pending client';
  exception when others then
    if sqlerrm not like 'Este horário%' then raise; end if;
  end;
  -- Confirming the request must transfer its reservation to its own appointment.
  insert into public.appointments(quote_id,client_name,client_phone,service_summary,scheduled_date,scheduled_time,total,status)
    values(request_id,'Verificação temporária','5511000000000','Teste',day,'09:00',100,'Confirmado') returning id into appointment_id;
  update public.quotes set status='Confirmado' where id=request_id;
  if exists(select 1 from public.public_available_slots(day) where start_time='09:00') then
    raise exception 'Confirmed slot was released';
  end if;
  insert into public.quotes(protocol,client_name,client_phone,requested_date,requested_time,status)
    values('TEST-'||gen_random_uuid(),'Verificação temporária','5511000000001',day,'09:30','Pendente') returning id into other_id;
  if public.public_available_dates() @> jsonb_build_array(day) then
    raise exception 'Fully reserved date still advertised';
  end if;
  update public.quotes set status='Recusado' where id=other_id;
  if not exists(select 1 from public.public_available_slots(day) where start_time='09:30') then
    raise exception 'Declined request did not release slot';
  end if;
  update public.appointments set scheduled_time='09:30' where id=appointment_id;
  if not exists(select 1 from public.public_available_slots(day) where start_time='09:00')
     or exists(select 1 from public.public_available_slots(day) where start_time='09:30') then
    raise exception 'Rescheduling did not transfer reservation';
  end if;
  update public.appointments set status='Cancelado' where id=appointment_id;
  update public.quotes set status='Cancelado' where id=request_id;
  if (select count(*) from public.public_available_slots(day))<>2 then
    raise exception 'Cancellation did not release slot';
  end if;
end $test$;
rollback;
