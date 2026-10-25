-- Pruebas de ataque de recordatorios. Ejecutar DESPUÉS de rls_dayvideo.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; c uuid:='00000000-0000-0000-0000-00000000000c';
  ca uuid; ws uuid; n int; bad text:=''; t timestamptz := '2026-10-25 02:00:00+00';   -- 24-oct 21:00 en Bogotá (sábado)
begin
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a;
  update public.plans set features = array['training','daily_report','progress'] where name='Esencial' and workspace_id=ws;
  delete from public.daily_reports where client_id=ca and report_date='2026-10-24';
  -- sin clave configurada: nada sale
  select count(*) into n from public.due_reminders('cualquiera', 'night', t); if n<>0 then bad:=bad||' [sin clave configurada devolvió filas]'; end if;
  insert into public.app_secrets values ('cron','clave-correcta');
  select count(*) into n from public.due_reminders('clave-mala', 'night', t); if n<>0 then bad:=bad||' [clave incorrecta devolvió filas]'; end if;
  select count(*) into n from public.due_reminders(null, 'night', t); if n<>0 then bad:=bad||' [clave nula devolvió filas]'; end if;
  -- clave correcta: el cliente activo sin reporte recibe aviso; el pendiente (c) no
  select count(*) into n from public.due_reminders('clave-correcta', 'night', t) where title like 'Cuéntale%' and endpoint='https://push.example/a'; if n<>1 then bad:=bad||' [no avisó el reporte: '||n||']'; end if;
  select count(*) into n from public.due_reminders('clave-correcta', 'night', t); if n<>0 then bad:=bad||' [repitió los avisos]'; end if;
  -- un cliente o anónimo no puede leer secretos ni el registro
  -- por la mañana y al mediodía: aviso una sola vez por cliente activo con dispositivo; tipo desconocido no devuelve nada
  select count(*) into n from public.due_reminders('clave-correcta', 'morning', t) where endpoint='https://push.example/a' and title='Buenos días'; if n<>1 then bad:=bad||' [no avisó de mañana: '||n||']'; end if;
  select count(*) into n from public.due_reminders('clave-correcta', 'morning', t); if n<>0 then bad:=bad||' [repitió el aviso de mañana]'; end if;
  select count(*) into n from public.due_reminders('clave-correcta', 'midday', t) where endpoint='https://push.example/a'; if n<>1 then bad:=bad||' [no avisó al mediodía: '||n||']'; end if;
  select count(*) into n from public.due_reminders('clave-correcta', 'otro', t); if n<>0 then bad:=bad||' [tipo desconocido devolvió filas]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.app_secrets; if n<>0 then bad:=bad||' [cliente lee secretos]'; end if;
  select count(*) into n from public.reminder_log; if n<>0 then bad:=bad||' [cliente lee reminder_log]'; end if;
  if pg_temp.try('select * from public.due_reminders(''clave-mala'', ''night'')') and (select count(*) from public.due_reminders('clave-mala', 'night'))<>0 then bad:=bad||' [cliente forzó avisos]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES RECORDATORIOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
