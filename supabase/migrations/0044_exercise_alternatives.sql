-- 0044 · Ejercicios alternativos (pedido de Cristian, 30-oct): cada ejercicio del catálogo puede tener 1 o 2 sustitutos aprobados por Jeff.
-- El cliente, en Hoy, cambia él mismo un ejercicio por uno de esos sustitutos ("la máquina está ocupada") y Jeff ve que lo cambió.
--   * exercise_alternatives: qué sustitutos aprobó Jeff para cada ejercicio (máx. 2). Solo Jeff los escribe, con set_alternatives().
--   * exercise_swaps: el cambio que hizo el cliente ese día en ese ejercicio de su rutina. Solo con swap_exercise(); el cliente y Jeff lo leen.
--   * Reglas (las impone la base): solo un sustituto aprobado; solo hoy (±1 día por la zona horaria, igual que log_set); solo ANTES de
--     registrar series de ese ejercicio (así las series quedan con un solo nombre); y no si el entrenamiento ya no se puede corregir (0042).
--   * log_set guarda la serie con el nombre del ejercicio que de verdad hizo: los récords y el historial quedan con el sustituto.
-- Requiere la 0042 (usa _workout_editable). Compatible con main: tablas y funciones nuevas; log_set conserva sus parámetros y, sin
-- cambios, hace lo mismo que antes.
-- Revertir:
--   drop function public.swap_exercise(date, uuid, uuid), public.my_swap_options(date), public.set_alternatives(uuid, uuid[]);
--   drop table public.exercise_swaps, public.exercise_alternatives;
--   recrear log_set como en 0006 (sin la búsqueda en exercise_swaps).

create table public.exercise_alternatives (
  workspace_id uuid not null references public.workspaces,
  exercise_id uuid not null references public.exercises on delete cascade,
  alt_exercise_id uuid not null references public.exercises on delete cascade,
  position smallint not null default 1 check (position between 1 and 2),
  created_at timestamptz not null default now(),
  primary key (exercise_id, alt_exercise_id),
  check (exercise_id <> alt_exercise_id)
);
create index on public.exercise_alternatives (workspace_id);
alter table public.exercise_alternatives enable row level security;
-- Jeff lee los suyos. Escribe solo con set_alternatives() (valida que ambos ejercicios sean de su espacio).
create policy exalt_coach_read on public.exercise_alternatives for select
  using (workspace_id = (select public.my_workspace()) and (select public.my_role()) = 'coach');

create table public.exercise_swaps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  workout_log_id uuid not null references public.workout_logs on delete cascade,
  plan_item_id uuid not null references public.plan_items on delete cascade,
  from_exercise_id uuid references public.exercises on delete set null,
  to_exercise_id uuid references public.exercises on delete set null,
  from_name text not null,
  to_name text not null,
  created_at timestamptz not null default now(),
  unique (workout_log_id, plan_item_id)
);
create index on public.exercise_swaps (client_id, created_at desc);
alter table public.exercise_swaps enable row level security;
create policy swap_coach_read on public.exercise_swaps for select
  using (workspace_id = (select public.my_workspace()) and (select public.my_role()) = 'coach');
create policy swap_client_read on public.exercise_swaps for select using (client_id = (select public.my_client_id()));

-- Jeff fija los sustitutos de un ejercicio (reemplaza la lista entera; vacía = sin sustitutos).
create function public.set_alternatives(p_exercise uuid, p_alts uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); a uuid; k int := 0;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from exercises where id = p_exercise and workspace_id = ws) then raise exception 'not_found'; end if;
  p_alts := coalesce(p_alts, '{}');
  if cardinality(p_alts) > 2 then raise exception 'too_many'; end if;
  if (select count(distinct x) from unnest(p_alts) x) <> cardinality(p_alts) then raise exception 'duplicated'; end if;
  if p_exercise = any(p_alts) then raise exception 'self'; end if;
  if exists (select 1 from unnest(p_alts) x where not exists (select 1 from exercises e where e.id = x and e.workspace_id = ws and e.active)) then
    raise exception 'not_found';
  end if;
  delete from exercise_alternatives where exercise_id = p_exercise;
  foreach a in array p_alts loop
    k := k + 1;
    insert into exercise_alternatives (workspace_id, exercise_id, alt_exercise_id, position) values (ws, p_exercise, a, k);
  end loop;
end $$;
revoke all on function public.set_alternatives(uuid, uuid[]) from public, anon;
grant execute on function public.set_alternatives(uuid, uuid[]) to authenticated;

