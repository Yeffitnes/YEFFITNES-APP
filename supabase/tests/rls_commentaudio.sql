-- Pruebas de ataque del audio en el comentario de entrenamiento. Ejecutar DESPUÉS de rls_audio.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; ws uuid; lid uuid; n int; got text; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  insert into public.workout_logs (workspace_id, client_id, log_date, completed_at) values (ws, ca, current_date + 30, now()) returning id into lid;
  -- el cliente no puede revisar ni escribir el audio a mano
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.review_workout('''||lid||''',''x'','''||ws||'/'||ca||'/c1.webm'')') then bad:=bad||' [cliente revisó con audio]'; end if;
  if pg_temp.try('update public.workout_logs set coach_comment_audio=''x'' where id='''||lid||'''') then
    select coach_comment_audio into got from public.workout_logs where id = lid; if got is not null then bad:=bad||' [cliente escribió el audio]'; end if; end if;
  perform pg_temp.reset();
  -- el coach: con su cliente sí; con ruta de otro cliente no
  perform pg_temp.as_user(jeff);
  perform public.review_workout(lid, 'ok', ws::text||'/'||ca::text||'/c1.webm');
  if pg_temp.try('select public.review_workout('''||lid||''',''x'','''||ws||'/'||cb||'/c2.webm'')') then bad:=bad||' [ruta de otro cliente]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try('select public.review_workout('''||lid||''',''x'',null)') then bad:=bad||' [otro coach revisó]'; end if;
  -- el cliente ve el audio de su propio entrenamiento
  perform pg_temp.as_user(a);
  select coach_comment_audio into got from public.workout_logs where id = lid; if got is distinct from ws::text||'/'||ca::text||'/c1.webm' then bad:=bad||' [cliente no ve su audio]'; end if;
  -- reemplazar o quitar el audio lo manda a la basura
  perform pg_temp.as_user(jeff);
  perform public.review_workout(lid, 'ok', null);
  select count(*) into n from public.due_message_trash() where kind='audio' and ref = ws::text||'/'||ca::text||'/c1.webm'; if n<>1 then bad:=bad||' [audio quitado no llegó a la basura: '||n||']'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES AUDIO DE COMENTARIO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
