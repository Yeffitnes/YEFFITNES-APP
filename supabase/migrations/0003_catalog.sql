-- Fase 2A: catálogo de ejercicios y plantillas de rutina. Solo el coach accede (por ahora).
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  name text not null,
  category text not null default 'other' check (category in ('upper','lower','core','cardio','other')),
  muscle_group text, equipment text,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  instructions text,
  video_provider text check (video_provider in ('youtube','bunny')),
  video_ref text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  name text not null, category text, est_minutes int check (est_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  template_id uuid not null references public.routine_templates on delete cascade,
  exercise_id uuid not null references public.exercises,
  position int not null, sets int not null check (sets > 0), reps text not null,
  rest_seconds int check (rest_seconds >= 0), notes text
);
create index on public.exercises (workspace_id, active);
create index on public.template_items (template_id, position);
alter table public.exercises enable row level security;
alter table public.routine_templates enable row level security;
alter table public.template_items enable row level security;
create policy ex_coach on public.exercises for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy rt_coach on public.routine_templates for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy ti_coach on public.template_items for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');

-- Un coach no es cliente: al promover un perfil a coach se borra su ficha de cliente.
create function public.drop_client_on_coach() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.role = 'coach' then delete from public.clients where profile_id = new.id; end if;
  return new;
end $$;
create trigger profile_became_coach after update of role on public.profiles for each row execute function public.drop_client_on_coach();
-- Limpieza única de lo ya existente:
delete from public.clients where profile_id in (select id from public.profiles where role = 'coach');