-- Lo que el cliente necesita para cambiar: los sustitutos de cada ejercicio de su plan activo y lo que ya cambió ese día.
create function public.my_swap_options(p_date date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); alts jsonb; sw jsonb;
begin
  if cid is null or not public.client_has_feature('training') then return jsonb_build_object('alts', '[]'::jsonb, 'swaps', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', pi.id, 'alts', x.list)), '[]'::jsonb) into alts
    from plan_items pi
    join plan_days pd on pd.id = pi.plan_day_id
    join training_plans tp on tp.id = pd.plan_id and tp.status = 'active'
    cross join lateral (
      select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'image', e.image, 'muscle_group', e.muscle_group, 'equipment', e.equipment,
               'instructions', e.instructions, 'video_ref', e.video_ref) order by a.position) as list
      from exercise_alternatives a join exercises e on e.id = a.alt_exercise_id and e.active
      where a.exercise_id = pi.exercise_id) x
    where pi.client_id = cid and x.list is not null;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', s.plan_item_id, 'to_id', s.to_exercise_id, 'to_name', s.to_name, 'from_name', s.from_name)), '[]'::jsonb) into sw
    from exercise_swaps s join workout_logs w on w.id = s.workout_log_id
    where s.client_id = cid and w.log_date = p_date;
  return jsonb_build_object('alts', alts, 'swaps', sw);
end $$;
revoke all on function public.my_swap_options(date) from public, anon;
grant execute on function public.my_swap_options(date) to authenticated;

-- El cliente cambia un ejercicio de su rutina de ese día por un sustituto aprobado (p_alt = null: vuelve al original).
create function public.swap_exercise(p_date date, p_item uuid, p_alt uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); it record; alt record; lid uuid;
begin
  if cid is null or not public.client_has_feature('training') then raise exception 'not_allowed'; end if;
  if p_date is null or abs(p_date - current_date) > 1 then raise exception 'invalid_date'; end if;
  select pi.workspace_id, pi.exercise_id, pi.plan_day_id, e.name into it
    from plan_items pi join exercises e on e.id = pi.exercise_id
    join plan_days pd on pd.id = pi.plan_day_id join training_plans tp on tp.id = pd.plan_id and tp.status = 'active'
    where pi.id = p_item and pi.client_id = cid;
  if it.exercise_id is null then raise exception 'item_not_found'; end if;
  if not public._workout_editable(cid, p_date) then raise exception 'locked'; end if;
  select id into lid from workout_logs where client_id = cid and log_date = p_date;
  if lid is not null and exists (select 1 from set_logs where workout_log_id = lid and plan_item_id = p_item) then raise exception 'has_sets'; end if;
  if p_alt is null then
    if lid is not null then delete from exercise_swaps where workout_log_id = lid and plan_item_id = p_item; end if;
    return;
  end if;
  select e.id, e.name into alt from exercise_alternatives a join exercises e on e.id = a.alt_exercise_id and e.active
    where a.exercise_id = it.exercise_id and a.alt_exercise_id = p_alt;
  if alt.id is null then raise exception 'not_alternative'; end if;
  insert into workout_logs (workspace_id, client_id, log_date, plan_day_id) values (it.workspace_id, cid, p_date, it.plan_day_id)
    on conflict (client_id, log_date) do update set plan_day_id = excluded.plan_day_id returning id into lid;
  insert into exercise_swaps (workspace_id, client_id, workout_log_id, plan_item_id, from_exercise_id, to_exercise_id, from_name, to_name)
    values (it.workspace_id, cid, lid, p_item, it.exercise_id, alt.id, it.name, alt.name)
    on conflict (workout_log_id, plan_item_id) do update set to_exercise_id = excluded.to_exercise_id, to_name = excluded.to_name, created_at = now();
end $$;
revoke all on function public.swap_exercise(date, uuid, uuid) from public, anon;
grant execute on function public.swap_exercise(date, uuid, uuid) to authenticated;

-- log_set (de 0006): igual que antes, pero si ese día cambió el ejercicio, la serie se guarda con el nombre del sustituto.
create or replace function public.log_set(p_date date, p_item uuid, p_set int, p_reps int, p_weight numeric, p_kind text default 'work') returns uuid
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
  select coalesce((select s.to_name from exercise_swaps s where s.workout_log_id = lid and s.plan_item_id = p_item), ex) into ex;
  insert into set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps, weight)
    values (ws, cid, lid, p_item, ex, p_set, p_kind, p_reps, p_weight)
    on conflict (workout_log_id, plan_item_id, set_number, kind) do update set reps = excluded.reps, weight = excluded.weight;
  return lid;
end $$;
