-- Registro de entrenamientos del cliente. El plan debe incluir la función 'training' (se valida en la base).
create function public.client_has_feature(f text) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.clients c join public.plans p on p.id = c.plan_id
  where c.profile_id = auth.uid() and c.status = 'active' and f = any(p.features)) $$;

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  log_date date not null,
  plan_day_id uuid references public.plan_days on delete set null,
  effort smallint check (effort between 1 and 10),
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);
create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  workout_log_id uuid not null references public.workout_logs on delete cascade,
  plan_item_id uuid references public.plan_items on delete set null,
  exercise_name text not null,
  set_number smallint not null check (set_number > 0),
  kind text not null default 'work' check (kind in ('warmup','work')),
  reps int check (reps >= 0),
  weight numeric(6,2) check (weight >= 0),
  created_at timestamptz not null default now(),
  unique (workout_log_id, plan_item_id, set_number, kind)
);
create index on public.workout_logs (client_id, log_date desc);
create index on public.set_logs (workout_log_id);
alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
create policy wl_coach_read on public.workout_logs for select using (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy sl_coach_read on public.set_logs for select using (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy wl_client_read on public.workout_logs for select using (client_id = public.my_client_id());
create policy sl_client_read on public.set_logs for select using (client_id = public.my_client_id());
create policy wl_client_ins on public.workout_logs for insert with check (client_id = public.my_client_id() and public.client_has_feature('training'));
create policy wl_client_upd on public.workout_logs for update using (client_id = public.my_client_id() and public.client_has_feature('training'));
create policy sl_client_ins on public.set_logs for insert with check (client_id = public.my_client_id() and public.client_has_feature('training'));
create policy sl_client_upd on public.set_logs for update using (client_id = public.my_client_id() and public.client_has_feature('training'));
-- El cliente con 'training' puede leer los ejercicios de su coach (nombres, vídeo, instrucciones).
create policy ex_client_read on public.exercises for select using (workspace_id = public.my_workspace() and public.client_has_feature('training'));

create function public.log_set(p_date date, p_item uuid, p_set int, p_reps int, p_weight numeric, p_kind text default 'work') returns uuid
language plpgsql security invoker set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; ex text; did uuid; lid uuid;
begin
  if cid is null then raise exception 'not a client'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid date'; end if;  -- tolera la zona horaria
  select pi.workspace_id, e.name, pi.plan_day_id into ws, ex, did
    from plan_items pi join exercises e on e.id = pi.exercise_id where pi.id = p_item and pi.client_id = cid;
  if ws is null then raise exception 'item not found'; end if;
  insert into workout_logs (workspace_id, client_id, log_date, plan_day_id) values (ws, cid, p_date, did)
    on conflict (client_id, log_date) do update set plan_day_id = excluded.plan_day_id returning id into lid;
  insert into set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps, weight)
    values (ws, cid, lid, p_item, ex, p_set, p_kind, p_reps, p_weight)
    on conflict (workout_log_id, plan_item_id, set_number, kind) do update set reps = excluded.reps, weight = excluded.weight;
  return lid;
end $$;

create function public.finish_workout(p_date date, p_effort int, p_note text) returns uuid
language plpgsql security invoker set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; lid uuid;
begin
  if cid is null then raise exception 'not a client'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid date'; end if;
  select workspace_id into ws from clients where id = cid;
  insert into workout_logs (workspace_id, client_id, log_date, effort, note, completed_at) values (ws, cid, p_date, p_effort, nullif(trim(p_note), ''), now())
    on conflict (client_id, log_date) do update set effort = excluded.effort, note = excluded.note, completed_at = now() returning id into lid;
  return lid;
end $$;
