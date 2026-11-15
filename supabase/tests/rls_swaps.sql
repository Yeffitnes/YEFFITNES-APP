-- Pruebas de ataque de 0044: ejercicios alternativos. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid; pid uuid; dy uuid; i1 uuid; i2 uuid; n int; j jsonb; nm text; bad text:='';
  d date := current_date + 1;   -- un día permitido (±1) sin registros previos
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into e1 from public.exercises where workspace_id=ws and active order by name offset 0 limit 1;
  select id into e2 from public.exercises where workspace_id=ws and active order by name offset 1 limit 1;
  select id into e3 from public.exercises where workspace_id=ws and active order by name offset 2 limit 1;
  select id into e4 from public.exercises where workspace_id=ws and active order by name offset 3 limit 1;
  select id into e5 from public.exercises where workspace_id=ws and active order by name offset 4 limit 1;
  if e5 is null then raise exception 'faltan ejercicios de prueba'; end if;

  -- Jeff arma un plan nuevo para A con 2 ejercicios y aprueba 2 sustitutos para el primero
  perform pg_temp.as_user(jeff);
  update public.training_plans set status = 'finished' where client_id = ca and status = 'active';
  insert into public.training_plans (workspace_id, client_id, name) values (ws, ca, 'Plan alternativos') returning id into pid;
  insert into public.plan_days (workspace_id, client_id, plan_id, weekday, name) values (ws, ca, pid, 1, 'Día prueba') returning id into dy;
  insert into public.plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps) values (ws, ca, dy, e1, 1, 3, '10') returning id into i1;
  insert into public.plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps) values (ws, ca, dy, e2, 2, 3, '10') returning id into i2;
  perform public.set_alternatives(e1, array[e3, e4]);
  select count(*) into n from public.exercise_alternatives where exercise_id = e1; if n <> 2 then bad:=bad||' [Jeff no guardó sus 2 sustitutos]'; end if;
  if pg_temp.try(format('select public.set_alternatives(%L, %L::uuid[])', e1, array[e3, e4, e5])) then bad:=bad||' [3 sustitutos aceptados]'; end if;
  if pg_temp.try(format('select public.set_alternatives(%L, %L::uuid[])', e1, array[e1])) then bad:=bad||' [sustituto de sí mismo aceptado]'; end if;
  if pg_temp.try(format('select public.set_alternatives(%L, %L::uuid[])', e1, array[e3, e3])) then bad:=bad||' [sustituto repetido aceptado]'; end if;
  if pg_temp.try(format('insert into public.exercise_alternatives (workspace_id, exercise_id, alt_exercise_id) values (%L, %L, %L)', ws, e2, e5)) then bad:=bad||' [escritura directa de sustitutos]'; end if;

  -- Otro coach: no ve ni cambia nada
  perform pg_temp.as_user(o);
  select count(*) into n from public.exercise_alternatives; if n > 0 then bad:=bad||' [otro coach ve sustitutos]'; end if;
  if pg_temp.try(format('select public.set_alternatives(%L, %L::uuid[])', e1, '{}')) then bad:=bad||' [otro coach borró sustitutos]'; end if;

  -- Cliente A: ve sus opciones, no toca el catálogo, cambia solo por un sustituto aprobado
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.set_alternatives(%L, %L::uuid[])', e1, '{}')) then bad:=bad||' [el cliente cambió sustitutos]'; end if;
  if pg_temp.try(format('insert into public.exercise_swaps (workspace_id, client_id, workout_log_id, plan_item_id, from_name, to_name) select %L, %L, id, %L, %L, %L from public.workout_logs where client_id = %L limit 1', ws, ca, i1, 'x', 'y', ca)) then bad:=bad||' [escritura directa de un cambio]'; end if;
  j := public.my_swap_options(d);
  if jsonb_array_length(j->'alts') <> 1 or jsonb_array_length(j->'alts'->0->'alts') <> 2 then bad:=bad||' [opciones del cliente incorrectas]'; end if;
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i1, e2)) then bad:=bad||' [cambio por un ejercicio no aprobado]'; end if;
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i2, e3)) then bad:=bad||' [cambio de un ejercicio sin sustitutos]'; end if;
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', current_date + 5, i1, e3)) then bad:=bad||' [cambio en otra fecha]'; end if;
  perform public.swap_exercise(d, i1, e3);
  perform public.log_set(d, i1, 1, 10, 20);
  select exercise_name into nm from public.set_logs where plan_item_id = i1 and set_number = 1;
  if nm is distinct from (select name from public.exercises where id = e3) then bad:=bad||' [la serie no quedó con el nombre del sustituto]'; end if;
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i1, e4)) then bad:=bad||' [cambio después de registrar series]'; end if;
  j := public.my_swap_options(d);
  if jsonb_array_length(j->'swaps') <> 1 then bad:=bad||' [el cliente no ve su cambio]'; end if;

  -- Cliente B: no ve ni cambia lo de A
  perform pg_temp.as_user(b);
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i1, e4)) then bad:=bad||' [un cliente cambió el ejercicio de otro]'; end if;
  select count(*) into n from public.exercise_swaps where client_id = ca; if n > 0 then bad:=bad||' [un cliente ve cambios de otro]'; end if;
  select count(*) into n from public.exercise_alternatives; if n > 0 then bad:=bad||' [un cliente lee la tabla de sustitutos]'; end if;
  j := public.my_swap_options(d);
  if exists (select 1 from jsonb_array_elements(j->'alts') x where x->>'item_id' = i1::text) then bad:=bad||' [un cliente ve opciones de otro]'; end if;

  -- Cliente pendiente: nada
  perform pg_temp.as_user(c);
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i1, e3)) then bad:=bad||' [cliente pendiente cambió]'; end if;

  -- Jeff ve el cambio y no puede cambiar como cliente; otro coach no lo ve
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.exercise_swaps where client_id = ca and to_exercise_id = e3; if n <> 1 then bad:=bad||' [Jeff no ve el cambio]'; end if;
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i1, e4)) then bad:=bad||' [Jeff cambió como cliente]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.exercise_swaps; if n > 0 then bad:=bad||' [otro coach ve cambios]'; end if;

  -- Volver al original: deshace la serie y vuelve; la serie nueva queda con el nombre original
  perform pg_temp.as_user(a);
  perform public.unlog_set(d, i1, 1);
  perform public.swap_exercise(d, i1, null);
  perform public.log_set(d, i1, 1, 10, 20);
  select exercise_name into nm from public.set_logs where plan_item_id = i1 and set_number = 1;
  if nm is distinct from (select name from public.exercises where id = e1) then bad:=bad||' [al volver, la serie no quedó con el nombre original]'; end if;

  -- Revisado por Jeff: ya no se puede cambiar
  perform public.finish_workout(d, 7, null);
  perform pg_temp.as_user(jeff);   -- el disparador protect_coach_columns solo deja al coach marcar la revisión
  update public.workout_logs set coach_seen_at = now() where client_id = ca and log_date = d;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.swap_exercise(%L, %L, %L)', d, i2, null)) then bad:=bad||' [cambio después de la revisión de Jeff]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES ALTERNATIVOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
