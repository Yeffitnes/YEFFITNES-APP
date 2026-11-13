-- 0052 (12-nov, pedido de Cristian): hábitos que Jeff configura.
-- 1) habit_defs: los hábitos del negocio, iguales para todos los clientes. Vienen agua (6 vasos), pasos (3.000) y sueño (6 h), que se
--    guardan como antes en habit_logs. Jeff cambia la meta general, los apaga, o agrega otros (p. ej. lectura): de número con unidad
--    ("20 min", meta = mínimo al día) o de sí/no ("hecho hoy", meta = días por semana, de 1 a 7). No se borran: se apagan, para no
--    perder el historial.
-- 2) client_habit_goals: la meta de UN cliente (más o menos pasos) o "no aplica para este cliente".
-- 3) habit_logs.extra: lo que el cliente anota de los hábitos que agregó Jeff ({id del hábito: valor}).
-- Compatible con `main`: solo agrega (main sigue usando log_habit y las tres columnas).
-- Revertir: drop function public.log_habit_extra(date, uuid, numeric); drop function public.save_habit_def(uuid, text, text, text, numeric, boolean);
--   drop function public.set_client_habit_goal(uuid, uuid, numeric, boolean); drop trigger workspace_habits on public.workspaces;
--   drop function public.seed_workspace_habits(); drop table public.client_habit_goals; drop table public.habit_defs;
--   alter table public.habit_logs drop column extra;
create table public.habit_defs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  key text check (key in ('water','steps','sleep')),          -- solo los que vienen de fábrica
  name text not null check (length(btrim(name)) between 1 and 40),
  unit text check (unit is null or length(unit) <= 20),
  kind text not null default 'number' check (kind in ('number','check')),
  goal numeric(8,1) check (goal is null or goal > 0),
  active boolean not null default true,
  position int not null default 100,
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);
alter table public.habit_defs enable row level security;
create policy hdef_read on public.habit_defs for select using (workspace_id = public.my_workspace());
revoke insert, update, delete on public.habit_defs from anon, authenticated;

create function public.seed_workspace_habits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into habit_defs (workspace_id, key, name, unit, kind, goal, position) values
    (new.id, 'water', 'Agua', 'vasos', 'number', 6, 1), (new.id, 'steps', 'Pasos', 'pasos', 'number', 3000, 2), (new.id, 'sleep', 'Sueño', 'h', 'number', 6, 3)
  on conflict do nothing;
  return new;
end $$;
create trigger workspace_habits after insert on public.workspaces for each row execute function public.seed_workspace_habits();
insert into public.habit_defs (workspace_id, key, name, unit, kind, goal, position)
  select w.id, x.k, x.n, x.u, 'number', x.g, x.p from public.workspaces w,
  (values ('water','Agua','vasos',6,1), ('steps','Pasos','pasos',3000,2), ('sleep','Sueño','h',6,3)) as x(k, n, u, g, p)
  on conflict do nothing;

create table public.client_habit_goals (
  client_id uuid not null references public.clients on delete cascade,
  habit_id uuid not null references public.habit_defs on delete cascade,
  workspace_id uuid not null references public.workspaces,
  goal numeric(8,1) check (goal is null or goal > 0),   -- nulo = la meta general
  off boolean not null default false,                   -- este hábito no aplica para este cliente
  updated_at timestamptz not null default now(),
  primary key (client_id, habit_id)
);
alter table public.client_habit_goals enable row level security;
create policy chg_client_read on public.client_habit_goals for select using (client_id = public.my_client_id());
create policy chg_coach_read on public.client_habit_goals for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
revoke insert, update, delete on public.client_habit_goals from anon, authenticated;

alter table public.habit_logs add column extra jsonb not null default '{}'::jsonb;

