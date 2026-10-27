-- Pruebas de ataque del borrado garantizado de vídeos del reporte (0033). Ejecutar al FINAL (después de rls_activity.sql).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); execute 'set role anon'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0';
  ws uuid; ca uuid; n int; bad text:=''; k text; rid uuid; r record;
begin
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a;
  insert into public.app_secrets values ('cron','clave-videos') on conflict (name) do nothing;
  select value into k from public.app_secrets where name='cron';
  update public.plans set features = array_append(features, 'daily_report') where id=(select plan_id from public.clients where id=ca) and not ('daily_report' = any(features));
  update public.clients set status='active' where id=ca;
  delete from public.daily_reports where client_id=ca and report_date=current_date+1;

  -- El cliente envía un reporte con vídeo: vence a las 32 h
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('e0000001-0000-0000-0000-000000000001', ws, ca);   -- A ya usó su cupo en pruebas anteriores
  perform pg_temp.as_user(a);
  rid := public.submit_report(current_date+1, 'mañana', 'e0000001-0000-0000-0000-000000000001');
  perform pg_temp.reset();
  select * into r from public.daily_reports where id=rid;
  if r.delete_after > now() + interval '32 hours' + interval '1 minute' or r.delete_after < now() + interval '31 hours' then bad:=bad||' [no vence a las 32 h]'; end if;
  -- Jeff lo ve: vence a las 12 h
  perform pg_temp.as_user(jeff); perform public.review_report(rid); perform pg_temp.reset();
  select * into r from public.daily_reports where id=rid;
  if r.delete_after > now() + interval '12 hours' + interval '1 minute' then bad:=bad||' [no vence 12 h tras verlo]'; end if;

  -- Tarea programada: sin clave o con clave mala no ve ni borra nada
  update public.daily_reports set delete_after = now() - interval '1 minute' where id=rid;
  perform pg_temp.as_anon();
  select count(*) into n from public.due_report_videos_cron('clave-mala'); if n<>0 then bad:=bad||' [clave mala listó vídeos]'; end if;
  select count(*) into n from public.due_report_videos_cron(null); if n<>0 then bad:=bad||' [clave nula listó vídeos]'; end if;
  if pg_temp.try(format('select public.mark_video_deleted_cron(%L, %L)', 'clave-mala', rid)) then bad:=bad||' [clave mala marcó borrado]'; end if;
  select count(*) into n from public.due_orphan_videos_cron('clave-mala'); if n<>0 then bad:=bad||' [clave mala listó huérfanos]'; end if;
  if pg_temp.try(format('select public.discard_orphan_cron(%L, %L)', 'clave-mala', 'x')) then bad:=bad||' [clave mala borró huérfano]'; end if;
  if pg_temp.try('select public._cron_ok(''x'')') then bad:=bad||' [anónimo usa _cron_ok]'; end if;
  -- con la clave correcta: lista el vencido y lo marca
  select count(*) into n from public.due_report_videos_cron(k) where id=rid; if n<>1 then bad:=bad||' [no listó el vídeo vencido]'; end if;
  perform public.mark_video_deleted_cron(k, rid);
  perform pg_temp.reset();
  select video_state into k from public.daily_reports where id=rid; if k<>'deleted' then bad:=bad||' [no quedó marcado como borrado]'; end if;
  -- un vídeo en uso nunca es huérfano
  select value into k from public.app_secrets where name='cron';
  perform pg_temp.as_anon();
  if public.discard_orphan_cron(k, 'e0000001-0000-0000-0000-000000000001') then bad:=bad||' [borró un vídeo en uso]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES VIDEOEXPIRY: %', coalesce(nullif(bad,''),'ninguno');
end $$;
