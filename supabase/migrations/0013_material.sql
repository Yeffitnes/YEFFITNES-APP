-- Material educativo: artículos y vídeos de YouTube que publica Jeff. (Documentos PDF: pendiente.)
-- El contenido de lo que el plan NO incluye jamás sale de la base: el cliente lista (título visible, bloqueado) y abre por funciones.
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  kind text not null check (kind in ('video','article')),
  title text not null check (length(trim(title)) > 0),
  category text not null default 'Técnica',
  body text, video_ref text,
  tier text not null default 'basic' check (tier in ('basic','full')),  -- basic: planes con 'education_basic'; full: solo con 'education_full'
  is_featured boolean not null default false,
  published boolean not null default true,
  published_on date not null default current_date,
  created_at timestamptz not null default now(),
  check ((kind = 'video' and video_ref is not null) or (kind = 'article' and body is not null and length(trim(body)) > 0))
);
create unique index one_featured_material on public.materials (workspace_id) where is_featured;
create table public.material_views (
  material_id uuid not null references public.materials on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  workspace_id uuid not null references public.workspaces,
  viewed_at timestamptz not null default now(),
  primary key (material_id, client_id)
);
create index on public.materials (workspace_id, published_on desc);
alter table public.materials enable row level security;
alter table public.material_views enable row level security;
create policy mat_coach on public.materials for all using (workspace_id = public.my_workspace() and public.my_role()='coach') with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy mv_coach on public.material_views for select using (workspace_id = public.my_workspace() and public.my_role()='coach');
-- Sin políticas para el cliente: no lee ni escribe estas tablas directamente.

create function public.material_unlocked(p_tier text) returns boolean language sql stable security definer set search_path = public
as $$ select case p_tier when 'basic' then public.client_has_feature('education_basic') when 'full' then public.client_has_feature('education_full') else false end $$;

create function public.list_materials()
returns table (id uuid, kind text, title text, category text, tier text, published_on date, is_featured boolean, unlocked boolean, is_new boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.kind, m.title, m.category, m.tier, m.published_on, m.is_featured, public.material_unlocked(m.tier),
    (not exists (select 1 from material_views v where v.material_id = m.id and v.client_id = public.my_client_id()) and m.published_on >= current_date - 14)
  from materials m
  where public.my_role() = 'client' and exists (select 1 from clients c where c.profile_id = auth.uid() and c.status = 'active')
    and m.workspace_id = public.my_workspace() and m.published
  order by m.published_on desc, m.created_at desc $$;

create function public.open_material(p_id uuid)
returns table (id uuid, kind text, title text, category text, body text, video_ref text, published_on date)
language plpgsql security definer set search_path = public as $$
declare m record; cid uuid := public.my_client_id();
begin
  if cid is null or not exists (select 1 from clients c where c.id = cid and c.status = 'active') then raise exception 'not_allowed'; end if;
  select * into m from materials mm where mm.id = p_id and mm.workspace_id = public.my_workspace() and mm.published;
  if m.id is null then raise exception 'not_found'; end if;
  if not public.material_unlocked(m.tier) then raise exception 'locked'; end if;
  insert into material_views as mv (material_id, client_id, workspace_id) values (m.id, cid, m.workspace_id) on conflict do nothing;
  return query select m.id, m.kind, m.title, m.category, m.body, m.video_ref, m.published_on;
end $$;

-- Un solo "vídeo de la semana" por espacio; debe ser un vídeo publicado y de acceso básico (lo ven todos).
create function public.set_featured_material(p_id uuid, p_on boolean) returns void
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update materials set is_featured = false where workspace_id = ws and is_featured;
  if p_on then
    update materials set is_featured = true where id = p_id and workspace_id = ws and kind = 'video' and tier = 'basic' and published;
    if not found then raise exception 'not_featurable'; end if;
  end if;
end $$;
