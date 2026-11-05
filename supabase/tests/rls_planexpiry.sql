-- Pruebas de ataque de 0048: avisos de plan por vencer. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; pl uuid; sec text; n int; st text; nm text; bad text:=''; today date := (now() at time zone 'America/Bogota')::date; denied boolean;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id, plan_id into ca, pl from public.clients where profile_id=a;
  select value into sec from public.app_secrets where name='cron';
  if pl is null then select id into pl from public.plans where workspace_id=ws limit 1; end if;
  -- aislar: solo este cliente puede generar avisos en la prueba
  update public.clients set plan_since = today where id <> ca and plan_since is not null;
  update public.clients set plan_id = pl, status = 'active', plan_since = today - 22, plan_expiry_notified_on = null where id = ca;   -- faltan 8 días
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values ('https://test.push/jeff-exp', jeff, ws, 'k', 'x'), ('https://test.push/cli-exp', a, ws, 'k', 'x') on conflict (endpoint) do update set profile_id = excluded.profile_id;
  select count(*) into n from public.due_plan_notices_cron(sec); if n <> 0 then bad:=bad||' [avisó con 8 días]'; end if;
  update public.clients set plan_since = today - 23 where id = ca;   -- faltan 7
  select count(*), max(d.stage), max(d.names) into n, st, nm from public.due_plan_notices_cron(sec) d where d.endpoint='https://test.push/jeff-exp';
  if n <> 1 or st <> 'd7' or nm not like '%(vence en 7 días)%' then bad:=bad||' [no avisó a los 7 días: '||coalesce(st,'-')||' '||coalesce(nm,'-')||']'; end if;
  select count(*) into n from public.due_plan_notices_cron(sec); if n <> 0 then bad:=bad||' [repitió el aviso de 7 días]'; end if;
  update public.clients set plan_since = today - 25 where id = ca; insert into public.plan_expiry_log (client_id, ends_on, stage) values (ca, today + 5, 'd7');   -- faltan 5 y ya se avisó ese vencimiento: nada
  select count(*) into n from public.due_plan_notices_cron(sec); if n <> 0 then bad:=bad||' [repitió con 5 días]'; end if;
  update public.clients set plan_since = today - 28 where id = ca;   -- faltan 2 (fecha de fin distinta: en la vida real es la misma; se limpia para simularlo)
  delete from public.plan_expiry_log where client_id = ca; insert into public.plan_expiry_log (client_id, ends_on, stage) values (ca, today + 2, 'd7');
  select count(*), max(d.stage) into n, st from public.due_plan_notices_cron(sec) d where d.endpoint='https://test.push/jeff-exp';
  if n <> 1 or st <> 'd2' then bad:=bad||' [no avisó a los 2 días]'; end if;
  select count(*) into n from public.due_plan_notices_cron(sec) d where d.endpoint='https://test.push/cli-exp'; if n <> 0 then bad:=bad||' [el aviso le llegó a un cliente]'; end if;
  update public.clients set plan_since = today - 30 where id = ca; delete from public.plan_expiry_log where client_id = ca; insert into public.plan_expiry_log (client_id, ends_on, stage) values (ca, today, 'd7'), (ca, today, 'd2');
  select count(*), max(d.stage) into n, st from public.due_plan_notices_cron(sec) d where d.endpoint='https://test.push/jeff-exp';
  if n <> 1 or st <> 'd0' then bad:=bad||' [no avisó el día que vence]'; end if;
  select plan_id into pl from public.clients where id = ca; if pl is null then bad:=bad||' [el plan se quitó solo]'; end if;
  -- ya avisado por la tarea vieja: no repite
  delete from public.plan_expiry_log where client_id = ca; update public.clients set plan_expiry_notified_on = today where id = ca;
  select count(*) into n from public.due_plan_notices_cron(sec); if n <> 0 then bad:=bad||' [repitió lo que ya avisó la tarea vieja]'; end if;
  -- renovar: vuelve a contar desde cero
  update public.clients set plan_since = today - 23, plan_expiry_notified_on = null where id = ca; delete from public.plan_expiry_log where client_id = ca;
  select count(*) into n from public.due_plan_notices_cron(sec) d where d.endpoint='https://test.push/jeff-exp'; if n <> 1 then bad:=bad||' [no volvió a contar tras renovar]'; end if;
  -- sin clave, cliente y otro coach
  begin perform * from public.due_plan_notices_cron('clave-falsa'); bad:=bad||' [cron sin clave]'; exception when others then null; end;
  perform pg_temp.as_user(a);
  begin perform * from public.plan_expiry_log; bad:=bad||' [el cliente lee el registro]'; exception when others then null; end;
  begin insert into public.plan_expiry_log (client_id, ends_on, stage) values (ca, today, 'd0'); bad:=bad||' [el cliente escribe el registro]'; exception when others then null; end;
  perform pg_temp.as_user(o);
  begin perform * from public.plan_expiry_log; bad:=bad||' [otro coach lee el registro]'; exception when others then null; end;
  perform pg_temp.reset();
  delete from public.push_subscriptions where endpoint in ('https://test.push/jeff-exp','https://test.push/cli-exp');
  raise notice 'RESULTADO ATAQUES PLAN POR VENCER: %', case when bad = '' then 'ninguno' else bad end;
end $$;
