-- Pruebas de ataque de checks de nutrición, actividad del coach y datos del plan. Ejecutar DESPUÉS de rls_groups.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; n int; bad text:=''; r jsonb; mid uuid; other_day uuid; wd int := extract(isodow from current_date)::int; tp uuid; ws uuid;
begin
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into ws from public.workspaces where slug='yeffitnes';
  perform pg_temp.reset();
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values ('https://push.test/jeff', jeff, ws, 'k', 'a');
  -- A tiene un plan de nutrición activo con comidas (de rls_nutrition). Dejamos una comida de HOY y otra de otro día.
  select m.id into mid from public.nutrition_meals m join public.nutrition_plans p on p.id=m.plan_id where p.client_id=ca and p.active and (m.weekday is null or m.weekday=wd) limit 1;
  assert mid is not null, 'A debe tener una comida aplicable hoy';
  select m.id into other_day from public.nutrition_meals m join public.nutrition_plans p on p.id=m.plan_id where p.client_id=ca and p.active and m.weekday is not null and m.weekday<>wd limit 1;

  perform pg_temp.as_user(a);
  -- Marcar TODAS las comidas de hoy completa el día de nutrición
  for mid in select m.id from public.nutrition_meals m join public.nutrition_plans p on p.id=m.plan_id where p.client_id=ca and p.active and (m.weekday is null or m.weekday=wd) loop
    r := public.log_meal(mid, current_date, true);
  end loop;
  if (r->>'complete')<>'true' then bad:=bad||' [no marcó el día completo]'; end if;
  if other_day is not null and not pg_temp.fails(format('select public.log_meal(%L, current_date, true)', other_day)) then bad:=bad||' [marcó una comida de otro día]'; end if;
  if not pg_temp.fails(format('select public.log_meal(%L, current_date + 5, true)', mid)) then bad:=bad||' [aceptó una fecha lejana]'; end if;
  if not pg_temp.fails(format('insert into public.meal_logs (client_id, workspace_id, log_date, meal_id) values (%L,%L,current_date,%L)', ca, ws, mid)) then bad:=bad||' [insertó meal_logs directo]'; end if;
  if not pg_temp.fails('insert into public.activity_events (workspace_id, client_id, kind, event_date) select workspace_id, id, ''day_done'', current_date from public.clients limit 1') then bad:=bad||' [cliente creó un evento]'; end if;
  select count(*) into n from public.activity_events; if n<>0 then bad:=bad||' [cliente lee eventos]'; end if;
  if not pg_temp.fails('select * from public.activity_feed(10)') then bad:=bad||' [cliente leyó el feed]'; end if;
  if not pg_temp.fails('select public.mark_activity_seen()') then bad:=bad||' [cliente marcó visto]'; end if;
  select count(*) into n from public.meal_logs; if n=0 then bad:=bad||' [A no ve sus propias marcas]'; end if;

  -- B (sin nutrición en su plan) y comidas ajenas
  perform pg_temp.as_user(b);
  if not pg_temp.fails(format('select public.log_meal(%L, current_date, true)', mid)) then bad:=bad||' [B marcó una comida de A]'; end if;
  select count(*) into n from public.meal_logs; if n<>0 then bad:=bad||' [B ve marcas de A]'; end if;

  -- Entrenamiento terminado → evento + día completo (disparador)
  perform pg_temp.as_user(a);
  perform public.finish_workout(current_date, 7, 'ok');
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.activity_feed(20) where client_id=ca and kind='training_done' and event_date=current_date; if n<>1 then bad:=bad||' [sin evento de entrenamiento]'; end if;
  select count(*) into n from public.activity_feed(20) where client_id=ca and kind='nutrition_done' and event_date=current_date; if n<>1 then bad:=bad||' [sin evento de nutrición]'; end if;
  select count(*) into n from public.activity_feed(20) where client_id=ca and kind='day_done' and event_date=current_date; if n<>1 then bad:=bad||' [sin evento de día completo]'; end if;
  if public.unseen_activity() < 3 then bad:=bad||' [contador sin ver mal]'; end if;

  -- Push: solo el propio cliente obtiene los dispositivos del coach, una vez
  perform pg_temp.as_user(a);
  select count(*) into n from public.push_event_targets(current_date); if n=0 then bad:=bad||' [A no obtuvo el destino del coach]'; end if;
  select count(*) into n from public.push_event_targets(current_date); if n<>0 then bad:=bad||' [el aviso se repitió]'; end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.push_event_targets(current_date); if n<>0 then bad:=bad||' [B obtuvo dispositivos]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.push_event_targets(current_date); if n<>0 then bad:=bad||' [el coach pidió push de eventos]'; end if;

  -- Otro coach no ve nada de este espacio
  perform pg_temp.as_user(o);
  select count(*) into n from public.activity_feed(50); if n<>0 then bad:=bad||' [otro coach ve actividad]'; end if;
  if public.unseen_activity()<>0 then bad:=bad||' [otro coach cuenta eventos ajenos]'; end if;
  select count(*) into n from public.meal_logs; if n<>0 then bad:=bad||' [otro coach lee marcas]'; end if;
  perform public.mark_activity_seen();
  perform pg_temp.as_user(jeff);
  if public.unseen_activity()=0 then bad:=bad||' [otro coach marcó vistos eventos ajenos]'; end if;
  perform public.mark_activity_seen();
  if public.unseen_activity()<>0 then bad:=bad||' [no marcó visto]'; end if;

  -- Desmarcar una comida quita el evento de nutrición aún no avisado
  perform pg_temp.as_user(a);
  select m.id into mid from public.nutrition_meals m join public.nutrition_plans p on p.id=m.plan_id where p.client_id=ca and p.active and (m.weekday is null or m.weekday=wd) limit 1;
  perform public.log_meal(mid, current_date, false);
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.activity_feed(20) where client_id=ca and kind='nutrition_done' and event_date=current_date; if n<>1 then bad:=bad||' [un evento ya avisado no debe borrarse]'; end if;

  -- Datos del plan (nivel / revisión / nota)
  select id into tp from public.training_plans where client_id=ca and status='active' limit 1;
  if tp is not null then
    perform public.set_plan_info(tp, 'intermediate', 'Domina las sentadillas', current_date + 21, 'Sube carga poco a poco');
    perform pg_temp.as_user(a);
    select count(*) into n from public.training_plans where id=tp and level='intermediate' and coach_note is not null; if n<>1 then bad:=bad||' [A no ve el nivel de su plan]'; end if;
    if not pg_temp.fails(format('select public.set_plan_info(%L, ''advanced'', null, null, null)', tp)) then bad:=bad||' [cliente cambió su nivel]'; end if;
    perform pg_temp.as_user(o);
    if not pg_temp.fails(format('select public.set_plan_info(%L, ''advanced'', null, null, null)', tp)) then bad:=bad||' [otro coach cambió un plan ajeno]'; end if;
    perform pg_temp.as_user(jeff);
    if not pg_temp.fails(format('select public.set_plan_info(%L, ''experto'', null, null, null)', tp)) then bad:=bad||' [aceptó un nivel inválido]'; end if;
  end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES ACTIVIDAD: %', coalesce(nullif(bad,''),'ninguno');
end $$;
