-- Pruebas de ataque de 0054: avisos de hábitos. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; sec text; n int; t text; bad text:=''; today date := (now() at time zone 'America/Bogota')::date; hadplan boolean;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a; select value into sec from public.app_secrets where name='cron';
  select exists (select 1 from public.training_plans where client_id = ca and status = 'active') into hadplan;
  if not hadplan then insert into public.training_plans (workspace_id, client_id, name, status, starts_on) values (ws, ca, 'Plan prueba', 'active', today); end if;
  update public.clients set status = 'active', plan_id = coalesce(plan_id, (select id from public.plans where workspace_id = ws limit 1)) where id = ca;
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values ('https://test.push/cli-hab', a, ws, 'k', 'x'), ('https://test.push/jeff-hab', jeff, ws, 'k', 'x') on conflict (endpoint) do update set profile_id = excluded.profile_id;
  delete from public.reminder_log where kind in ('habits','habits-coach');
  delete from public.habit_logs where client_id = ca and day in (today, today - 1);
  insert into public.habit_logs (client_id, workspace_id, day, water) values (ca, ws, today, 6);
  insert into public.habit_logs (client_id, workspace_id, day, water, steps, sleep) values (ca, ws, today - 1, 2, 9000, 7);
  -- cron: sin clave no
  begin perform * from public.due_habit_reminders_cron('falsa'); bad:=bad||' [noche sin clave]'; exception when others then null; end;
  begin perform * from public.due_habit_digest_cron('falsa'); bad:=bad||' [mañana sin clave]'; exception when others then null; end;
  select count(*), max(d.missing) into n, t from public.due_habit_reminders_cron(sec) d where d.endpoint = 'https://test.push/cli-hab';
  if n <> 1 or t not like '%pasos%' or t not like '%sueño%' or t like '%agua%' then bad:=bad||' [noche: '||coalesce(t,'-')||']'; end if;
  select count(*) into n from public.due_habit_reminders_cron(sec); if n <> 0 then bad:=bad||' [noche repitió]'; end if;
  select count(*), max(d.body) into n, t from public.due_habit_digest_cron(sec) d where d.endpoint = 'https://test.push/jeff-hab';
  if n <> 1 or t not like '%: agua%' then bad:=bad||' [mañana: '||coalesce(t,'-')||']'; end if;
  select count(*) into n from public.due_habit_digest_cron(sec) d where d.endpoint = 'https://test.push/cli-hab'; if n <> 0 then bad:=bad||' [el resumen le llegó a un cliente]'; end if;
  select count(*) into n from public.due_habit_digest_cron(sec); if n <> 0 then bad:=bad||' [mañana repitió]'; end if;
  -- la función interna no se puede llamar
  perform pg_temp.as_user(a);
  if not pg_temp.fails($q$select * from public._habit_status(current_date)$q$) then bad:=bad||' [el cliente leyó el estado de todos]'; end if;
  if not pg_temp.fails(format('select public.send_nudge(%L, %L)', ca, 'habits')) then bad:=bad||' [el cliente se mandó un aviso]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('select public.send_nudge(%L, %L)', ca, 'habits')) then bad:=bad||' [otro coach avisó a un cliente ajeno]'; end if;
  perform pg_temp.as_user(jeff);
  perform public.send_nudge(ca, 'habits');
  if not pg_temp.fails(format('select public.send_nudge(%L, %L)', ca, 'habits')) then bad:=bad||' [aviso de hábitos dos veces el mismo día]'; end if;
  if not pg_temp.fails(format('select public.send_nudge(%L, %L)', ca, 'raro')) then bad:=bad||' [aviso de tipo raro]'; end if;
  perform pg_temp.reset();
  delete from public.nudges where kind = 'habits'; delete from public.push_subscriptions where endpoint in ('https://test.push/cli-hab','https://test.push/jeff-hab');
  delete from public.reminder_log where kind in ('habits','habits-coach'); delete from public.habit_logs where client_id = ca and day in (today, today - 1);
  if not hadplan then delete from public.training_plans where client_id = ca and name = 'Plan prueba'; end if;
  raise notice 'RESULTADO ATAQUES AVISOS DE HABITOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
