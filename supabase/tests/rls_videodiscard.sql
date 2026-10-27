-- Pruebas de ataque del descarte de vídeos huérfanos. Ejecutar DESPUÉS de rls_audio.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; ws uuid; n int; ok boolean; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  insert into public.video_uploads (video_id, workspace_id, client_id, created_at) values
    ('d1d1d1d1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ws, ca, now()), ('d2d2d2d2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ws, cb, now()),
    ('d3d3d3d3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ws, ca, now() - interval '2 hours');
  -- el cliente descarta el suyo, no el de otro; uno en uso no se descarta
  perform pg_temp.as_user(a);
  select public.discard_video_upload('d2d2d2d2-bbbb-bbbb-bbbb-bbbbbbbbbbbb') into ok; if ok then bad:=bad||' [descartó un vídeo ajeno]'; end if;
  select public.discard_video_upload('d1d1d1d1-aaaa-aaaa-aaaa-aaaaaaaaaaaa') into ok; if not ok then bad:=bad||' [no descartó el suyo]'; end if;
  select public.discard_video_upload('a1a1a1a1-aaaa-aaaa-aaaa-aaaaaaaaaaaa') into ok; if ok then bad:=bad||' [descartó uno en uso]'; end if;
  select count(*) into n from public.due_orphan_videos(); if n<>0 then bad:=bad||' [cliente ve huérfanos]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.due_orphan_videos(); if n<>0 then bad:=bad||' [otro coach ve huérfanos]'; end if;
  select public.discard_video_upload('d3d3d3d3-aaaa-aaaa-aaaa-aaaaaaaaaaaa') into ok; if ok then bad:=bad||' [otro coach descartó]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.due_orphan_videos() where video_id = 'd3d3d3d3-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; if n<>1 then bad:=bad||' [coach no ve el huérfano viejo]'; end if;
  select count(*) into n from public.due_orphan_videos() where video_id = 'd2d2d2d2-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; if n<>0 then bad:=bad||' [lista uno reciente]'; end if;
  select public.discard_video_upload('d3d3d3d3-aaaa-aaaa-aaaa-aaaaaaaaaaaa') into ok; if not ok then bad:=bad||' [coach no pudo descartar]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES DESCARTE VIDEOS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
