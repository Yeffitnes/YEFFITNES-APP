-- Mensajes dentro de la app (sustituyen a WhatsApp). NO es un chat en vivo: es una bandeja entre cada cliente y su coach.
-- Texto + foto (Storage privado) + vídeo (Bunny, privado) o enlace de YouTube (solo el coach). Nadie escribe directo en la tabla: solo con send_message().
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,     -- el hilo pertenece al cliente
  sender text not null check (sender in ('client','coach')),
  body text check (body is null or length(body) <= 2000),
  image_path text check (image_path is null or length(image_path) <= 300),
  video_id text unique references public.video_uploads(video_id),
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  read_at timestamptz,                    -- cuándo lo vio la otra parte
  notified_at timestamptz,                -- ya se envió la notificación push (evita repetirla)
  created_at timestamptz not null default now(),
  check (body is not null or image_path is not null or video_id is not null or youtube_id is not null)
);
create index on public.messages (client_id, created_at desc);
create index on public.messages (workspace_id, sender, created_at desc) where read_at is null;
alter table public.messages enable row level security;
create policy msg_coach_read on public.messages for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
create policy msg_client_read on public.messages for select using (client_id = public.my_client_id());
-- Sin políticas de insert/update/delete: solo las funciones de abajo.

create function public.send_message(p_client uuid, p_body text default null, p_image text default null, p_video text default null, p_youtube text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r text := public.my_role(); ws uuid := public.my_workspace(); cid uuid; snd text; st text; b text := nullif(trim(coalesce(p_body, '')), ''); mid uuid;
begin
  if r = 'client' then
    cid := public.my_client_id(); snd := 'client';
    select status into st from clients where id = cid;
    if st is null or st not in ('pending','active') then raise exception 'not_allowed'; end if;
    if st = 'pending' and (p_image is not null or p_video is not null) then raise exception 'not_allowed'; end if;   -- sin plan: solo texto
    if p_youtube is not null then raise exception 'not_allowed'; end if;
    if (select count(*) from messages where client_id = cid and sender = 'client' and created_at > now() - interval '1 hour') >= 40 then raise exception 'too_many'; end if;
  elsif r = 'coach' then
    snd := 'coach';
    select id into cid from clients where id = p_client and workspace_id = ws;
    if cid is null then raise exception 'not_found'; end if;
  else raise exception 'not_allowed'; end if;
  if b is not null and length(b) > 2000 then raise exception 'too_long'; end if;
  if p_image is not null and p_image not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_image'; end if;
  if p_video is not null and not exists (select 1 from video_uploads u where u.video_id = p_video and u.client_id = cid and u.workspace_id = ws) then raise exception 'unknown_video'; end if;
  if b is null and p_image is null and p_video is null and p_youtube is null then raise exception 'empty'; end if;
  insert into messages (workspace_id, client_id, sender, body, image_path, video_id, youtube_id)
  values (ws, cid, snd, b, p_image, p_video, p_youtube) returning id into mid;
  return mid;
end $$;

-- Permiso para subir UN vídeo a un mensaje (lo llama el servidor justo después de crear el vídeo en Bunny).
create function public.register_message_video(p_video_id text, p_client uuid default null) returns void language plpgsql security definer set search_path = public as $$
declare r text := public.my_role(); cid uuid; ws uuid := public.my_workspace();
begin
  if r = 'client' then
    cid := public.my_client_id();
    if not exists (select 1 from clients where id = cid and status = 'active') then raise exception 'not_allowed'; end if;
    if (select count(*) from video_uploads where client_id = cid and created_at > now() - interval '1 day') >= 12 then raise exception 'too_many'; end if;
  elsif r = 'coach' then
    select id into cid from clients where id = p_client and workspace_id = ws;
    if cid is null then raise exception 'not_found'; end if;
    if (select count(*) from video_uploads where workspace_id = ws and created_at > now() - interval '1 day') >= 60 then raise exception 'too_many'; end if;
  else raise exception 'not_allowed'; end if;
  insert into video_uploads (video_id, workspace_id, client_id) values (p_video_id, ws, cid);
end $$;

-- Bandeja del coach: un renglón por cliente con su último mensaje y cuántos le faltan por leer.
create function public.list_threads()
returns table (client_id uuid, full_name text, status text, last_sender text, last_body text, last_kind text, last_at timestamptz, unread bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, p.full_name, c.status, l.sender, l.body,
         case when l.video_id is not null or l.youtube_id is not null then 'video' when l.image_path is not null then 'image' else 'text' end,
         l.created_at, (select count(*) from messages m where m.client_id = c.id and m.sender = 'client' and m.read_at is null)
  from clients c
  join profiles p on p.id = c.profile_id
  join lateral (select m.* from messages m where m.client_id = c.id order by m.created_at desc limit 1) l on true
  where public.my_role() = 'coach' and c.workspace_id = public.my_workspace()
  order by l.created_at desc $$;

-- Cuántos mensajes sin leer tiene quien pregunta (cliente: de su coach; coach: de todos sus clientes).
create function public.unread_messages() returns bigint language sql stable security invoker set search_path = public as $$
  select case public.my_role()
    when 'client' then (select count(*) from messages where client_id = public.my_client_id() and sender = 'coach' and read_at is null)
    when 'coach' then (select count(*) from messages where workspace_id = public.my_workspace() and sender = 'client' and read_at is null)
    else 0 end $$;

create function public.mark_thread_read(p_client uuid default null) returns void language plpgsql security definer set search_path = public as $$
declare r text := public.my_role();
begin
  if r = 'client' then
    update messages set read_at = now() where client_id = public.my_client_id() and sender = 'coach' and read_at is null;
  elsif r = 'coach' then
    update messages set read_at = now() where client_id = p_client and workspace_id = public.my_workspace() and sender = 'client' and read_at is null;
  end if;
end $$;

-- Fotos de mensajes: bucket privado. Ruta: <workspace>/<cliente>/<archivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('message-images', 'message-images', false, 5242880, array['image/jpeg','image/webp','image/png']) on conflict (id) do nothing;
create policy "msgimg: el cliente activo sube a su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-images' and (storage.foldername(name))[1] = public.my_workspace()::text
    and (storage.foldername(name))[2] = public.my_client_id()::text
    and exists (select 1 from public.clients c where c.id = public.my_client_id() and c.status = 'active'));
create policy "msgimg: el cliente ve las de su hilo" on storage.objects for select to authenticated
  using (bucket_id = 'message-images' and (storage.foldername(name))[2] = public.my_client_id()::text);
create policy "msgimg: el coach sube y ve las de su espacio" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-images' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach'
    and exists (select 1 from public.clients c where c.id::text = (storage.foldername(name))[2] and c.workspace_id = public.my_workspace()));
create policy "msgimg: el coach ve las de su espacio" on storage.objects for select to authenticated
  using (bucket_id = 'message-images' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');

-- Tiempo real: el mensaje aparece al instante (RLS también aplica aquí). En la base local de pruebas no existe la publicación.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then alter publication supabase_realtime add table public.messages; end if;
end $$;
