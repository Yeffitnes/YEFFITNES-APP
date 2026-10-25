-- Pruebas de ataque del Reporte diario. Ejecutar DESPUÉS de rls_notes.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; n int; bad text:=''; rid uuid; va text:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; vb text:='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; r record;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.reset();
  update public.clients set plan_id=(select id from public.plans where name='Esencial') where id=ca;   -- A: tiene daily_report
  update public.clients set plan_id=(select id from public.plans where name='SoloRutina') where id=cb;  -- B: sin daily_report (creado en rls_notes)
  perform pg_temp.as_user(a);
  perform public.register_video_upload(va);
  rid := public.submit_report(current_date, 'Entrené bien', va); raise notice 'OK A envía su reporte con vídeo';
  if not pg_temp.fails(format('insert into public.daily_reports (workspace_id,client_id,report_date) values (%L,%L,current_date-3)', ws, ca)) then bad:=bad||' [cliente insertó un reporte directo]'; end if;
  if not pg_temp.fails(format('update public.daily_reports set coach_seen_at=now() where id=%L', rid)) then null; end if;
  select count(*) into n from public.daily_reports where coach_seen_at is not null; if n<>0 then bad:=bad||' [cliente marcó su reporte como visto]'; end if;
  if not pg_temp.fails(format('select public.submit_report(current_date-5, %L)', 'viejo')) then bad:=bad||' [reporte con fecha de hace 5 días]'; end if;
  if not pg_temp.fails(format('select public.submit_report(current_date, %L, %L)', 'x', vb)) then bad:=bad||' [usó un vídeo que no registró]'; end if;
  if not pg_temp.fails(format('select public.review_report(%L)', rid)) then bad:=bad||' [cliente revisó su propio reporte]'; end if;
  if not pg_temp.fails('select * from public.due_report_videos()') then null; end if;
  select count(*) into n from public.due_report_videos(); if n<>0 then bad:=bad||' [cliente usa la lista de vídeos por borrar]'; end if;
  -- límite de subidas
  perform public.register_video_upload('c0000001-0000-0000-0000-000000000001'); perform public.register_video_upload('c0000001-0000-0000-0000-000000000002');
  perform public.register_video_upload('c0000001-0000-0000-0000-000000000003'); perform public.register_video_upload('c0000001-0000-0000-0000-000000000004');
  if not pg_temp.fails(format('select public.register_video_upload(%L)', 'c0000001-0000-0000-0000-000000000005')) then bad:=bad||' [superó 5 subidas por día]'; end if;
  perform pg_temp.as_user(b);   -- plan sin reporte diario
  if not pg_temp.fails(format('select public.submit_report(current_date, %L)', 'hola')) then bad:=bad||' [plan sin reporte diario envió reporte]'; end if;
  if not pg_temp.fails(format('select public.register_video_upload(%L)', 'dddddddd-dddd-dddd-dddd-dddddddddddd')) then bad:=bad||' [plan sin reporte subió vídeo]'; end if;
  select count(*) into n from public.daily_reports; if n<>0 then bad:=bad||' [B ve el reporte de A]'; end if;
  perform pg_temp.as_user(c);   -- pendiente
  if not pg_temp.fails(format('select public.submit_report(current_date, %L)', 'hola')) then bad:=bad||' [cliente pendiente envió reporte]'; end if;
  perform pg_temp.as_user(o);   -- otro coach
  select count(*) into n from public.daily_reports; if n<>0 then bad:=bad||' [otro coach ve reportes]'; end if;
  if not pg_temp.fails(format('select public.review_report(%L)', rid)) then bad:=bad||' [otro coach revisó reporte ajeno]'; end if;
  select count(*) into n from public.due_report_videos(); if n<>0 then bad:=bad||' [otro coach ve vídeos por borrar]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.daily_reports where video_state='uploaded' and coach_seen_at is null; assert n=1;
  perform public.review_report(rid);
  select * into r from public.daily_reports where id=rid; assert r.coach_seen_at is not null and r.delete_after <= now() + interval '24 hours' + interval '1 minute', 'el vídeo debe borrarse ≤ 24 h tras verlo';
  select count(*) into n from public.due_report_videos(); assert n=0, 'aún no vence';
  update public.daily_reports set delete_after = now() - interval '1 minute' where id=rid;
  select count(*) into n from public.due_report_videos(); assert n=1, 'debe aparecer como vencido';
  perform public.mark_video_deleted(rid);
  select * into r from public.daily_reports where id=rid; assert r.video_state='deleted';
  perform pg_temp.as_user(a);   -- reporte ya revisado: no se puede cambiar
  if not pg_temp.fails(format('select public.submit_report(current_date, %L)', 'cambio')) then bad:=bad||' [cliente editó un reporte ya revisado]'; end if;
  raise notice 'RESULTADO ATAQUES REPORTES: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
