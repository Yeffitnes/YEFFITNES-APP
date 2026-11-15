-- Pruebas de ataque de 0042: corregir UNA vez (entrenamiento, reporte y nutrición) y nunca después de que Jeff revisó. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0';
  ws uuid; ca uuid; ia uuid; lg uuid; np uuid; ml uuid; n int; bad text:=''; d0 date := current_date; d1 date := current_date - 1;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a;
  update public.clients set status='active', plan_id=(select id from public.plans where workspace_id=ws and 'nutrition' = any(features) and 'training' = any(features) and 'daily_report' = any(features) limit 1) where id=ca;
  select id into ia from public.plan_items where client_id=ca limit 1;
  delete from public.workout_logs where client_id=ca and log_date in (d0, d1);
  delete from public.daily_reports where client_id=ca and report_date in (d0, d1);

  -- 1) Entrenamiento: terminar, corregir una vez, la segunda no
  perform pg_temp.as_user(a);
  perform public.log_set(d0, ia, 1, 8, 50); perform public.finish_workout(d0, 7, 'bien');
  if not pg_temp.try(format('select public.log_set(%L, %L, 2, 9, 50)', d0, ia)) then bad:=bad||' [no dejó usar la corrección]'; end if;
  if not pg_temp.try(format('select public.finish_workout(%L, 8, %L)', d0, 'corregido')) then bad:=bad||' [no dejó terminar la corrección]'; end if;
  if pg_temp.try(format('select public.log_set(%L, %L, 3, 9, 50)', d0, ia)) then bad:=bad||' [serie tras la corrección aceptada]'; end if;
  if pg_temp.try(format('select public.unlog_set(%L, %L, 1)', d0, ia)) then bad:=bad||' [borró una serie tras la corrección]'; end if;
  if pg_temp.try(format('select public.finish_workout(%L, 9, %L)', d0, 'otra vez')) then bad:=bad||' [segunda corrección aceptada]'; end if;
  update public.workout_logs set edits = 0, edited_at = null where client_id = ca and log_date = d0;
  perform pg_temp.reset();
  select count(*) into n from public.workout_logs where client_id=ca and log_date=d0 and edits=1 and note='corregido'; if n<>1 then bad:=bad||' [el cliente reinició su contador o no quedó la corrección]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('insert into public.set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps) select %L, %L, id, %L, %L, 4, %L, 5 from public.workout_logs where client_id = %L and log_date = %L', ws, ca, ia, 'x', 'work', ca, d0)) then bad:=bad||' [serie directa en la tabla tras la corrección]'; end if;

  -- 2) Ya revisado por Jeff: nada se toca, ni con la corrección sin usar
  perform public.log_set(d1, ia, 1, 8, 50); perform public.finish_workout(d1, 7, 'ayer');
  perform pg_temp.reset(); select id into lg from public.workout_logs where client_id=ca and log_date=d1;
  perform pg_temp.as_user(jeff); perform public.review_workout(lg, 'Bien hecho', null);
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.log_set(%L, %L, 2, 9, 50)', d1, ia)) then bad:=bad||' [editó un entrenamiento ya revisado]'; end if;
  if pg_temp.try(format('select public.finish_workout(%L, 8, %L)', d1, 'x')) then bad:=bad||' [volvió a terminar uno ya revisado]'; end if;

  -- 3) Reporte: enviar, corregir una vez, la segunda no
  if not pg_temp.try(format('select public.submit_report(%L, %L)', d0, 'primero')) then bad:=bad||' [no envió el reporte]'; end if;
  if not pg_temp.try(format('select public.submit_report(%L, %L)', d0, 'corregido')) then bad:=bad||' [no dejó corregir el reporte]'; end if;
  if pg_temp.try(format('select public.submit_report(%L, %L)', d0, 'tercero')) then bad:=bad||' [segunda corrección del reporte aceptada]'; end if;
  perform pg_temp.reset(); select count(*) into n from public.daily_reports where client_id=ca and report_date=d0 and comment='corregido' and edits=1; if n<>1 then bad:=bad||' [el reporte no quedó con la corrección]'; end if;

  -- 4) Nutrición: con todo marcado, desmarcar una vez sí; después de volver a completar, no
  perform pg_temp.as_user(jeff);
  np := public.save_nutrition(null, ca, 'Plan prueba 0042', 2000, 100, 200, 60, null, jsonb_build_array(jsonb_build_object('name','Desayuno','content','Avena','weekday',null)));
  perform pg_temp.reset(); select m.id into ml from public.nutrition_meals m join public.nutrition_plans p on p.id = m.plan_id where p.client_id = ca and p.active limit 1;
  delete from public.meal_logs where client_id = ca and log_date = d0; delete from public.meal_day_locks where client_id = ca;
  perform pg_temp.as_user(a);
  perform public.log_meal(ml, d0, true);
  if not pg_temp.try(format('select public.log_meal(%L, %L, false)', ml, d0)) then bad:=bad||' [no dejó corregir la nutrición]'; end if;
  perform public.log_meal(ml, d0, true);
  if pg_temp.try(format('select public.log_meal(%L, %L, false)', ml, d0)) then bad:=bad||' [segunda corrección de la nutrición aceptada]'; end if;
  if pg_temp.try(format('insert into public.meal_day_locks (client_id, workspace_id, log_date, reopens) values (%L, %L, %L, 0)', ca, ws, d1)) then bad:=bad||' [el cliente escribió en meal_day_locks]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES CORREGIR: %', coalesce(nullif(bad,''),'ninguno');
end $$;
