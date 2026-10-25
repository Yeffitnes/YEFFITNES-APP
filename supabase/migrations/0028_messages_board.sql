-- 0028 · Mensajes que NO son un chat: límites de envío, borrado automático tras leerlos y basura de archivos.
-- Reglas (PROPUESTA, confirmar con Jeff): el cliente puede tener como máximo 3 mensajes sin leer por su coach y 12 al día;
-- cada mensaje del cliente ≤ 600 caracteres. Un mensaje se borra 24 h después de que la otra persona lo lee (y a los 30 días si nadie lo lee).
-- Al borrar, las fotos/vídeos se anotan en message_trash y el coach los elimina de Storage/Bunny al abrir Mensajes.
-- Revertir: ver CHANGELOG (recrear send_message de 0020, drop de las funciones y la tabla de este archivo y de la política de borrado).

create table public.message_trash (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  kind text not null check (kind in ('image','video')),
  ref text not null,
  created_at timestamptz not null default now()
);
create index on public.message_trash (workspace_id, created_at);
alter table public.message_trash enable row level security;   -- sin políticas: solo funciones

-- Borra los mensajes de UN cliente que ya cumplieron (leídos hace más de 24 h, o sin leer hace más de 30 días).
create function public._purge_client_messages(p_client uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  with gone as (
    delete from messages where client_id = p_client
      and ((read_at is not null and read_at < now() - interval '24 hours') or created_at < now() - interval '30 days')
    returning workspace_id, image_path, video_id)
  insert into message_trash (workspace_id, kind, ref)
    select workspace_id, 'image', image_path from gone where image_path is not null
    union all select workspace_id, 'video', video_id from gone where video_id is not null;
end $$;
revoke all on function public._purge_client_messages(uuid) from public, anon, authenticated;

-- Limpieza de todo el espacio del coach (se llama al abrir la bandeja).
create function public.purge_messages() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  for r in select distinct client_id from messages where workspace_id = public.my_workspace()
           and ((read_at is not null and read_at < now() - interval '24 hours') or created_at < now() - interval '30 days') loop
    perform public._purge_client_messages(r.client_id);
  end loop;
end $$;
create function public.due_message_trash() returns table (id uuid, kind text, ref text) language sql stable security definer set search_path = public as $$
  select t.id, t.kind, t.ref from message_trash t where public.my_role() = 'coach' and t.workspace_id = public.my_workspace() order by t.created_at limit 100 $$;
create function public.clear_message_trash(p_ids uuid[]) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  delete from message_trash where id = any(p_ids) and workspace_id = public.my_workspace();
end $$;
create policy "msgimg: el coach borra las de su espacio" on storage.objects for delete to authenticated
  using (bucket_id = 'message-images' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');

-- send_message con las reglas nuevas (solo cambian las del cliente).
create or replace function public.send_message(p_client uuid, p_body text default null, p_image text default null, p_video text default null, p_youtube text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r text := public.my_role(); ws uuid := public.my_workspace(); cid uuid; snd text; st text; b text := nullif(trim(coalesce(p_body, '')), ''); mid uuid;
begin
  if r = 'client' then
    cid := public.my_client_id(); snd := 'client';
    select status into st from clients where id = cid;
    if st is null or st not in ('pending','active') then raise exception 'not_allowed'; end if;
    if st = 'pending' and (p_image is not null or p_video is not null) then raise exception 'not_allowed'; end if;   -- sin plan: solo texto
    if p_youtube is not null then raise exception 'not_allowed'; end if;
    perform public._purge_client_messages(cid);
    if b is not null and length(b) > 600 then raise exception 'too_long'; end if;
    if (select count(*) from messages where client_id = cid and sender = 'client' and read_at is null) >= 3 then raise exception 'wait_reply'; end if;
    if (select count(*) from messages where client_id = cid and sender = 'client' and created_at > now() - interval '24 hours') >= 12 then raise exception 'too_many'; end if;
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

grant execute on function public.purge_messages(), public.due_message_trash(), public.clear_message_trash(uuid[]) to authenticated;
