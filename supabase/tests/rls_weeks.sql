-- Pruebas de ataque de 0056: programas y planes por semanas. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; tpl uuid; tpl2 uuid; prg uuid; pid uuid; n int; bad text:=''; today date := (now() at time zone 'America/Bogota')::date;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a;
  select id into tpl from public.routine_templates where workspace_id=ws and active order by created_at limit 1;
  select id into tpl2 from public.routine_templates where workspace_id=ws and active and id <> tpl order by created_at limit 1;
  if tpl2 is null then tpl2 := tpl; end if;
  -- la semana que corre
  if public.plan_week('2026-11-11', 3::smallint, '2026-11-09') <> 1 or public.plan_week('2026-11-11', 3::smallint, '2026-11-16') <> 2
     or public.plan_week('2026-11-11', 3::smallint, '2026-11-30') <> 1 or public.plan_week('2026-11-11', 1::smallint, '2027-01-01') <> 1 then bad:=bad||' [plan_week calcula mal]'; end if;

  -- 1) Programa de 3 semanas distintas: Jeff lo guarda y lo asigna; el plan queda con 3 semanas
  perform pg_temp.as_user(jeff);
  prg := public.save_program(null, 'Tres semanas', 3, null, jsonb_build_array(
    jsonb_build_object('week',1,'weekday',1,'template_id',tpl), jsonb_build_object('week',2,'weekday',1,'template_id',tpl2), jsonb_build_object('week',3,'weekday',3,'template_id',tpl)));
  if not pg_temp.fails(format('select public.save_program(null, %L, 2, null, %L::jsonb)', 'x', jsonb_build_array(jsonb_build_object('week',3,'weekday',1,'template_id',tpl))::text)) then bad:=bad||' [semana fuera de la duración aceptada]'; end if;
  pid := public.apply_program(ca, prg);
  select count(*) into n from public.plan_days where plan_id = pid; if n <> 3 then bad:=bad||' [el plan no copió las 3 semanas: '||n||']'; end if;
  if (select cycle_weeks from public.training_plans where id = pid) <> 3 then bad:=bad||' [cycle_weeks no quedó en 3]'; end if;
  -- copiar y quitar semanas
  perform public.copy_plan_week(pid, 1, 4);
  if (select count(*) from public.plan_days where plan_id = pid and week = 4) <> 1 or (select cycle_weeks from public.training_plans where id = pid) <> 4 then bad:=bad||' [copiar semana no funcionó]'; end if;
  perform public.set_plan_weeks(pid, 2);
  if (select count(*) from public.plan_days where plan_id = pid and week > 2) > 0 or (select cycle_weeks from public.training_plans where id = pid) <> 2 then bad:=bad||' [quitar semanas no funcionó]'; end if;
  perform public.assign_day(pid, 5, tpl, 2);
  if (select count(*) from public.plan_days where plan_id = pid and week = 2 and weekday = 5) <> 1 then bad:=bad||' [asignar día en la semana 2 no funcionó]'; end if;
  if not pg_temp.fails(format('select public.set_plan_weeks(%L, 17)', pid)) then bad:=bad||' [17 semanas aceptadas]'; end if;

  -- 2) El cliente no cambia semanas ni copia
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.set_plan_weeks(%L, 1)', pid)) then bad:=bad||' [el cliente cambió las semanas]'; end if;
  if not pg_temp.fails(format('select public.copy_plan_week(%L, 1, 2)', pid)) then bad:=bad||' [el cliente copió una semana]'; end if;
  if not pg_temp.fails(format('select public.assign_day(%L, 6, %L, 2)', pid, tpl)) then bad:=bad||' [el cliente se asignó un día]'; end if;
  -- 3) Otro coach tampoco
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('select public.set_plan_weeks(%L, 1)', pid)) then bad:=bad||' [otro coach cambió las semanas]'; end if;
  if not pg_temp.fails(format('select public.copy_plan_week(%L, 1, 2)', pid)) then bad:=bad||' [otro coach copió una semana]'; end if;
  perform pg_temp.reset();
  if (select cycle_weeks from public.training_plans where id = pid) <> 2 then bad:=bad||' [alguien de afuera cambió el plan]'; end if;
  raise notice 'RESULTADO ATAQUES SEMANAS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
