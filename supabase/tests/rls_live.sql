-- Pruebas de ataque de 0041: respuesta con foto/vídeo, cancelar en 10 min, destacados por tipo, portada, panel de atención y arranque.
-- Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; lg uuid; sl uuid; sl2 uuid; bk uuid; m1 uuid; m2 uuid; pd uuid; n int; t text; j jsonb; bad text:='';
  today date := (now() at time zone 'America/Bogota')::date;
  img_a text; img_b text; vid_a text := 'f0000041-0000-0000-0000-00000000000a'; vid_b text := 'f0000041-0000-0000-0000-00000000000b';
  poster text := 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD=';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  update public.clients set status='active' where id in (ca, cb);
  img_a := ws||'/'||ca||'/foto.jpg'; img_b := ws||'/'||cb||'/foto.jpg';
  insert into public.video_uploads (video_id, workspace_id, client_id) values (vid_a, ws, ca), (vid_b, ws, cb) on conflict do nothing;

  -- 1) Respuesta con foto y vídeo: solo el coach, solo archivos de ESE cliente; el cliente no puede escribirlos
  delete from public.workout_logs where client_id = ca and log_date = today - 2;
  insert into public.workout_logs (workspace_id, client_id, log_date, completed_at) values (ws, ca, today - 2, now()) returning id into lg;
  perform pg_temp.as_user(jeff);
  if pg_temp.try(format('select public.review_workout(%L, %L, null, %L, null, true)', lg, 'Mira', img_b)) then bad:=bad||' [foto de otro cliente aceptada]'; end if;
  if pg_temp.try(format('select public.review_workout(%L, %L, null, null, %L, true)', lg, 'Mira', vid_b)) then bad:=bad||' [vídeo de otro cliente aceptado]'; end if;
  if not pg_temp.try(format('select public.review_workout(%L, %L, null, %L, %L, true)', lg, 'Corrige la espalda', img_a, vid_a)) then bad:=bad||' [Jeff no pudo responder con foto y vídeo]'; end if;
  -- código viejo (3 argumentos): no borra la foto ni el vídeo
  if not pg_temp.try(format('select public.review_workout(%L, %L, null)', lg, 'Texto nuevo')) then bad:=bad||' [la llamada vieja de 3 argumentos falló]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.workout_logs where id=lg and coach_comment_image=img_a and coach_comment_video=vid_a and coach_comment='Texto nuevo'; if n<>1 then bad:=bad||' [la llamada vieja borró lo adjunto]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try(format('select public.review_workout(%L, %L, null, null, null, true)', lg, 'x')) then bad:=bad||' [otro coach respondió]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.review_workout(%L, %L, null, null, null, true)', lg, 'x')) then bad:=bad||' [el cliente usó review_workout]'; end if;
  update public.workout_logs set coach_comment_image = null, coach_comment_video = null where id = lg;
  perform pg_temp.reset();
  select count(*) into n from public.workout_logs where id=lg and coach_comment_image=img_a and coach_comment_video=vid_a; if n<>1 then bad:=bad||' [el cliente borró lo adjunto del coach]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('insert into public.workout_logs (workspace_id, client_id, log_date, coach_comment_image) values (%L, %L, %L, %L)', ws, ca, today - 40, img_a)) then
    perform pg_temp.reset(); select count(*) into n from public.workout_logs where client_id=ca and log_date=today-40 and coach_comment_image is not null; if n<>0 then bad:=bad||' [el cliente creó un log con foto del coach]'; end if;
  end if;
  perform pg_temp.as_user(b);
  select count(*) into n from public.workout_logs where id = lg; if n<>0 then bad:=bad||' [B ve la respuesta de A]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.workout_logs where coach_comment_video = vid_a; if n<>1 then bad:=bad||' [no quedó el vídeo]'; end if;
  if not exists (select 1 from public.workout_logs where coach_comment_video = vid_a) or (select public._video_in_use(vid_a)) is not true then bad:=bad||' [el vídeo de la respuesta no cuenta como en uso]'; end if;
  -- limpieza a los 7 días: lo adjunto se va (a la basura), el texto queda
  perform pg_temp.as_user(jeff);   -- (el disparador solo deja al coach tocar coach_seen_at)
  update public.workout_logs set coach_seen_at = now() - interval '8 days' where id = lg;
  perform public.purge_messages(); perform pg_temp.reset();
  select count(*) into n from public.workout_logs where id=lg and coach_comment_image is null and coach_comment_video is null and coach_comment='Texto nuevo'; if n<>1 then bad:=bad||' [no limpió lo adjunto vencido]'; end if;
  select count(*) into n from public.message_trash where ref in (img_a, vid_a); if n<2 then bad:=bad||' [lo adjunto vencido no fue a la basura]'; end if;

  -- 2) Cancelar: el cliente solo en 10 min y solo lo que reservó él; el coach siempre; motivo solo del coach
  update public.bookings set status='cancelled' where client_id = ca and status='confirmed';
  insert into public.availability_slots (workspace_id, starts_at) values (ws, now() + interval '5 days 11 minutes') returning id into sl;
  insert into public.availability_slots (workspace_id, starts_at) values (ws, now() + interval '6 days 13 minutes') returning id into sl2;
  perform pg_temp.as_user(a);
  bk := public.book_slot(sl);
  if not pg_temp.try(format('select public.cancel_booking(%L, %L)', bk, 'motivo del cliente')) then bad:=bad||' [no pudo cancelar dentro de los 10 min]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.bookings where id=bk and status='cancelled' and cancel_reason is null; if n<>1 then bad:=bad||' [el cliente dejó motivo o no canceló]'; end if;
  perform pg_temp.as_user(a);
  bk := public.book_slot(sl);
  perform pg_temp.reset(); update public.bookings set created_at = now() - interval '11 minutes' where id = bk;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.cancel_booking(%L)', bk)) then bad:=bad||' [canceló pasados los 10 min]'; end if;
  perform pg_temp.as_user(b);
  if pg_temp.try(format('select public.cancel_booking(%L)', bk)) then bad:=bad||' [B canceló la reserva de A]'; end if;
  perform pg_temp.as_user(o);
  if pg_temp.try(format('select public.cancel_booking(%L)', bk)) then bad:=bad||' [otro coach canceló]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.try(format('select public.cancel_booking(%L, %L)', bk, 'Me surgió un imprevisto')) then bad:=bad||' [Jeff no pudo cancelar]'; end if;
  perform pg_temp.reset();
  select count(*) into n from public.bookings where id=bk and cancel_reason='Me surgió un imprevisto' and cancelled_by='coach'; if n<>1 then bad:=bad||' [no quedó el motivo de Jeff]'; end if;
  -- la que reservó Jeff no la cancela el cliente, ni siquiera en los primeros 10 min
  perform pg_temp.as_user(jeff); bk := public.coach_book_slot(sl2, ca);
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.cancel_booking(%L)', bk)) then bad:=bad||' [el cliente canceló una sesión que agendó Jeff]'; end if;
  -- aviso de cancelación: no para una sesión que ya pasó
  perform pg_temp.reset();
  insert into public.push_subscriptions values ('https://push.example/a-live', a, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  update public.availability_slots set starts_at = now() - interval '2 hours' where id = sl2;
  perform pg_temp.as_user(jeff); perform public.cancel_booking(bk);
  select count(*) into n from public.booking_cancel_targets(bk); if n<>0 then bad:=bad||' [avisó la cancelación de una sesión que ya pasó]'; end if;
  perform pg_temp.reset();

  -- 3) Destacados: día y semana a la vez; el cliente no destaca; la portada solo con formato de imagen
  perform pg_temp.as_user(jeff);
  insert into public.materials (workspace_id, kind, title, category, video_ref, tier, published) values (ws, 'video', 'Día', 'Motivación', 'abcdefghijk', 'basic', true) returning id into m1;
  insert into public.materials (workspace_id, kind, title, category, video_ref, tier, published) values (ws, 'video', 'Semana', 'Motivación', 'abcdefghijl', 'basic', true) returning id into m2;
  perform public.set_featured_material(m2, true, 'week'); perform public.set_featured_material(m1, true, 'day');
  select count(*) into n from public.materials where workspace_id=ws and is_featured; if n<>2 then bad:=bad||' [el del día quitó el de la semana]'; end if;
  if pg_temp.try(format('update public.materials set poster = %L where id = %L', 'javascript:alert(1)', m1)) then bad:=bad||' [portada con formato no permitido]'; end if;
  if not pg_temp.try(format('update public.materials set poster = %L where id = %L', poster, m1)) then bad:=bad||' [Jeff no pudo guardar la portada]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('select public.set_featured_material(%L, false)', m1)) then bad:=bad||' [el cliente quitó un destacado]'; end if;
  update public.materials set poster = null where id = m1; get diagnostics n = row_count; if n<>0 then bad:=bad||' [el cliente cambió la portada]'; end if;
  select pd2.id into pd from public.plan_days pd2 limit 1;
  if pd is not null then update public.plan_days set video_poster = poster where id = pd; get diagnostics n = row_count; if n<>0 then bad:=bad||' [el cliente cambió la portada de su rutina]'; end if; end if;

  -- 4) Panel de atención: solo el coach, solo su espacio
  perform pg_temp.as_user(a);
  select count(*) into n from public.coach_attention(); if n<>0 then bad:=bad||' [el cliente leyó el panel de atención]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.coach_attention() x where x.client_id in (ca, cb); if n<>0 then bad:=bad||' [otro coach vio clientes ajenos]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.coach_attention() x where x.client_id in (ca, cb); if n<>2 then bad:=bad||' [Jeff no ve a sus clientes en el panel]'; end if;

  -- 5) Arranque del portal: cada uno solo lo suyo
  perform pg_temp.as_user(a);
  j := public.portal_boot();
  if (j->'client'->>'id')::uuid is distinct from ca then bad:=bad||' [portal_boot no devolvió la ficha propia]'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(j->'logs','[]')) x where (x->>'id')::uuid in (select id from public.workout_logs where client_id <> ca)) then bad:=bad||' [portal_boot devolvió registros ajenos]'; end if;
  perform pg_temp.reset();
  if public.portal_boot() is not null then bad:=bad||' [portal_boot respondió sin sesión]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES VIVO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
