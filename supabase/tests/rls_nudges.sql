-- Pruebas de ataque de avisos rápidos, actividad del día y vídeo del objetivo (0036). Ejecutar al FINAL (después de rls_matvideo.sql).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; n int; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  update public.clients set status='active' where id in (ca, cb);
  delete from public.nudges;
  insert into public.push_subscriptions values ('https://push.example/a-nudge', a, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;

  -- Avisos: solo el coach del espacio, 1 por tipo y día
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.nudge_targets(ca, 'train') where endpoint='https://push.example/a-nudge'; if n<>1 then bad:=bad||' [no devolvió el dispositivo del cliente]'; end if;
  if pg_temp.try(format('select * from public.nudge_targets(%L, %L)', ca, 'train')) then bad:=bad||' [avisó dos veces el mismo día]'; end if;
  if not pg_temp.try(format('select * from public.nudge_targets(%L, %L)', ca, 'report')) then bad:=bad||' [no pudo avisar otro tipo]'; end if;
  if pg_temp.try(format('select * from public.nudge_targets(%L, %L)', ca, 'otro')) then bad:=bad||' [tipo inválido aceptado]'; end if;
  select count(*) into n from public.nudges; if n<>2 then bad:=bad||' [coach no ve sus avisos: '||n||']'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try(format('select * from public.nudge_targets(%L, %L)', cb, 'train')) then bad:=bad||' [otro coach avisó a cliente ajeno]'; end if;
  select count(*) into n from public.nudges; if n<>0 then bad:=bad||' [otro coach ve avisos ajenos]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select * from public.nudge_targets(%L, %L)', cb, 'train')) then bad:=bad||' [cliente envió avisos]'; end if;
  if pg_temp.try(format('insert into public.nudges (workspace_id,client_id,kind,day) values (%L,%L,%L,current_date)', ws, cb, 'meals')) then bad:=bad||' [insert directo de aviso]'; end if;

  -- Actividad: solo hoy, y lo de más de 24 h se borra al consultar
  perform pg_temp.reset();
  delete from public.activity_events where client_id = ca;
  insert into public.activity_events (workspace_id, client_id, kind, event_date, created_at) values
    (ws, ca, 'training_done', (now() at time zone 'America/Bogota')::date, now()),
    (ws, ca, 'nutrition_done', (now() at time zone 'America/Bogota')::date - 2, now() - interval '2 days');
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.activity_feed(20) where client_id = ca; if n<>1 then bad:=bad||' [la actividad trae días anteriores: '||n||']'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.activity_events where client_id = ca and created_at < now() - interval '24 hours'; if n<>0 then bad:=bad||' [no borró la actividad vieja]'; end if;

  -- Vídeo del objetivo: solo un vídeo de ESE cliente; el cliente no puede ponerlo
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('0b0b0b0b-0000-0000-0000-00000000000a', ws, ca), ('0b0b0b0b-0000-0000-0000-00000000000b', ws, cb) on conflict do nothing;
  perform pg_temp.as_user(jeff);
  if not pg_temp.try(format('update public.clients set objective_video_id=%L where id=%L', '0b0b0b0b-0000-0000-0000-00000000000a', ca)) then bad:=bad||' [coach no pudo poner el vídeo del objetivo]'; end if;
  if pg_temp.try(format('update public.clients set objective_video_id=%L where id=%L', '0b0b0b0b-0000-0000-0000-00000000000b', ca)) then bad:=bad||' [puso el vídeo de otro cliente]'; end if;
  perform pg_temp.as_user(a);
  update public.clients set objective_video_id=null where id=ca; get diagnostics n=row_count; if n<>0 then bad:=bad||' [cliente cambió su vídeo de objetivo]'; end if;
  perform pg_temp.reset();
  if not public._video_in_use('0b0b0b0b-0000-0000-0000-00000000000a') then bad:=bad||' [el vídeo del objetivo cuenta como huérfano]'; end if;
  raise notice 'RESULTADO ATAQUES NUDGES: %', coalesce(nullif(bad,''),'ninguno');
end $$;
