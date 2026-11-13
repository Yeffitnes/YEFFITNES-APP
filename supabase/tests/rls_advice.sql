-- Pruebas de ataque de 0049: sugerencias de peso. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; itm uuid; itb uuid; lg uuid; w numeric; n int; bad text:=''; d date := current_date - 400; call text;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  select id into itm from public.plan_items where client_id=ca limit 1;
  if itm is null then raise exception 'rls_advice: el cliente A no tiene plan en los datos de prueba'; end if;
  insert into public.workout_logs (workspace_id, client_id, log_date, completed_at) values (ws, ca, d, now()) returning id into lg;
  update public.plan_items set target_weight = 40 where id = itm;
  call := format('select public.decide_weight_advice(%L, %L, 99)', lg, itm);
  perform pg_temp.as_user(a);
  if not pg_temp.fails(call) then bad:=bad||' [el cliente cambió el peso]'; end if;
  if not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itm, '99')) then bad:=bad||' [el cliente cambió las repeticiones]'; end if;
  if not pg_temp.fails(format('insert into public.weight_advice_decisions (workspace_id, log_id, plan_item_id) values (%L,%L,%L)', ws, lg, itm)) then bad:=bad||' [el cliente escribió una decisión]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails(call) then bad:=bad||' [otro coach cambió el peso]'; end if;
  if not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itm, '12')) then bad:=bad||' [otro coach cambió las repeticiones]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('select public.decide_weight_advice(%L, %L, 0)', lg, itm)) then bad:=bad||' [aceptó peso 0]'; end if;
  if not pg_temp.fails(format('select public.decide_weight_advice(%L, %L, 5000)', lg, itm)) then bad:=bad||' [aceptó peso absurdo]'; end if;
  perform pg_temp.reset(); select id into itb from public.plan_items where client_id <> ca limit 1; perform pg_temp.as_user(jeff);
  if itb is not null and not pg_temp.fails(format('select public.decide_weight_advice(%L, %L, 50)', lg, itb)) then bad:=bad||' [cambió el ejercicio de otro cliente]'; end if;
  -- repeticiones (0050): válidas cambian el plan; basura o cero, no
  if not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itm, 'abc')) then bad:=bad||' [aceptó repeticiones basura]'; end if;
  if not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itm, '0')) then bad:=bad||' [aceptó 0 repeticiones]'; end if;
  if not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itm, '12; drop table x')) then bad:=bad||' [aceptó texto raro]'; end if;
  if itb is not null and not pg_temp.fails(format('select public.decide_reps_advice(%L, %L, %L)', lg, itb, '12')) then bad:=bad||' [cambió repeticiones de otro cliente]'; end if;
  perform public.decide_reps_advice(lg, itm, '12 por lado');
  if (select reps from public.plan_items where id = itm) is distinct from '12 por lado' then bad:=bad||' [no cambió las repeticiones]'; end if;
  if (select reps from public.weight_advice_decisions where log_id = lg and plan_item_id = itm) is distinct from '12 por lado' then bad:=bad||' [no anotó la decisión de repeticiones]'; end if;
  update public.plan_items set reps = '10' where id = itm;
  perform public.decide_weight_advice(lg, itm, 37.5);
  if (select reps from public.weight_advice_decisions where log_id = lg and plan_item_id = itm) is not null then bad:=bad||' [quedó la decisión de repeticiones vieja]'; end if;
  select target_weight into w from public.plan_items where id = itm; if w is distinct from 37.5 then bad:=bad||' [aceptar no cambió el peso]'; end if;
  perform public.decide_weight_advice(lg, itm, null);
  select target_weight into w from public.plan_items where id = itm; if w is distinct from 37.5 then bad:=bad||' [descartar cambió el peso]'; end if;
  select count(*) into n from public.weight_advice_decisions where log_id = lg and weight is null; if n <> 1 then bad:=bad||' [Jeff no ve su decisión]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.weight_advice_decisions; if n > 0 then bad:=bad||' [el cliente lee decisiones]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.weight_advice_decisions; if n > 0 then bad:=bad||' [otro coach lee decisiones]'; end if;
  perform pg_temp.reset();
  delete from public.workout_logs where id = lg;
  raise notice 'RESULTADO ATAQUES SUGERENCIAS DE PESO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
