-- 0035 · Material con vídeo PRIVADO (Bunny) y "vídeo del día" o "de la semana" en Hoy (decisión de Cristian, 27-oct).
-- Jeff elige YouTube o Privado al crear un vídeo. El privado se sube desde la app y solo lo ven los clientes cuyo plan incluye ese material.
-- Destacar un vídeo: como "vídeo del día" (se ve solo hoy) o "vídeo de la semana" (7 días). Los destacados viejos (sin fecha) siguen como estaban.
-- Además: un vídeo subido se considera huérfano a las 3 h (antes 30 min), para no borrar a mitad de camino los vídeos largos de Jeff.
-- Compatible con el código viejo de main: columnas nuevas opcionales; list_materials y open_material solo AGREGAN columnas;
--   set_featured_material conserva (p_id, p_on) y suma p_period con valor por defecto.
-- Revertir: ver CHANGELOG (recrear las funciones de 0013 y 0030/0033, quitar las columnas nuevas de materials y volver a poner client_id not null).

alter table public.video_uploads alter column client_id drop not null;   -- null = vídeo del coach para Material (no es de ningún cliente)

alter table public.materials
  add column video_id text unique references public.video_uploads(video_id) on delete set null,
  add column featured_period text not null default 'week' check (featured_period in ('day','week')),
  add column featured_until date;
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.materials'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%video_ref IS NOT NULL%';
  if c is not null then execute format('alter table public.materials drop constraint %I', c); end if;
end $$;
-- Un vídeo necesita YouTube o un vídeo privado; mientras se sube, queda como borrador sin fuente.
alter table public.materials add constraint materials_has_content check (
  (kind = 'video' and (video_ref is not null or video_id is not null or not published))
  or (kind = 'article' and body is not null and length(trim(body)) > 0));

create or replace function public._video_in_use(p_video text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_reports where video_id = p_video)
      or exists (select 1 from messages where video_id = p_video)
      or exists (select 1 from plan_days where video_id = p_video)
      or exists (select 1 from materials where video_id = p_video) $$;

create or replace function public.due_orphan_videos() returns table (video_id text) language sql stable security definer set search_path = public as $$
  select u.video_id from video_uploads u
  where public.my_role() = 'coach' and u.workspace_id = public.my_workspace()
    and u.created_at < now() - interval '3 hours' and not public._video_in_use(u.video_id)
  order by u.created_at limit 100 $$;
create or replace function public.due_orphan_videos_cron(p_secret text) returns table (video_id text) language sql stable security definer set search_path = public as $$
  select u.video_id from video_uploads u
  where public._cron_ok(p_secret) and u.created_at < now() - interval '3 hours' and not public._video_in_use(u.video_id)
  order by u.created_at limit 200 $$;

-- El servidor la llama justo después de crear el vídeo en Bunny (purpose "material"). Solo el coach.
create function public.register_material_video(p_video_id text) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if (select count(*) from video_uploads where workspace_id = ws and client_id is null and created_at > now() - interval '1 day') >= 30 then raise exception 'too_many'; end if;
  insert into video_uploads (video_id, workspace_id, client_id) values (p_video_id, ws, null);
end $$;

-- Al terminar la subida: el vídeo queda en el material y, si Jeff lo pidió, se publica.
create function public.attach_material_video(p_material uuid, p_video text, p_publish boolean) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from video_uploads u where u.video_id = p_video and u.workspace_id = ws and u.client_id is null) then raise exception 'unknown_video'; end if;
  update materials set video_id = p_video, video_ref = null, published = coalesce(p_publish, published) where id = p_material and workspace_id = ws and kind = 'video';
  if not found then raise exception 'not_found'; end if;
end $$;

-- Vídeo privado de un material: el cliente activo cuyo plan lo incluye, o el coach del espacio. Si no, nada.
create function public.material_video(p_id uuid) returns text language plpgsql stable security definer set search_path = public as $$
declare m record;
begin
  select * into m from materials where id = p_id and workspace_id = public.my_workspace();
  if m.id is null or m.video_id is null then return null; end if;
  if public.my_role() = 'coach' then return m.video_id; end if;
  if public.my_role() = 'client' and m.published and public.material_unlocked(m.tier)
     and exists (select 1 from clients c where c.id = public.my_client_id() and c.status = 'active') then return m.video_id; end if;
  return null;
end $$;

-- Destacado vigente (hora de Bogotá): sin fecha = como antes (sin vencimiento).
create function public._featured_now(m public.materials) returns boolean language sql stable set search_path = public as $$
  select m.is_featured and (m.featured_until is null or m.featured_until >= (now() at time zone 'America/Bogota')::date) $$;

drop function public.list_materials();
create function public.list_materials()
returns table (id uuid, kind text, title text, category text, tier text, published_on date, is_featured boolean, unlocked boolean, is_new boolean, featured_period text, private_video boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.kind, m.title, m.category, m.tier, m.published_on, public._featured_now(m), public.material_unlocked(m.tier),
    (not exists (select 1 from material_views v where v.material_id = m.id and v.client_id = public.my_client_id()) and m.published_on >= current_date - 14),
    m.featured_period, m.video_id is not null
  from materials m
  where public.my_role() = 'client' and exists (select 1 from clients c where c.profile_id = auth.uid() and c.status = 'active')
    and m.workspace_id = public.my_workspace() and m.published and (m.kind = 'article' or m.video_ref is not null or m.video_id is not null)
  order by m.published_on desc, m.created_at desc $$;

drop function public.open_material(uuid);
create function public.open_material(p_id uuid)
returns table (id uuid, kind text, title text, category text, body text, video_ref text, published_on date, private_video boolean)
language plpgsql security definer set search_path = public as $$
declare m record; cid uuid := public.my_client_id();
begin
  if cid is null or not exists (select 1 from clients c where c.id = cid and c.status = 'active') then raise exception 'not_allowed'; end if;
  select * into m from materials mm where mm.id = p_id and mm.workspace_id = public.my_workspace() and mm.published;
  if m.id is null then raise exception 'not_found'; end if;
  if not public.material_unlocked(m.tier) then raise exception 'locked'; end if;
  insert into material_views as mv (material_id, client_id, workspace_id) values (m.id, cid, m.workspace_id) on conflict do nothing;
  return query select m.id, m.kind, m.title, m.category, m.body, m.video_ref, m.published_on, m.video_id is not null;
end $$;

drop function public.set_featured_material(uuid, boolean);
create function public.set_featured_material(p_id uuid, p_on boolean, p_period text default 'week') returns void
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); today date := (now() at time zone 'America/Bogota')::date;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_period not in ('day','week') then raise exception 'bad_period'; end if;
  update materials set is_featured = false where workspace_id = ws and is_featured;
  if p_on then
    update materials set is_featured = true, featured_period = p_period, featured_until = case p_period when 'day' then today else today + 6 end
      where id = p_id and workspace_id = ws and kind = 'video' and tier = 'basic' and published and (video_ref is not null or video_id is not null);
    if not found then raise exception 'not_featurable'; end if;
  end if;
end $$;

grant execute on function public.register_material_video(text), public.attach_material_video(uuid, text, boolean), public.material_video(uuid),
  public.list_materials(), public.open_material(uuid), public.set_featured_material(uuid, boolean, text) to authenticated;
