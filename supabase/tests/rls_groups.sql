-- Pruebas de ataque de clases grupales. Ejecutar DESPUÉS de rls_reminders.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; cc uuid; ws uuid; sg uuid; n int; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b; select id into cc from public.clients where profile_id=c;
  delete from public.bookings where client_id in (ca,cb,cc);
  update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial' and workspace_id=ws) where id=cc;
  insert into public.availability_slots (workspace_id, starts_at, duration_min, kind, capacity) values (ws, now()+interval '3 days', 60, 'followup', 2) returning id into sg;
  if pg_temp.try('insert into public.availability_slots (workspace_id, starts_at, capacity) values ('''||ws||''', now()+interval ''4 days'', 0)') then bad:=bad||' [capacidad 0]'; end if;
  perform pg_temp.as_user(a); perform public.book_slot(sg);
  perform pg_temp.as_user(b); perform public.book_slot(sg);
  perform pg_temp.as_user(c);
  if pg_temp.try('select public.book_slot('''||sg||''')') then bad:=bad||' [se superaron los cupos]'; end if;
  select count(*) into n from public.list_open_slots(now(), now()+interval '10 days') where id=sg and taken and capacity=2 and booked=2; if n<>1 then bad:=bad||' [lista de huecos no marca lleno]'; end if;
  perform pg_temp.as_user(jeff);
  if pg_temp.try('select public.coach_book_slot('''||sg||''','''||cc||''')') then bad:=bad||' [coach superó los cupos]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try('select public.coach_book_slot('''||sg||''','''||cc||''')') then bad:=bad||' [otro coach reservó]'; end if;
  -- a cancela y libera un cupo
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.book_slot('''||sg||''')') then bad:=bad||' [doble reserva del mismo cliente]'; end if;
  perform pg_temp.reset(); select count(*) into n from public.bookings where slot_id=sg and status='confirmed'; if n<>2 then bad:=bad||' [cupos confirmados '||n||']'; end if;
  perform pg_temp.as_user(jeff);
  perform public.cancel_booking((select id from public.bookings where slot_id=sg and client_id=ca and status='confirmed'));
  perform pg_temp.as_user(c); perform public.book_slot(sg);
  perform pg_temp.reset(); select count(*) into n from public.bookings where slot_id=sg and status='confirmed'; if n<>2 then bad:=bad||' [tras cancelar no se reutilizó el cupo]'; end if;
  if pg_temp.try('update public.availability_slots set status=''cancelled'' where id='''||sg||'''') then bad:=bad||' [canceló hueco con reservas]'; end if;
  raise notice 'RESULTADO ATAQUES GRUPOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
