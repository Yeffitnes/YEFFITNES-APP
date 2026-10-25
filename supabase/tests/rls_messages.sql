-- Pruebas de ataque de Mensajes y Push. Ejecutar DESPUÉS de rls_objective.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ca uuid; cb uuid; cc uuid; ws uuid; mid uuid; n int; bad text:=''; ok boolean;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b; select id into cc from public.clients where profile_id=c;
  update public.clients set status='pending', plan_id=null where id=cc;
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('a1a1a1a1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ws, ca), ('b2b2b2b2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ws, cb);

  perform pg_temp.as_user(a);
  mid := public.send_message(ca, 'Hola Jeff');                                         -- p_client se ignora para clientes
  -- A intenta escribir en el hilo de B (pasando el id de B): debe terminar en SU hilo, nunca en el de B
  perform public.send_message(cb, 'intruso');
  perform pg_temp.reset(); select count(*) into n from public.messages where client_id=cb; if n<>0 then bad:=bad||' [A escribió en el hilo de B]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try('insert into public.messages (workspace_id,client_id,sender,body) values ('''||ws||''','''||ca||''',''coach'',''falso'')') then bad:=bad||' [insert directo]'; end if;
  if pg_temp.try('select public.send_message(null,''x'',null,null,''dQw4w9WgXcQ'')') then bad:=bad||' [cliente envió YouTube]'; end if;
  if pg_temp.try('select public.send_message(null,null,''x/y/z.jpg'')') then bad:=bad||' [imagen fuera de su carpeta]'; end if;
  if pg_temp.try('select public.send_message(null,null,null,''b2b2b2b2-bbbb-bbbb-bbbb-bbbbbbbbbbbb'')') then bad:=bad||' [vídeo ajeno]'; end if;
  if not pg_temp.try('select public.send_message(null,null,null,''a1a1a1a1-aaaa-aaaa-aaaa-aaaaaaaaaaaa'')') then bad:=bad||' [su propio vídeo no se acepta]'; end if;
  if pg_temp.try('select public.send_message(null,''   '')') then bad:=bad||' [mensaje vacío]'; end if;
  if pg_temp.try('select public.send_message(null,'''||repeat('x',2001)||''')') then bad:=bad||' [mensaje gigante]'; end if;
  update public.messages set body='editado' where id=mid; get diagnostics n=row_count; if n<>0 then bad:=bad||' [cliente editó mensaje]'; end if;
  delete from public.messages where id=mid; get diagnostics n=row_count; if n<>0 then bad:=bad||' [cliente borró mensaje]'; end if;
  select count(*) into n from public.messages; if n<>3 then bad:=bad||' [A ve '||n||' mensajes]'; end if;   -- los suyos: hola, intruso, vídeo

  -- B no ve nada de A
  perform pg_temp.as_user(b);
  select count(*) into n from public.messages where client_id=ca; if n<>0 then bad:=bad||' [B ve mensajes de A]'; end if;
  select count(*) into n from public.list_threads(); if n<>0 then bad:=bad||' [cliente usa bandeja del coach]'; end if;

  -- cliente pendiente: solo texto
  perform pg_temp.as_user(c);
  if not pg_temp.try('select public.send_message(null,''Quiero activar mi plan'')') then bad:=bad||' [pendiente no puede escribir]'; end if;
  if pg_temp.try('select public.send_message(null,null,''ws/x/y.jpg'')') then bad:=bad||' [pendiente envió foto]'; end if;

  -- no es un chat: máximo 3 sin leer, 600 caracteres, y se borra tras leerlo
  perform pg_temp.as_user(a);
  if pg_temp.try('select public.send_message(null,''cuarto sin leer'')') then bad:=bad||' [más de 3 mensajes sin leer]'; end if;
  if pg_temp.try('select public.send_message(null,'''||repeat('x',601)||''')') then bad:=bad||' [cliente envió más de 600 caracteres]'; end if;
  perform pg_temp.reset(); update public.messages set read_at = now() where client_id=ca and sender='client';
  perform pg_temp.as_user(a);
  if not pg_temp.try('select public.send_message(null,''ya puedo escribir'')') then bad:=bad||' [no pudo escribir tras ser leído]'; end if;
  if pg_temp.try('select public.purge_messages()') then bad:=bad||' [cliente ejecutó la limpieza del coach]'; end if;
  if pg_temp.try('select public.due_message_trash()') and (select count(*) from public.due_message_trash())<>0 then bad:=bad||' [cliente ve la basura]'; end if;
  perform pg_temp.reset();
  update public.messages set read_at = now() - interval '25 hours', image_path = ws::text||'/'||ca::text||'/old.jpg' where client_id=ca and sender='client' and body='Hola Jeff';
  perform pg_temp.as_user(o);
  perform public.purge_messages(); select count(*) into n from public.due_message_trash(); if n<>0 then bad:=bad||' [otro coach vio basura ajena: '||n||']'; end if;
  perform pg_temp.as_user(jeff);
  perform public.purge_messages();
  perform pg_temp.reset(); select count(*) into n from public.messages where body='Hola Jeff'; if n<>0 then bad:=bad||' [no se borró un mensaje leído hace 25 h]'; end if;
  select count(*) into n from public.messages where body='ya puedo escribir'; if n<>1 then bad:=bad||' [se borró un mensaje reciente]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.due_message_trash() where kind='image' and ref like '%/old.jpg'; if n<>1 then bad:=bad||' [la foto del mensaje borrado no quedó en la basura]'; end if;
  perform public.clear_message_trash(array(select id from public.due_message_trash()));
  select count(*) into n from public.due_message_trash(); if n<>0 then bad:=bad||' [la basura no se limpió]'; end if;
  perform pg_temp.reset();

  -- Permiso de vídeo
  perform pg_temp.as_user(a);
  if not pg_temp.try('select public.register_message_video(''c3c3c3c3-cccc-cccc-cccc-cccccccccccc'')') then bad:=bad||' [cliente activo no puede registrar vídeo]'; end if;
  perform pg_temp.as_user(c);
  if pg_temp.try('select public.register_message_video(''d4d4d4d4-dddd-dddd-dddd-dddddddddddd'')') then bad:=bad||' [pendiente registró vídeo]'; end if;
  perform pg_temp.as_user(a);
  perform public.register_message_video('d5d5d5d5-dddd-dddd-dddd-dddddddddddd', cb);   -- p_client se ignora para clientes
  perform pg_temp.reset(); select count(*) into n from public.video_uploads where video_id like 'd5%' and client_id=cb; if n<>0 then bad:=bad||' [vídeo registrado en hilo ajeno]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try('select public.register_message_video(''d6d6d6d6-dddd-dddd-dddd-dddddddddddd'', '''||ca||''')') then bad:=bad||' [otro coach registró vídeo]'; end if;
  -- Coach
  perform pg_temp.as_user(jeff);
  if not pg_temp.try('select public.register_message_video(''e7e7e7e7-eeee-eeee-eeee-eeeeeeeeeeee'', '''||ca||''')') then bad:=bad||' [coach no puede registrar vídeo]'; end if;
  perform public.send_message(ca, null, null, 'e7e7e7e7-eeee-eeee-eeee-eeeeeeeeeeee');
  if pg_temp.try('select public.send_message('''||cb||''', null, null, ''e7e7e7e7-eeee-eeee-eeee-eeeeeeeeeeee'')') then bad:=bad||' [vídeo reutilizado en otro hilo]'; end if;
  select count(*) into n from public.list_threads(); if n<2 then bad:=bad||' [coach no ve la bandeja]'; end if;
  perform public.send_message(ca, 'Hola, ¿cómo vas?', null, null, 'dQw4w9WgXcQ');
  if pg_temp.try('select public.send_message('''||ca||''',null,null,null,''corto'')') then bad:=bad||' [youtube inválido]'; end if;
  if pg_temp.try('select public.send_message('''||ca||''',null,''otro/ws/a.jpg'')') then bad:=bad||' [coach: ruta de imagen ajena]'; end if;
  select public.unread_messages() into n; if n<2 then bad:=bad||' [contador coach]'; end if;
  perform public.mark_thread_read(ca);
  perform pg_temp.reset(); select count(*) into n from public.messages where client_id=ca and sender='client' and read_at is null; if n<>0 then bad:=bad||' [no marcó leídos]'; end if;

  -- Otro coach (otro espacio): ni ve, ni escribe, ni marca
  perform pg_temp.as_user(o);
  select count(*) into n from public.messages; if n<>0 then bad:=bad||' [otro coach ve mensajes]'; end if;
  if pg_temp.try('select public.send_message('''||ca||''',''hola'')') then bad:=bad||' [otro coach escribió a mi cliente]'; end if;
  select count(*) into n from public.list_threads(); if n<>0 then bad:=bad||' [otro coach ve bandeja]'; end if;
  perform public.mark_thread_read(ca);
  perform pg_temp.reset(); select count(*) into n from public.messages where client_id=ca and sender='coach' and read_at is not null; if n<>0 then bad:=bad||' [otro coach marcó leídos]'; end if;

  -- Cliente ve respuesta y la marca leída
  perform pg_temp.as_user(a);
  select public.unread_messages() into n; if n<>2 then bad:=bad||' [contador cliente '||n||']'; end if;
  perform public.mark_thread_read(null);
  select public.unread_messages() into n; if n<>0 then bad:=bad||' [cliente no pudo marcar leído]'; end if;

  -- PUSH
  if not pg_temp.try('select public.save_push_subscription(''https://push.example/a'',''pk'',''au'')') then bad:=bad||' [no guarda suscripción]'; end if;
  perform pg_temp.as_user(b);
  perform public.save_push_subscription('https://push.example/b','pk','au');
  perform pg_temp.as_user(jeff);
  perform public.save_push_subscription('https://push.example/jeff','pk','au');
  select count(*) into n from public.push_subscriptions; if n<>1 then bad:=bad||' [coach ve suscripciones ajenas: '||n||']'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try('insert into public.push_subscriptions values (''https://x'',''' || a || ''',''' || ws || ''',''k'',''a'')') then bad:=bad||' [insert directo push]'; end if;
  select count(*) into n from public.push_subscriptions; if n<>1 then bad:=bad||' [cliente ve suscripciones ajenas]'; end if;
  -- B envía un mensaje y pide destinatarios: solo el coach, una vez
  perform pg_temp.as_user(b);
  mid := public.send_message(null,'push test');
  select count(*) into n from public.push_targets(mid); if n<>1 then bad:=bad||' [destinatarios coach '||n||']'; end if;
  select count(*) into n from public.push_targets(mid); if n<>0 then bad:=bad||' [push repetido]'; end if;
  -- A no puede pedir destinatarios de un mensaje de B
  perform pg_temp.reset(); update public.messages set notified_at=null where id=mid;
  perform pg_temp.as_user(a);
  select count(*) into n from public.push_targets(mid); if n<>0 then bad:=bad||' [A obtuvo destinatarios de un mensaje de B]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.push_targets(mid); if n<>0 then bad:=bad||' [otro coach obtuvo destinatarios]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES MENSAJES: %', coalesce(nullif(bad,''),'ninguno');
end $$;
