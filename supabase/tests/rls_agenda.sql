-- Pruebas de ataque de la Agenda. Ejecutar DESPUÉS de rls.sql y rls_progress.sql (usa sus usuarios).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1'; ows uuid:='99999999-9999-9999-9999-999999999999';
  ws uuid; ca uuid; cb uuid; s1 uuid; s2 uuid; s3 uuid; sfar uuid; bk uuid; bkb uuid; n int; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.reset();
  update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial') where id in (ca,cb);
  perform pg_temp.as_user(jeff);
  insert into public.availability_slots (workspace_id,starts_at) values (ws, now()+interval '48 hours') returning id into s1;
  insert into public.availability_slots (workspace_id,starts_at) values (ws, now()+interval '72 hours') returning id into s2;
  insert into public.availability_slots (workspace_id,starts_at) values (ws, now()+interval '5 hours') returning id into s3;
  insert into public.availability_slots (workspace_id,starts_at) values (ws, now()+interval '120 hours') returning id into sfar;
  perform pg_temp.as_user(o); insert into public.availability_slots (workspace_id,starts_at) values (ows, now()+interval '48 hours');
  if not pg_temp.fails(format('insert into public.availability_slots (workspace_id,starts_at) values (%L, now()+interval %L)', ws, '10 hours')) then bad:=bad||' [otro coach publicó en el espacio de Jeff]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.list_open_slots(now(), now()+interval '30 days'); assert n=4, 'A debería ver 4 huecos del espacio de Jeff, vio '||n;
  bk := public.book_slot(s1); raise notice 'OK reserva normal';
  if not pg_temp.fails(format('select public.book_slot(%L)', s2)) then bad:=bad||' [A reservó una segunda sesión futura]'; end if;
  perform pg_temp.as_user(b);
  if not pg_temp.fails(format('select public.book_slot(%L)', s1)) then bad:=bad||' [B reservó un hueco ya ocupado]'; end if;
  select count(*) into n from public.list_open_slots(now(), now()+interval '30 days') where id=s1 and taken and not mine; assert n=1;
  select count(*) into n from public.bookings; if n<>0 then bad:=bad||' [B ve reservas ajenas]'; end if;
  if not pg_temp.fails(format('insert into public.bookings (workspace_id,slot_id,client_id,booked_by) values (%L,%L,%L,%L)', ws, s2, cb, 'client')) then bad:=bad||' [B insertó una reserva directo en la tabla]'; end if;
  if not pg_temp.fails(format('select public.cancel_booking(%L)', bk)) then bad:=bad||' [B canceló la reserva de A]'; end if;
  perform pg_temp.as_user(a); select id into bk from public.bookings limit 1;
  perform public.cancel_booking(bk); raise notice 'OK cancelación del cliente (faltan más de 24 h)';
  bkb := null; perform pg_temp.as_user(b); bkb := public.book_slot(s3);  -- hueco en 5 h
  if not pg_temp.fails(format('select public.cancel_booking(%L)', bkb)) then bad:=bad||' [cliente canceló con menos de 24 h]'; end if;
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.book_slot(%L)', s3)) then bad:=bad||' [A reservó un hueco ocupado]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('update public.availability_slots set status=%L where id=%L', 'cancelled', s3)) then bad:=bad||' [Jeff canceló un hueco con reserva sin cancelar la reserva]'; end if;
  perform public.cancel_booking(bkb); raise notice 'OK el coach cancela cuando quiera';
  update public.availability_slots set status='cancelled' where id=s3;
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.book_slot(%L)', s3)) then bad:=bad||' [A reservó un hueco cancelado]'; end if;
  select count(*) into n from public.availability_slots where id=sfar; if n<>0 then bad:=bad||' [A lee huecos sin reserva directo de la tabla]'; end if;
  perform pg_temp.as_user(c);  -- cliente pendiente
  select count(*) into n from public.list_open_slots(now(), now()+interval '30 days'); if n<>0 then bad:=bad||' [cliente pendiente ve huecos]'; end if;
  if not pg_temp.fails(format('select public.book_slot(%L)', sfar)) then bad:=bad||' [cliente pendiente reservó]'; end if;
  perform pg_temp.as_user(o); select count(*) into n from public.bookings; if n<>0 then bad:=bad||' [otro coach ve reservas de Jeff]'; end if;
  if not pg_temp.fails(format('select public.coach_book_slot(%L,%L)', sfar, ca)) then bad:=bad||' [otro coach agendó en el espacio de Jeff]'; end if;
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.coach_book_slot(%L,%L)', sfar, ca)) then bad:=bad||' [un cliente usó la función del coach]'; end if;
  raise notice 'RESULTADO ATAQUES AGENDA: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
