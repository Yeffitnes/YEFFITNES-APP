-- Anuncios a todos (se ven en "Hoy" de cada cliente activo con la función 'announcements' en su plan) y notas privadas del coach por cliente.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  title text check (title is null or length(title) <= 120),
  body text not null check (length(trim(body)) > 0 and length(body) <= 1000),
  pinned boolean not null default false,
  expires_on date,                       -- nulo = no vence
  created_at timestamptz not null default now()
);
create index on public.announcements (workspace_id, created_at desc);
alter table public.announcements enable row level security;
create policy ann_coach on public.announcements for all
  using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach');
-- Sin políticas para el cliente: lee SOLO por list_announcements() (valida cuenta activa y plan).

create function public.list_announcements()
returns table (id uuid, title text, body text, pinned boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.body, a.pinned, a.created_at
  from announcements a
  where public.my_role() = 'client'
    and exists (select 1 from clients c where c.id = public.my_client_id() and c.status = 'active')
    and public.client_has_feature('announcements')
    and a.workspace_id = public.my_workspace()
    and (a.expires_on is null or a.expires_on >= current_date)
  order by a.pinned desc, a.created_at desc
  limit 5 $$;

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index on public.client_notes (client_id, created_at desc);
alter table public.client_notes enable row level security;
-- Solo el coach del espacio, y la nota debe apuntar a un cliente de SU espacio.
create policy notes_coach on public.client_notes for all
  using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach'
    and exists (select 1 from public.clients c where c.id = client_id and c.workspace_id = public.my_workspace()));
-- El cliente no tiene ninguna política: nunca ve ni escribe notas.
