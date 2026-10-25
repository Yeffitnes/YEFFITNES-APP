-- Pruebas de ataque del vídeo de rutina. Ejecutar DESPUÉS de rls_messages.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; ws uuid; tpl uuid; pa uuid; d uuid; n int; bad text:=''; yt text;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.as_user(jeff);
  select id into tpl from public.routine_templates limit 1;
  if tpl is null then
    tpl := public.save_routine(null,'Rutina vídeo','upper',40,'[]'::jsonb,'dQw4w9WgXcQ');
  else
    perform public.save_routine(tpl,'Rutina vídeo','upper',40,'[]'::jsonb,'dQw4w9WgXcQ');
  end if;
  if pg_temp.try('select public.save_routine(null,''x'',null,10,''[]''::jsonb,''corto'')') then bad:=bad||' [youtube inválido en plantilla]'; end if;
  perform pg_temp.reset();
  select id into pa from public.training_plans where client_id=ca and status='active';
  if pa is null then insert into public.training_plans (workspace_id, client_id, name, status) values (ws, ca, 'Plan vídeo', 'active') returning id into pa; end if;
  perform pg_temp.as_user(jeff);
  d := public.assign_day(pa, 3, tpl);
  perform pg_temp.reset(); select video_ref into yt from public.plan_days where id=d; if yt is distinct from 'dQw4w9WgXcQ' then bad:=bad||' [no copió el vídeo al día]'; end if;
  -- vídeos de otros
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('f8f8f8f8-ffff-ffff-ffff-ffffffffffff', ws, cb), ('f9f9f9f9-ffff-ffff-ffff-ffffffffffff', ws, ca);
  perform pg_temp.as_user(jeff);
  if pg_temp.try('select public.set_day_video('''||d||''',''f8f8f8f8-ffff-ffff-ffff-ffffffffffff'')') then bad:=bad||' [vídeo de otro cliente en mi día]'; end if;
  if not pg_temp.try('select public.set_day_video('''||d||''',''f9f9f9f9-ffff-ffff-ffff-ffffffffffff'')') then bad:=bad||' [no pudo asignar su vídeo]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.set_day_video('''||d||''',null)') then bad:=bad||' [cliente cambió vídeo de día]'; end if;
  update public.plan_days set video_id=null where id=d; get diagnostics n=row_count; if n<>0 then bad:=bad||' [cliente editó plan_days]'; end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.plan_days where id=d; if n<>0 then bad:=bad||' [B ve el día de A]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try('select public.set_day_video('''||d||''',null)') then bad:=bad||' [otro coach cambió vídeo]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES VIDEO RUTINA: %', coalesce(nullif(bad,''),'ninguno');
end $$;
