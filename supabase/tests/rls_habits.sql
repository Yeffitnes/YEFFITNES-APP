-- Pruebas de ataque de 0052: hábitos configurables. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; water uuid; lec uuid; chk uuid; n int; v numeric; bad text:=''; today date := (now() at time zone 'America/Bogota')::date; ows uuid;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into ows from public.workspaces where id <> ws limit 1;
  select count(*) into n from public.habit_defs where workspace_id = ws and key is not null; if n <> 3 then bad:=bad||' [faltan los 3 de fábrica]'; end if;
  if ows is not null then select count(*) into n from public.habit_defs where workspace_id = ows; if n <> 3 then bad:=bad||' [el otro coach no tiene los de fábrica]'; end if; end if;
  select id into water from public.habit_defs where workspace_id = ws and key = 'water';
  -- cliente: no crea, no cambia metas
  perform pg_temp.as_user(a);
  if not pg_temp.fails($q$select public.save_habit_def(null, 'Hackeo', 'x', 'number', 5, true)$q$) then bad:=bad||' [el cliente creó un hábito]'; end if;
  if not pg_temp.fails(format('select public.save_habit_def(%L, null, null, null, 1, true)', water)) then bad:=bad||' [el cliente cambió la meta]'; end if;
  if not pg_temp.fails(format('select public.set_client_habit_goal(%L, %L, 1, false)', ca, water)) then bad:=bad||' [el cliente se bajó su meta]'; end if;
  if not pg_temp.fails(format('update public.habit_defs set goal = 1 where id = %L', water)) then
    if (select goal from public.habit_defs where id = water) = 1 then bad:=bad||' [el cliente editó habit_defs directo]'; end if; end if;
  select count(*) into n from public.habit_defs; if n < 3 then bad:=bad||' [el cliente no ve los hábitos]'; end if;
  -- Jeff
  perform pg_temp.as_user(jeff);
  lec := public.save_habit_def(null, 'Lectura', 'min', 'number', 20, true);
  chk := public.save_habit_def(null, 'Estiramiento', null, 'check', 5, true);
  if not pg_temp.fails($q$select public.save_habit_def(null, 'Y', null, 'check', 9, true)$q$) then bad:=bad||' [sí/no con 9 días a la semana]'; end if;
  if not pg_temp.fails(format('select public.set_client_habit_goal(%L, %L, 8, false)', ca, chk)) then bad:=bad||' [meta de cliente de 8 días a la semana]'; end if;
  perform public.save_habit_def(water, 'Otro nombre', 'litros', 'check', 8, true);
  if (select name || '|' || unit || '|' || kind || '|' || goal from public.habit_defs where id = water) <> 'Agua|vasos|number|8.0' then bad:=bad||' [cambió nombre o tipo de uno de fábrica]'; end if;
  if not pg_temp.fails(format('select public.save_habit_def(%L, null, null, null, null, true)', water)) then bad:=bad||' [dejó un hábito de fábrica sin meta]'; end if;
  if not pg_temp.fails($q$select public.save_habit_def(null, '', null, 'number', 5, true)$q$) then bad:=bad||' [creó hábito sin nombre]'; end if;
  if not pg_temp.fails($q$select public.save_habit_def(null, 'X', null, 'raro', 5, true)$q$) then bad:=bad||' [creó hábito de tipo raro]'; end if;
  perform public.set_client_habit_goal(ca, water, 10, false);
  if (select goal from public.client_habit_goals where client_id = ca and habit_id = water) <> 10 then bad:=bad||' [no guardó la meta del cliente]'; end if;
  perform public.set_client_habit_goal(ca, water, null, false);
  select count(*) into n from public.client_habit_goals where client_id = ca and habit_id = water; if n <> 0 then bad:=bad||' [volver a la general no limpió]'; end if;
  perform public.set_client_habit_goal(ca, lec, null, true);
  -- otro coach
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('select public.save_habit_def(%L, null, null, null, 1, true)', water)) then bad:=bad||' [otro coach cambió la meta]'; end if;
  if not pg_temp.fails(format('select public.set_client_habit_goal(%L, %L, 1, false)', ca, water)) then bad:=bad||' [otro coach cambió la meta de un cliente ajeno]'; end if;
  select count(*) into n from public.habit_defs where workspace_id = ws; if n > 0 then bad:=bad||' [otro coach ve los hábitos de Jeff]'; end if;
  select count(*) into n from public.client_habit_goals where workspace_id = ws; if n > 0 then bad:=bad||' [otro coach ve metas de clientes de Jeff]'; end if;
  -- cliente anota
  perform pg_temp.as_user(a);
  perform public.log_habit_extra(today, lec, 25); perform public.log_habit_extra(today, chk, 1);
  select (extra ->> lec::text)::numeric into v from public.habit_logs where client_id = ca and day = today; if v is distinct from 25 then bad:=bad||' [no guardó la lectura]'; end if;
  perform public.log_habit(today, 3, null, null);
  select (extra ->> lec::text)::numeric into v from public.habit_logs where client_id = ca and day = today; if v is distinct from 25 then bad:=bad||' [anotar agua borró la lectura]'; end if;
  perform public.log_habit_extra(today, chk, null);
  if (select extra ? chk::text from public.habit_logs where client_id = ca and day = today) then bad:=bad||' [no borró el valor]'; end if;
  if not pg_temp.fails(format('select public.log_habit_extra(%L, %L, 2)', today, chk)) then bad:=bad||' [sí/no aceptó 2]'; end if;
  if not pg_temp.fails(format('select public.log_habit_extra(%L, %L, -1)', today, lec)) then bad:=bad||' [aceptó negativo]'; end if;
  if not pg_temp.fails(format('select public.log_habit_extra(%L, %L, 5)', today, water)) then bad:=bad||' [anotó un hábito de fábrica por la vía nueva]'; end if;
  if not pg_temp.fails(format('select public.log_habit_extra(%L, %L, 5)', today - 5, lec)) then bad:=bad||' [anotó hace 5 días]'; end if;
  select count(*) into n from public.client_habit_goals where client_id <> ca; if n > 0 then bad:=bad||' [ve metas de otro cliente]'; end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.client_habit_goals; if n > 0 then bad:=bad||' [el cliente B ve metas de A]'; end if;
  -- hábito apagado: ya no se anota
  perform pg_temp.as_user(jeff); perform public.save_habit_def(lec, 'Lectura', 'min', null, 20, false);
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.log_habit_extra(%L, %L, 5)', today, lec)) then bad:=bad||' [anotó un hábito apagado]'; end if;
  perform pg_temp.reset();
  update public.habit_defs set goal = 6 where id = water; delete from public.client_habit_goals; delete from public.habit_defs where key is null;
  update public.habit_logs set extra = '{}'::jsonb;
  raise notice 'RESULTADO ATAQUES HABITOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