-- Jeff crea (p_id nulo) o cambia un hábito. Los de fábrica: solo meta y si está activo.
create function public.save_habit_def(p_id uuid, p_name text, p_unit text, p_kind text, p_goal numeric, p_active boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); k text; out_id uuid; n text := btrim(coalesce(p_name, '')); u text := nullif(btrim(coalesce(p_unit, '')), '');
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_goal is not null and (p_goal <= 0 or p_goal > 100000) then raise exception 'bad_goal'; end if;
  if p_goal is not null and p_goal > 7 and ((p_id is null and p_kind = 'check') or (p_id is not null and (select kind from habit_defs where id = p_id) = 'check')) then raise exception 'bad_goal'; end if;
  if p_id is null then
    if length(n) not between 1 and 40 or coalesce(length(u), 0) > 20 or p_kind not in ('number','check') then raise exception 'bad_habit'; end if;
    if (select count(*) from habit_defs where workspace_id = ws) >= 12 then raise exception 'too_many'; end if;
    insert into habit_defs (workspace_id, name, unit, kind, goal, active, position)
      values (ws, n, case when p_kind = 'check' then null else u end, p_kind, p_goal, coalesce(p_active, true),
              (select coalesce(max(position), 0) + 1 from habit_defs where workspace_id = ws))
      returning id into out_id;
    return out_id;
  end if;
  select key into k from habit_defs where id = p_id and workspace_id = ws;
  if not found then raise exception 'not_found'; end if;
  if k is not null then
    if p_goal is null then raise exception 'bad_goal'; end if;
    update habit_defs set goal = p_goal, active = coalesce(p_active, active) where id = p_id;
  else
    if length(n) not between 1 and 40 or coalesce(length(u), 0) > 20 then raise exception 'bad_habit'; end if;
    update habit_defs set name = n, unit = case when kind = 'check' then null else u end, goal = p_goal,
      active = coalesce(p_active, active) where id = p_id;
  end if;
  return p_id;
end $$;
revoke all on function public.save_habit_def(uuid, text, text, text, numeric, boolean) from public;
grant execute on function public.save_habit_def(uuid, text, text, text, numeric, boolean) to authenticated;

-- Jeff cambia la meta de un cliente (nula = la general) o marca que no aplica.
create function public.set_client_habit_goal(p_client uuid, p_habit uuid, p_goal numeric, p_off boolean) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_goal is not null and (p_goal <= 0 or p_goal > 100000) then raise exception 'bad_goal'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws) or not exists (select 1 from habit_defs where id = p_habit and workspace_id = ws) then raise exception 'not_found'; end if;
  if p_goal is not null and p_goal > 7 and (select kind from habit_defs where id = p_habit) = 'check' then raise exception 'bad_goal'; end if;
  if p_goal is null and not coalesce(p_off, false) then delete from client_habit_goals where client_id = p_client and habit_id = p_habit; return; end if;
  insert into client_habit_goals (client_id, habit_id, workspace_id, goal, off) values (p_client, p_habit, ws, p_goal, coalesce(p_off, false))
    on conflict (client_id, habit_id) do update set goal = excluded.goal, off = excluded.off, updated_at = now();
end $$;
revoke all on function public.set_client_habit_goal(uuid, uuid, numeric, boolean) from public;
grant execute on function public.set_client_habit_goal(uuid, uuid, numeric, boolean) to authenticated;

-- El cliente anota un hábito agregado por Jeff (hoy o hasta 2 días atrás, como log_habit). Nulo = lo borra.
create function public.log_habit_extra(p_day date, p_habit uuid, p_value numeric) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; kd text; today date := (now() at time zone 'America/Bogota')::date;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  select workspace_id into ws from clients where id = cid and status = 'active';
  if ws is null then raise exception 'not_allowed'; end if;
  if p_day is null or p_day > today or p_day < today - 2 then raise exception 'bad_day'; end if;
  select kind into kd from habit_defs where id = p_habit and workspace_id = ws and key is null and active;
  if kd is null then raise exception 'not_found'; end if;
  if p_value is not null and (p_value < 0 or p_value > 100000 or (kd = 'check' and p_value not in (0, 1))) then raise exception 'bad_value'; end if;
  insert into habit_logs (client_id, workspace_id, day, extra) values (cid, ws, p_day, case when p_value is null then '{}'::jsonb else jsonb_build_object(p_habit::text, p_value) end)
  on conflict (client_id, day) do update set extra = case when p_value is null then habit_logs.extra - p_habit::text else habit_logs.extra || jsonb_build_object(p_habit::text, p_value) end, updated_at = now();
end $$;
revoke all on function public.log_habit_extra(date, uuid, numeric) from public, anon;
grant execute on function public.log_habit_extra(date, uuid, numeric) to authenticated;
