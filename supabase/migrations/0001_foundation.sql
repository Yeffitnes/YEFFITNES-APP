-- Fase 1A: espacios (coaches), perfiles, planes y clientes. RLS desde el día 1.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  primary_color text default '#F7254B',
  whatsapp text,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  workspace_id uuid not null references public.workspaces,
  role text not null default 'client' check (role in ('coach','client')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  name text not null,
  features text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  profile_id uuid unique not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','paused')),
  plan_id uuid references public.plans,
  image_consent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.clients (workspace_id, status);

-- Ayudantes (security definer para evitar recursión en RLS)
create function public.my_workspace() returns uuid language sql stable security definer set search_path = public
as $$ select workspace_id from public.profiles where id = auth.uid() $$;
create function public.my_role() returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

-- Alta automática: perfil de CLIENTE + cliente PENDIENTE. El rol NUNCA viene del navegador.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$
declare ws uuid;
begin
  select id into ws from public.workspaces order by created_at limit 1;
  if ws is null then return new; end if;
  insert into public.profiles (id, workspace_id, role, full_name)
    values (new.id, ws, 'client', coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.clients (workspace_id, profile_id) values (ws, new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.clients enable row level security;

create policy ws_read on public.workspaces for select using (id = public.my_workspace());
create policy ws_coach_update on public.workspaces for update using (id = public.my_workspace() and public.my_role()='coach');

create policy prof_read_own on public.profiles for select using (id = auth.uid());
create policy prof_read_coach on public.profiles for select using (workspace_id = public.my_workspace() and public.my_role()='coach');
-- Sin política de UPDATE para clientes: nadie puede cambiarse el rol.

create policy plans_read on public.plans for select using (workspace_id = public.my_workspace());
create policy plans_coach_write on public.plans for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');

create policy cli_read_own on public.clients for select using (profile_id = auth.uid());
create policy cli_coach_all on public.clients for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');

-- DATOS INICIALES (ejecutar una vez, editando el WhatsApp):
-- insert into public.workspaces (slug, name, whatsapp) values ('yeffitnes','YEFFITNES TRAINING','57XXXXXXXXXX');
-- Luego Jeff se registra en /login y se le da el rol de coach con:
-- update public.profiles set role='coach' where id = (select id from auth.users where email='CORREO_DE_JEFF');
