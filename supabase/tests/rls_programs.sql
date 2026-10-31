-- Pruebas de ataque de 0043: programas, respuestas guardadas, hábitos y récords. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; tpl uuid; prg uuid; pid uuid; n int; r record; bad text:=''; today date := (now() at time zone 'America/Bogota')::date;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into tpl from public.routine_templates where workspace_id=ws limit 1;
  if tpl is null then raise exception 'falta una rutina de prueba'; end if;

  -- 1) Programas: Jeff crea y asigna; clientes y el otro coach no ven ni tocan nada
  perform pg_temp.as_user(jeff);
  prg := public.save_program(null, 'Programa prueba', 6, 'nota', jsonb_build_array(jsonb_build_object('weekday',1,'template_id',tpl), jsonb_build_object('weekday',4,'template_id',tpl)));
  pid := public.apply_program(ca, prg);
  select count(*) into n from public.plan_days where plan_id = pid; if n <> 2 then bad:=bad||' [el programa no copió los 2 días]'; end if;
  select count(*) into n from public.training_plans where client_id = ca and status = 'active'; if n <> 1 then bad:=bad||' [quedaron '||n||' planes activos]'; end if;
  select count(*) into n from public.training_plans where id = pid and review_on = today + 42; if n <> 1 then bad:=bad||' [no puso la revisión al final del programa]'; end if;
  if pg_temp.try(format('select public.save_program(null, %L, 4, null, %L::jsonb)', 'x', '[]')) then bad:=bad||' [programa sin días aceptado]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.program_templates; if n > 0 then bad:=bad||' [el cliente ve programas]'; end if;
  if pg_temp.try(format('select public.apply_program(%L, %L)', ca, prg)) then bad:=bad||' [el cliente se asignó un programa]'; end if;
  if pg_temp.try(format('select public.save_program(null, %L, 4, null, %L::jsonb)', 'cliente', jsonb_build_array(jsonb_build_object('weekday',1,'template_id',tpl))::text)) then bad:=bad||' [el cliente creó un programa]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.program_templates; if n > 0 then bad:=bad||' [otro coach ve programas]'; end if;
  if pg_temp.try(format('select public.apply_program(%L, %L)', ca, prg)) then bad:=bad||' [otro coach aplicó el programa]'; end if;
  if pg_temp.try(format('insert into public.program_days (program_id, workspace_id, weekday, template_id) values (%L, %L, 2, %L)', prg, ws, tpl)) then bad:=bad||' [otro coach metió un día]'; end if;
  if pg_temp.try(format('select public.save_program(%L, %L, 4, null, %L::jsonb)', prg, 'robado', jsonb_build_array(jsonb_build_object('weekday',1,'template_id',tpl))::text)) then bad:=bad||' [otro coach editó el programa]'; end if;

  -- 2) Respuestas guardadas: solo Jeff
  perform pg_temp.as_user(jeff);
  insert into public.coach_snippets (workspace_id, body) values (ws, 'Muy bien, sigue así');
  perform pg_temp.as_user(a);
  select count(*) into n from public.coach_snippets; if n > 0 then bad:=bad||' [el cliente ve respuestas guardadas]'; end if;
  if pg_temp.try(format('insert into public.coach_snippets (workspace_id, body) values (%L, %L)', ws, 'x')) then bad:=bad||' [el cliente guardó una respuesta]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.coach_snippets; if n > 0 then bad:=bad||' [otro coach ve respuestas guardadas]'; end if;

  -- 3) Hábitos: el cliente solo los suyos, solo con log_habit, solo hoy y 2 días atrás; Jeff lee y no escribe
  perform pg_temp.as_user(a);
  perform public.log_habit(today, 3, null, null); perform public.log_habit(today, null, 8000, 7.5);
  select count(*) into n from public.habit_logs where client_id = ca and day = today and water = 3 and steps = 8000 and sleep = 7.5; if n <> 1 then bad:=bad||' [log_habit no combinó los valores]'; end if;
  if pg_temp.try(format('select public.log_habit(%L, 2)', today + 1)) then bad:=bad||' [hábito de mañana aceptado]'; end if;
  if pg_temp.try(format('select public.log_habit(%L, 2)', today - 3)) then bad:=bad||' [hábito de hace 3 días aceptado]'; end if;
  if pg_temp.try(format('select public.log_habit(%L, 99)', today)) then bad:=bad||' [99 vasos aceptados]'; end if;
  if pg_temp.try(format('insert into public.habit_logs (client_id, workspace_id, day, water) values (%L, %L, %L, 5)', cb, ws, today)) then bad:=bad||' [escribió hábitos de otro cliente]'; end if;
  if pg_temp.try(format('update public.habit_logs set water = 9 where client_id = %L', ca)) then
    select count(*) into n from public.habit_logs where client_id = ca and water = 9; if n > 0 then bad:=bad||' [cambió su hábito sin log_habit]'; end if;
  end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.habit_logs where client_id = ca; if n > 0 then bad:=bad||' [un cliente ve hábitos de otro]'; end if;
  perform pg_temp.as_user(c);
  if pg_temp.try(format('select public.log_habit(%L, 2)', today)) then bad:=bad||' [cliente pendiente registró hábitos]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.habit_logs where client_id = ca; if n <> 1 then bad:=bad||' [Jeff no ve los hábitos]'; end if;
  if pg_temp.try(format('select public.log_habit(%L, 2)', today)) then bad:=bad||' [Jeff registró hábitos como cliente]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.habit_logs; if n > 0 then bad:=bad||' [otro coach ve hábitos]'; end if;

  -- 4) Récords: cada quien solo lo suyo
  perform pg_temp.as_user(b);
  select count(*) into n from public.exercise_records(ca); if n > 0 then bad:=bad||' [un cliente ve récords de otro]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.exercise_records(ca); if n > 0 then bad:=bad||' [otro coach ve récords]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.exercise_records(ca);
  perform pg_temp.as_user(jeff);
  if (select count(*) from public.exercise_records(ca)) <> n then bad:=bad||' [Jeff y el cliente ven récords distintos]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES PROGRAMAS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
