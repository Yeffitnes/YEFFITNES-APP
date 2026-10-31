-- 0043 · Pedido de Cristian (30-oct, noche): programas completos, respuestas guardadas, hábitos del día y récords.
--   1) program_templates + program_days: un PROGRAMA es una semana tipo (qué rutina va cada día) con duración en semanas.
--      apply_program() lo asigna a un cliente con un toque: crea su plan nuevo (el anterior pasa a finalizado), copia cada
--      rutina a su día y pone la "próxima revisión" al final del programa (así sale en "Planes por revisar").
--   2) coach_snippets: frases que Jeff reutiliza al responder (solo las ve Jeff).
--   3) habit_logs: agua (vasos), pasos y horas de sueño por día. El cliente escribe SOLO con log_habit() (hoy y 2 días atrás);
--      Jeff solo lee.
--   4) exercise_records(): el mejor peso de cada ejercicio (series de trabajo) y el mejor anterior, para "nuevo récord".
--      security invoker: cada quien solo ve lo que sus políticas le dejan (el cliente lo suyo, Jeff su espacio).
-- Compatible con main: el código viejo no usa nada de esto.
-- Revertir:
--   drop function public.apply_program(uuid, uuid), public.save_program(uuid, text, int, text, jsonb), public.log_habit(date, int, int, numeric), public.exercise_records(uuid);
--   drop table public.program_days, public.program_templates, public.coach_snippets, public.habit_logs;

-- ---------- 1) Programas ----------
create table public.program_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  name text not null check (length(trim(name)) between 1 and 80),
  weeks smallint not null default 4 check (weeks between 1 and 16),
  notes text check (notes is null or length(notes) <= 400),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.program_days (
  program_id uuid not null references public.program_templates on delete cascade,
  workspace_id uuid not null references public.workspaces,
  weekday smallint not null check (weekday between 1 and 7),
  template_id uuid not null references public.routine_templates on delete cascade,
  primary key (program_id, weekday)
);
create index on public.program_templates (workspace_id);
alter table public.program_templates enable row level security;
alter table public.program_days enable row level security;
create policy prg_coach on public.program_templates for all using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach');
create policy prgd_coach on public.program_days for all using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach'
    and exists (select 1 from public.program_templates p where p.id = program_id and p.workspace_id = public.my_workspace())
    and exists (select 1 from public.routine_templates t where t.id = template_id and t.workspace_id = public.my_workspace()));

-- p_days: [{"weekday":1,"template_id":"..."}, ...]. Reemplaza los días del programa.
create function public.save_program(p_id uuid, p_name text, p_weeks int, p_notes text, p_days jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pid uuid := p_id; d jsonb;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days) = 0 then raise exception 'no_days'; end if;
  if pid is null then
    insert into program_templates (workspace_id, name, weeks, notes) values (ws, trim(p_name), p_weeks, nullif(trim(coalesce(p_notes, '')), '')) returning id into pid;
  else
    update program_templates set name = trim(p_name), weeks = p_weeks, notes = nullif(trim(coalesce(p_notes, '')), '') where id = pid and workspace_id = ws;
    if not found then raise exception 'not_found'; end if;
    delete from program_days where program_id = pid;
  end if;
  for d in select * from jsonb_array_elements(p_days) loop
    if not exists (select 1 from routine_templates where id = (d->>'template_id')::uuid and workspace_id = ws) then raise exception 'template_not_found'; end if;
    insert into program_days (program_id, workspace_id, weekday, template_id) values (pid, ws, (d->>'weekday')::smallint, (d->>'template_id')::uuid);
  end loop;
  return pid;
end $$;

-- Asigna el programa a un cliente: plan nuevo + una rutina por día + revisión al final del programa.
create function public.apply_program(p_client uuid, p_program uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pr record; pid uuid; d record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select name, weeks into pr from program_templates where id = p_program and workspace_id = ws and active;
  if pr.name is null then raise exception 'not_found'; end if;
  if not exists (select 1 from program_days where program_id = p_program) then raise exception 'no_days'; end if;
  pid := public.create_training_plan(p_client, pr.name);
  for d in select weekday, template_id from program_days where program_id = p_program order by weekday loop
    perform public.assign_day(pid, d.weekday, d.template_id);
  end loop;
  update training_plans set review_on = (now() at time zone 'America/Bogota')::date + pr.weeks * 7 where id = pid;
  return pid;
end $$;

-- ---------- 2) Respuestas guardadas ----------
create table public.coach_snippets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.coach_snippets (workspace_id, created_at);
alter table public.coach_snippets enable row level security;
create policy snip_coach on public.coach_snippets for all using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach');

-- ---------- 3) Hábitos del día ----------
create table public.habit_logs (
  client_id uuid not null references public.clients on delete cascade,
  workspace_id uuid not null references public.workspaces,
  day date not null,
  water smallint check (water between 0 and 20),
  steps int check (steps between 0 and 100000),
  sleep numeric(3,1) check (sleep between 0 and 16),
  updated_at timestamptz not null default now(),
  primary key (client_id, day)
);
create index on public.habit_logs (workspace_id, day);
alter table public.habit_logs enable row level security;
create policy hab_client_read on public.habit_logs for select using (client_id = public.my_client_id());
create policy hab_coach_read on public.habit_logs for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
-- Sin insert/update/delete directo: solo log_habit(). Un valor nulo deja el que había.
create function public.log_habit(p_day date, p_water int default null, p_steps int default null, p_sleep numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; today date := (now() at time zone 'America/Bogota')::date;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  select workspace_id into ws from clients where id = cid and status = 'active';
  if ws is null then raise exception 'not_allowed'; end if;
  if p_day is null or p_day > today or p_day < today - 2 then raise exception 'bad_day'; end if;
  insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) values (cid, ws, p_day, p_water, p_steps, p_sleep)
  on conflict (client_id, day) do update set water = coalesce(excluded.water, habit_logs.water), steps = coalesce(excluded.steps, habit_logs.steps),
    sleep = coalesce(excluded.sleep, habit_logs.sleep), updated_at = now();
end $$;
revoke all on function public.log_habit(date, int, int, numeric) from public, anon;
grant execute on function public.log_habit(date, int, int, numeric) to authenticated;

-- ---------- 4) Récords ----------
-- Por ejercicio: mejor peso (y sus repeticiones), cuándo, y el mejor peso ANTES de ese día (null = primera marca).
create function public.exercise_records(p_client uuid) returns table (exercise text, best_weight numeric, best_reps int, best_on date, prev_best numeric)
language sql stable security invoker set search_path = public as $$
  with s as (
    select sl.exercise_name as ex, sl.weight as w, sl.reps as r, wl.log_date as d
    from set_logs sl join workout_logs wl on wl.id = sl.workout_log_id
    where sl.client_id = p_client and sl.kind = 'work' and sl.weight > 0 and coalesce(sl.reps, 0) > 0
  ), b as (
    select distinct on (ex) ex, w, r, d from s order by ex, w desc, r desc, d asc
  )
  select b.ex, b.w, b.r, b.d, (select max(s2.w) from s s2 where s2.ex = b.ex and s2.d < b.d) from b order by b.ex
$$;
