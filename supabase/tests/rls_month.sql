-- Pruebas de ataque de 0038: punto de partida, respuesta de Jeff vista, plan mensual y aviso de cita cancelada. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; pl uuid; lg uuid; sl uuid; bk uuid; n int; d date; bad text:='';
  today date := (now() at time zone 'America/Bogota')::date;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into pl from public.plans where workspace_id=ws and 'progress' = any(features) limit 1;
  if pl is null then select id into pl from public.plans where workspace_id=ws limit 1; end if;

  -- 1) Punto de partida: solo el propio cliente, valores razonables
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.save_start_point(70, 50)') then bad:=bad||' [estatura absurda aceptada]'; end if;
  if pg_temp.try('select public.save_start_point(5, 170)') then bad:=bad||' [peso absurdo aceptado]'; end if;
  if not pg_temp.try('select public.save_start_point(72.4, 171)') then bad:=bad||' [no guardó el punto de partida]'; end if;
  perform pg_temp.as_user(jeff);
  if pg_temp.try('select public.save_start_point(80, 180)') then bad:=bad||' [el coach usó save_start_point]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.clients where id=ca and height_cm=171 and start_weight_kg=72.4 and start_point_at is not null; if n<>1 then bad:=bad||' [no quedó en la ficha]'; end if;
  select count(*) into n from public.clients where id=cb and height_cm is not null; if n<>0 then bad:=bad||' [tocó a otro cliente]'; end if;

  -- 2) Respuesta de Jeff: solo el dueño la marca vista
  delete from public.workout_logs where client_id = ca and log_date = today - 1;
  insert into public.workout_logs (workspace_id, client_id, log_date, completed_at) values (ws, ca, today - 1, now()) returning id into lg;
  perform pg_temp.as_user(b);
  if pg_temp.try(format('select public.mark_feedback_seen(%L)', lg)) then bad:=bad||' [B marcó visto un entrenamiento de A]'; end if;
  perform pg_temp.as_user(jeff);
  if pg_temp.try(format('select public.mark_feedback_seen(%L)', lg)) then bad:=bad||' [el coach marcó visto como cliente]'; end if;
  perform pg_temp.as_user(a);
  if not pg_temp.try(format('select public.mark_feedback_seen(%L)', lg)) then bad:=bad||' [A no pudo marcar visto]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.workout_logs where id=lg and feedback_seen_at is not null; if n<>1 then bad:=bad||' [no quedó visto]'; end if;

  -- 2b) Aviso al cliente cuando Jeff responde: solo el coach, una vez por respuesta
  perform pg_temp.as_user(jeff);
  perform public.review_workout(lg, 'Buen trabajo', null);
  perform pg_temp.as_user(o);
  select count(*) into n from public.feedback_targets(lg); if n<>0 then bad:=bad||' [otro coach obtuvo dispositivos de la respuesta]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.feedback_targets(lg); if n<>0 then bad:=bad||' [el cliente obtuvo dispositivos]'; end if;
  perform pg_temp.reset();
  insert into public.push_subscriptions values ('https://push.example/a-fb', a, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.feedback_targets(lg) where endpoint='https://push.example/a-fb'; if n<>1 then bad:=bad||' [no avisó la respuesta]'; end if;
  select count(*) into n from public.feedback_targets(lg); if n<>0 then bad:=bad||' [avisó dos veces la misma respuesta]'; end if;
  perform pg_temp.reset();

  -- 3) Plan mensual: plan_since se pone solo, renovar solo el coach del espacio, aviso una vez
  update public.clients set plan_id = null where id = ca;
  update public.clients set plan_id = pl, status = 'active' where id = ca;
  select plan_since into d from public.clients where id = ca; if d is distinct from today then bad:=bad||' [plan_since no se puso al asignar plan]'; end if;
  update public.clients set plan_since = today - 31 where id = ca;
  insert into public.push_subscriptions values ('https://push.example/jeff-month', jeff, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  select count(*) into n from public.due_plan_expiry_cron((select value from public.app_secrets where name='cron')) where endpoint='https://push.example/jeff-month'; if n<>1 then bad:=bad||' [no avisó al coach del plan vencido]'; end if;
  select count(*) into n from public.due_plan_expiry_cron((select value from public.app_secrets where name='cron')); if n<>0 then bad:=bad||' [avisó dos veces el mismo vencimiento]'; end if;
  if pg_temp.try('select * from public.due_plan_expiry_cron(''clave-falsa'')') then bad:=bad||' [cron de planes sin clave]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try(format('select public.renew_plan(%L)', ca)) then bad:=bad||' [otro coach renovó un plan ajeno]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.renew_plan(%L)', ca)) then bad:=bad||' [el cliente renovó su plan]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.try(format('select public.renew_plan(%L)', ca)) then bad:=bad||' [Jeff no pudo renovar]'; end if;
  perform pg_temp.reset();
  select plan_since into d from public.clients where id = ca; if d is distinct from today then bad:=bad||' [renovar no reinició el mes]'; end if;

  -- 4) Cita cancelada por Jeff: aviso al cliente una sola vez; nadie más obtiene dispositivos
  insert into public.push_subscriptions values ('https://push.example/a-month', a, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  insert into public.availability_slots (workspace_id, starts_at) values (ws, now() + interval '3 days 7 minutes') returning id into sl;
  insert into public.bookings (workspace_id, slot_id, client_id, booked_by) values (ws, sl, ca, 'coach') returning id into bk;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.booking_cancel_targets(bk); if n<>0 then bad:=bad||' [avisó una cita que no estaba cancelada]'; end if;
  perform public.cancel_booking(bk);
  perform pg_temp.as_user(o);
  select count(*) into n from public.booking_cancel_targets(bk); if n<>0 then bad:=bad||' [otro coach obtuvo dispositivos]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.booking_cancel_targets(bk); if n<>0 then bad:=bad||' [el cliente obtuvo dispositivos]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.booking_cancel_targets(bk) where endpoint='https://push.example/a-month'; if n<>1 then bad:=bad||' [no avisó al cliente de la cancelación]'; end if;
  select count(*) into n from public.booking_cancel_targets(bk); if n<>0 then bad:=bad||' [avisó dos veces la cancelación]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES MES: %', coalesce(nullif(bad,''),'ninguno');
end $$;
