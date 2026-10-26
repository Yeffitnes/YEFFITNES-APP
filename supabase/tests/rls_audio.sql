-- Pruebas de ataque de los mensajes de audio. Ejecutar DESPUÉS de rls_messages.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; ws uuid; mid uuid; n int; bad text:=''; k text;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  -- el cliente no puede enviar audio ni escribir la columna a mano
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.send_audio_message('''||ca||''','''||ws||'/'||ca||'/x.webm'')') then bad:=bad||' [cliente envió audio]'; end if;
  if pg_temp.try('insert into public.messages (workspace_id,client_id,sender,audio_path) values ('''||ws||''','''||ca||''',''client'',''x'')') then bad:=bad||' [cliente insertó audio directo]'; end if;
  perform pg_temp.reset();
  -- el coach: a su cliente sí; a otro espacio o con ruta ajena no
  perform pg_temp.as_user(jeff);
  mid := public.send_audio_message(ca, ws::text||'/'||ca::text||'/n1.webm');
  if pg_temp.try('select public.send_audio_message('''||ca||''','''||ws||'/'||cb||'/n2.webm'')') then bad:=bad||' [ruta de otro cliente]'; end if;
  if pg_temp.try('select public.send_audio_message('''||ca||''',null)') then bad:=bad||' [audio vacío]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try('select public.send_audio_message('''||ca||''','''||ws||'/'||ca||'/n3.webm'')') then bad:=bad||' [otro coach envió audio]'; end if;
  perform pg_temp.reset();
  -- Storage: cada quien oye solo lo suyo; el cliente no sube
  insert into storage.buckets (id, name) values ('message-audio','message-audio') on conflict do nothing;
  insert into storage.objects (bucket_id, name) values ('message-audio', ws::text||'/'||ca::text||'/n1.webm'), ('message-audio', ws::text||'/'||cb::text||'/b1.webm');
  perform pg_temp.as_user(a); select count(*) into n from storage.objects where bucket_id='message-audio'; if n<>1 then bad:=bad||' [A ve '||n||' audios]'; end if;
  if pg_temp.try('insert into storage.objects (bucket_id,name) values (''message-audio'','''||ws||'/'||ca||'/mio.webm'')') then bad:=bad||' [cliente subió audio]'; end if;
  perform pg_temp.as_user(b); select count(*) into n from storage.objects where bucket_id='message-audio'; if n<>1 then bad:=bad||' [B ve '||n||' audios]'; end if;
  perform pg_temp.as_user(jeff); select count(*) into n from storage.objects where bucket_id='message-audio'; if n<>2 then bad:=bad||' [coach ve '||n||']'; end if;
  perform pg_temp.as_user(o); select count(*) into n from storage.objects where bucket_id='message-audio'; if n<>0 then bad:=bad||' [otro coach ve audios]'; end if;
  perform pg_temp.reset();
  -- bandeja y limpieza
  perform pg_temp.as_user(jeff);
  select last_kind into k from public.list_threads() where client_id=ca; if k is distinct from 'audio' then bad:=bad||' [tipo del último mensaje: '||coalesce(k,'null')||']'; end if;
  perform pg_temp.reset(); update public.messages set read_at = now() - interval '25 hours' where id = mid;
  perform pg_temp.as_user(jeff); perform public.purge_messages();
  select count(*) into n from public.due_message_trash() where kind='audio'; if n<>1 then bad:=bad||' [audio no llegó a la basura: '||n||']'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES AUDIO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
