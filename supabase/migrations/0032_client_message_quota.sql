-- 0032 · Mensajes del cliente con cupo diario (decisión de Cristian, 27-oct): que no se vuelva un chat.
-- Cliente, por día (hora de Bogotá): máx. 3 mensajes de texto, 1 foto y 1 vídeo. Nunca audio (eso ya lo impedía 0029). Máx. 600 caracteres.
-- Se quita el límite anterior de "3 sin leer" y "12 al día". El coach escribe sin límite. El reporte diario va aparte y no cuenta aquí.
-- Un mensaje con foto cuenta como la foto del día (no como texto); igual con el vídeo.
-- Compatible con el código viejo de main: misma firma de send_message; los errores nuevos caen en su texto genérico.
-- Revertir: volver a ejecutar el bloque "send_message" de 0028_messages_board.sql.

create or replace function public.send_message(p_client uuid, p_body text default null, p_image text default null, p_video text default null, p_youtube text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r text := public.my_role(); ws uuid := public.my_workspace(); cid uuid; snd text; st text; b text := nullif(trim(coalesce(p_body, '')), ''); mid uuid;
  day_start timestamptz := (date_trunc('day', now() at time zone 'America/Bogota')) at time zone 'America/Bogota';
begin
  if r = 'client' then
    cid := public.my_client_id(); snd := 'client';
    select status into st from clients where id = cid;
    if st is null or st not in ('pending','active') then raise exception 'not_allowed'; end if;
    if st = 'pending' and (p_image is not null or p_video is not null) then raise exception 'not_allowed'; end if;   -- sin plan: solo texto
    if p_youtube is not null then raise exception 'not_allowed'; end if;
    perform public._purge_client_messages(cid);
    if b is not null and length(b) > 600 then raise exception 'too_long'; end if;
    if p_video is not null then
      if (select count(*) from messages where client_id = cid and sender = 'client' and created_at >= day_start and video_id is not null) >= 1 then raise exception 'limit_video'; end if;
    elsif p_image is not null then
      if (select count(*) from messages where client_id = cid and sender = 'client' and created_at >= day_start and image_path is not null) >= 1 then raise exception 'limit_image'; end if;
    else
      if (select count(*) from messages where client_id = cid and sender = 'client' and created_at >= day_start and image_path is null and video_id is null) >= 3 then raise exception 'limit_text'; end if;
    end if;
  elsif r = 'coach' then
    snd := 'coach';
    select id into cid from clients where id = p_client and workspace_id = ws;
    if cid is null then raise exception 'not_found'; end if;
  else raise exception 'not_allowed'; end if;
  if p_image is not null and p_video is not null then raise exception 'one_attachment'; end if;
  if b is not null and length(b) > 2000 then raise exception 'too_long'; end if;
  if p_image is not null and p_image not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_image'; end if;
  if p_video is not null and not exists (select 1 from video_uploads u where u.video_id = p_video and u.client_id = cid and u.workspace_id = ws) then raise exception 'unknown_video'; end if;
  if b is null and p_image is null and p_video is null and p_youtube is null then raise exception 'empty'; end if;
  insert into messages (workspace_id, client_id, sender, body, image_path, video_id, youtube_id)
  values (ws, cid, snd, b, p_image, p_video, p_youtube) returning id into mid;
  return mid;
end $$;
