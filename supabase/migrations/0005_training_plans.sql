-- Entrenamiento por días: plan de entrenamiento de un cliente -> días (lun-dom) -> ejercicios (copiados de una plantilla).
create function public.my_client_id() returns uuid language sql stable security definer set search_path = public
as $$ select id from public.clients where profile_id = auth.uid() $$;

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','finished')),
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now()
);
create unique index one_active_plan_per_client on public.training_plans (client_id) where status = 'active';
create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  plan_id uuid not null references public.training_plans on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  name text not null,
  source_template_id uuid references public.routine_templates on delete set null,
  unique (plan_id, weekday)
);
create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  plan_day_id uuid not null references public.plan_days on delete cascade,
  exercise_id uuid not null references public.exercises,
  position int not null, sets int not null check (sets > 0), reps text not null,
  rest_seconds int check (rest_seconds >= 0),
  target_weight numeric(6,2) check (target_weight >= 0),
  notes text
);
create index on public.plan_days (plan_id);
create index on public.plan_items (plan_day_id, position);
create index on public.training_plans (client_id, status);

alter table public.training_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_items enable row level security;
create policy tp_coach on public.training_plans for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy pd_coach on public.plan_days for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy pi_coach on public.plan_items for all using (workspace_id = public.my_workspace() and public.my_role()='coach')
  with check (workspace_id = public.my_workspace() and public.my_role()='coach');
-- El cliente solo LEE lo suyo (más adelante registrará series en otras tablas).
create policy tp_client on public.training_plans for select using (client_id = public.my_client_id());
create policy pd_client on public.plan_days for select using (client_id = public.my_client_id());
create policy pi_client on public.plan_items for select using (client_id = public.my_client_id());

create function public.create_training_plan(p_client uuid, p_name text) returns uuid
language plpgsql security invoker set search_path = public as $$
declare pid uuid; ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws) then raise exception 'client not found'; end if;
  update training_plans set status = 'finished', ends_on = current_date where client_id = p_client and status = 'active';
  insert into training_plans (workspace_id, client_id, name) values (ws, p_client, p_name) returning id into pid;
  return pid;
end $$;

create function public.assign_day(p_plan uuid, p_weekday int, p_template uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; did uuid; tname text;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  select client_id into cid from training_plans where id = p_plan and workspace_id = ws and status = 'active';
  if cid is null then raise exception 'plan not found'; end if;
  select name into tname from routine_templates where id = p_template and workspace_id = ws;
  if tname is null then raise exception 'template not found'; end if;
  delete from plan_days where plan_id = p_plan and weekday = p_weekday;
  insert into plan_days (workspace_id, client_id, plan_id, weekday, name, source_template_id) values (ws, cid, p_plan, p_weekday, tname, p_template) returning id into did;
  insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds)
    select ws, cid, did, exercise_id, position, sets, reps, rest_seconds from template_items where template_id = p_template;
  return did;
end $$;
