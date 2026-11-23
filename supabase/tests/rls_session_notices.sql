-- Pruebas de 0063: recordatorios de sesiones (cliente y Yeff) y aviso al cliente cuando Yeff lo agenda. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; sec text; sid uuid; sid2 uuid; bid uuid; bid2 uuid; n int; t text; bad text:=''; today date := (now() at time zone 'America/Bogota')::date;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a; select value into sec from public.app_secrets where name='cron';
  update public.clients set status = 'active' where id = ca;
  update public.bookings set status = 'cancelled', cancelled_at = now() - interval '1 day', cancelled_by = 'client' where status = 'confirmed';
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values ('https://test.push/jeff-ses', jeff, ws, 'k', 'x'), ('https://test.push/cli-ses', a, ws, 'k', 'x')
    on conflict (endpoint) do update set profile_id = excluded.profile_id;
  delete from public.reminder_log where kind like 'sess-%';
  -- Una sesión de A mañana a las 7:00 a. m.
  insert into public.availability_slots (workspace_id, starts_at, kind) values (ws, ((today + 1) + time '07:00') at time zone 'America/Bogota', 'initial')
    on conflict (workspace_id, starts_at) do update set status = 'open', kind = 'initial' returning id into sid;
  insert into public.bookings (workspace_id, slot_id, client_id, booked_by) values (ws, sid, ca, 'client') returning id into bid;

  begin perform * from public.due_session_notices_cron('falsa', 'midday'); bad:=bad||' [sin clave]'; exception when others then null; end;
  -- Mediodía: a A "Mañana tienes sesión" y a Yeff "Mañana: 1 sesión"; no se repite
  select count(*), max(d.title || ' / ' || d.body) into n, t from public.due_session_notices_cron(sec, 'midday') d where d.endpoint = 'https://test.push/cli-ses';
  if n <> 1 or t not like 'Mañana tienes sesión con Yeff / A las 7:00 a. m.%' then bad:=bad||' [cliente mediodía: '||coalesce(t,'-')||']'; end if;
  delete from public.reminder_log where kind = 'sess-midday';   -- el de Yeff ya salió en la llamada anterior
  select count(*), max(d.title) into n, t from public.due_session_notices_cron(sec, 'midday') d where d.endpoint = 'https://test.push/jeff-ses';
  if n <> 0 then bad:=bad||' [Yeff recibió dos veces el de mediodía]'; end if;
  delete from public.reminder_log where kind like 'sess-%';
  select count(*), max(d.title || ' / ' || d.body) into n, t from public.due_session_notices_cron(sec, 'midday') d where d.endpoint = 'https://test.push/jeff-ses';
  if n <> 1 or t not like 'Mañana: 1 sesión agendada /%7:00 a. m.%' then bad:=bad||' [Yeff mediodía: '||coalesce(t,'-')||']'; end if;
  select count(*) into n from public.due_session_notices_cron(sec, 'midday'); if n <> 0 then bad:=bad||' [repitió el de mediodía]'; end if;
  -- Noche: otra vez (segundo aviso del día anterior)
  select count(*) into n from public.due_session_notices_cron(sec, 'night') d where d.endpoint in ('https://test.push/cli-ses', 'https://test.push/jeff-ses'); if n <> 2 then bad:=bad||' [noche: '||n||']'; end if;
  -- Mañana del mismo día: la sesión de mañana no cuenta como "hoy"
  select count(*) into n from public.due_session_notices_cron(sec, 'morning'); if n <> 0 then bad:=bad||' [avisó como de hoy una de mañana]'; end if;
  -- Cancelada: no avisa
  delete from public.reminder_log where kind like 'sess-%';
  update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client' where id = bid;
  select count(*) into n from public.due_session_notices_cron(sec, 'night'); if n <> 0 then bad:=bad||' [avisó una cancelada]'; end if;
  -- Nadie de la app puede llamarla sin la clave
  perform pg_temp.as_user(a);
  begin perform * from public.due_session_notices_cron('x', 'night'); bad:=bad||' [cliente sin clave]'; exception when others then null; end;
  perform pg_temp.reset();

  -- Yeff agenda a A → aviso a A una sola vez; nadie más puede pedirlo
  insert into public.availability_slots (workspace_id, starts_at, kind) values (ws, ((today + 3) + time '10:00') at time zone 'America/Bogota', 'followup')
    on conflict (workspace_id, starts_at) do update set status = 'open' returning id into sid2;
  perform pg_temp.as_user(a);
  select count(*) into n from public.booking_client_targets(bid); if n <> 0 then bad:=bad||' [el cliente pidió el aviso]'; end if;
  perform pg_temp.as_user(jeff);
  bid2 := public.coach_book_slot(sid2, ca);
  perform pg_temp.as_user(o);
  select count(*) into n from public.booking_client_targets(bid2); if n <> 0 then bad:=bad||' [otro coach pidió el aviso]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.booking_client_targets(bid2) where endpoint = 'https://test.push/cli-ses'; if n <> 1 then bad:=bad||' [no avisó al cliente]'; end if;
  select count(*) into n from public.booking_client_targets(bid2); if n <> 0 then bad:=bad||' [avisó dos veces al cliente]'; end if;
  -- Una reserva que hizo el propio cliente no dispara "Yeff te agendó"
  perform pg_temp.reset(); update public.bookings set client_book_notified_at = null, booked_by = 'client' where id = bid2;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.booking_client_targets(bid2); if n <> 0 then bad:=bad||' [avisó una reserva del cliente]'; end if;
  -- "Recordarle": solo el coach del espacio, una vez al día por sesión
  perform pg_temp.reset(); update public.bookings set booked_by = 'coach' where id = bid2;
  perform pg_temp.as_user(a);
  select count(*) into n from public.session_remind_targets(bid2); if n <> 0 then bad:=bad||' [el cliente pidió Recordarle]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.session_remind_targets(bid2); if n <> 0 then bad:=bad||' [otro coach pidió Recordarle]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.session_remind_targets(bid2) where endpoint = 'https://test.push/cli-ses'; if n <> 1 then bad:=bad||' [Recordarle no avisó]'; end if;
  select count(*) into n from public.session_remind_targets(bid2); if n <> 0 then bad:=bad||' [Recordarle dos veces el mismo día]'; end if;
  select count(*) into n from public.session_remind_targets(bid); if n <> 0 then bad:=bad||' [Recordarle de una cancelada]'; end if;
  perform pg_temp.reset();
  update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'coach' where id = bid2;
  raise notice 'RESULTADO ATAQUES RECORDATORIOS DE SESIONES: %', coalesce(nullif(bad,''),'ninguno');
end $$;
