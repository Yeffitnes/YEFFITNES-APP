-- 0029 · Mensajes de audio (solo el coach envía; el cliente los escucha). PROPUESTA: hasta 2 min.
-- Mismas reglas que el resto de mensajes: se borran 24 h después de que el cliente los escucha/lee (el archivo va a message_trash).
-- Revertir: drop function send_audio_message; quitar la columna audio_path, el bucket message-audio y sus políticas; recrear
-- _purge_client_messages y list_threads de 0028/0020 (ver CHANGELOG).

alter table public.messages add column audio_path text check (audio_path is null or length(audio_path) <= 300);
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%image_path IS NOT NULL%';
  if c is not null then execute format('alter table public.messages drop constraint %I', c); end if;
end $$;
alter table public.messages add constraint messages_has_content
  check (body is not null or image_path is not null or video_id is not null or youtube_id is not null or audio_path is not null);

alter table public.message_trash drop constraint message_trash_kind_check;
alter table public.message_trash add constraint message_trash_kind_check check (kind in ('image','video','audio'));

-- Archivos de audio: bucket privado. Ruta: <workspace>/<cliente>/<archivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('message-audio', 'message-audio', false, 5242880, array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac','audio/x-m4a'])
  on conflict (id) do nothing;
create policy "msgaudio: el coach sube a su espacio" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-audio' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach'
    and exists (select 1 from public.clients c where c.id::text = (storage.foldername(name))[2] and c.workspace_id = public.my_workspace()));
create policy "msgaudio: el coach ve y borra las de su espacio" on storage.objects for select to authenticated
  using (bucket_id = 'message-audio' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');
create policy "msgaudio: el coach borra las de su espacio" on storage.objects for delete to authenticated
  using (bucket_id = 'message-audio' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');
create policy "msgaudio: el cliente oye los de su hilo" on storage.objects for select to authenticated
  using (bucket_id = 'message-audio' and (storage.foldername(name))[2] = public.my_client_id()::text);

-- Envío: solo el coach, a un cliente de su espacio, con un archivo dentro de la carpeta de ese cliente.
create function public.send_audio_message(p_client uuid, p_audio text, p_body text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; mid uuid; b text := nullif(trim(coalesce(p_body, '')), '');
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select id into cid from clients where id = p_client and workspace_id = ws;
  if cid is null then raise exception 'not_found'; end if;
  if p_audio is null or p_audio not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_audio'; end if;
  if b is not null and length(b) > 2000 then raise exception 'too_long'; end if;
  insert into messages (workspace_id, client_id, sender, body, audio_path) values (ws, cid, 'coach', b, p_audio) returning id into mid;
  return mid;
end $$;
grant execute on function public.send_audio_message(uuid, text, text) to authenticated;

-- La limpieza ahora también anota los audios en la basura.
create or replace function public._purge_client_messages(p_client uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  with gone as (
    delete from messages where client_id = p_client
      and ((read_at is not null and read_at < now() - interval '24 hours') or created_at < now() - interval '30 days')
    returning workspace_id, image_path, video_id, audio_path)
  insert into message_trash (workspace_id, kind, ref)
    select workspace_id, 'image', image_path from gone where image_path is not null
    union all select workspace_id, 'video', video_id from gone where video_id is not null
    union all select workspace_id, 'audio', audio_path from gone where audio_path is not null;
end $$;

-- La bandeja del coach muestra "audio" como tipo del último mensaje.
create or replace function public.list_threads()
returns table (client_id uuid, full_name text, status text, last_sender text, last_body text, last_kind text, last_at timestamptz, unread bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, p.full_name, c.status, l.sender, l.body,
         case when l.video_id is not null or l.youtube_id is not null then 'video' when l.audio_path is not null then 'audio' when l.image_path is not null then 'image' else 'text' end,
         l.created_at, (select count(*) from messages m where m.client_id = c.id and m.sender = 'client' and m.read_at is null)
  from clients c
  join profiles p on p.id = c.profile_id
  join lateral (select m.* from messages m where m.client_id = c.id order by m.created_at desc limit 1) l on true
  where public.my_role() = 'coach' and c.workspace_id = public.my_workspace()
  order by l.created_at desc $$;
