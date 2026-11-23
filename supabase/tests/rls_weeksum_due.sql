-- Pruebas de 0062: aviso de la mañana a Yeff con los resúmenes por enviar. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0';
  ws uuid; ca uuid; sec text; n int; t text; bad text:=''; today date := (now() at time zone 'America/Bogota')::date;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a; select value into sec from public.app_secrets where name='cron';
  -- A empezó hace exactamente 14 días: hoy completó su semana 2
  update public.clients set status = 'active', activated_at = ((today - 14) + time '09:00') at time zone 'America/Bogota' where id = ca;
  update public.clients set status = 'paused' where workspace_id = ws and id <> ca and status = 'active';   -- solo A cuenta en esta prueba
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values ('https://test.push/jeff-ws', jeff, ws, 'k', 'x'), ('https://test.push/cli-ws', a, ws, 'k', 'x')
    on conflict (endpoint) do update set profile_id = excluded.profile_id;
  delete from public.week_summaries where client_id = ca; delete from public.reminder_log where kind = 'week-sum';
  begin perform * from public.due_week_summary_cron('falsa'); bad:=bad||' [sin clave]'; exception when others then null; end;
  select count(*), max(body) into n, t from public.due_week_summary_cron(sec) d where d.endpoint = 'https://test.push/jeff-ws';
  if n < 1 or t not like '%(semana 2)%' then bad:=bad||' [no avisó a Yeff: '||coalesce(t,'-')||']'; end if;
  select count(*) into n from public.due_week_summary_cron(sec); if n <> 0 then bad:=bad||' [avisó dos veces el mismo día]'; end if;
  -- si ya se envió, no avisa
  delete from public.reminder_log where kind = 'week-sum';
  insert into public.week_summaries (workspace_id, client_id, week_n, from_day, to_day) values (ws, ca, 2, today - 7, today - 1);
  select count(*) into n from public.due_week_summary_cron(sec); if n <> 0 then bad:=bad||' [avisó una semana ya enviada]'; end if;
  -- a mitad de semana no avisa
  delete from public.week_summaries where client_id = ca; delete from public.reminder_log where kind = 'week-sum';
  update public.clients set activated_at = ((today - 10) + time '09:00') at time zone 'America/Bogota' where id = ca;
  select count(*) into n from public.due_week_summary_cron(sec); if n <> 0 then bad:=bad||' [avisó a mitad de semana]'; end if;
  update public.clients set status = 'active' where workspace_id = ws and status = 'paused';
  raise notice 'RESULTADO ATAQUES RESUMENES POR ENVIAR: %', coalesce(nullif(bad,''),'ninguno');
end $$;
