-- 0025 · Checks de nutrición, actividad en tiempo real para el coach y datos del plan (nivel, revisión, nota).
-- Revertir: ver CHANGELOG (drop de las tablas/funciones/trigger de este archivo y de las 4 columnas de training_plans).

-- ───────── 1. Comidas marcadas por el cliente (una fila = comida cumplida ese día) ─────────
create table public.meal_logs (
  client_id uuid not null references public.clients on delete cascade,
  workspace_id uuid not null references public.workspaces,
  log_date date not null,
  meal_id uuid not null references public.nutrition_meals on delete cascade,
  done_at timestamptz not null default now(),
  primary key (client_id, log_date, meal_id)
);
create index on public.meal_logs (workspace_id, log_date);
alter table public.meal_logs enable row level security;
create policy ml_client_read on public.meal_logs for select using (client_id = public.my_client_id());
create policy ml_coach_read on public.meal_logs for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
-- Sin insert/update/delete directo: solo log_meal().

-- ───────── 2. Actividad (lo que el coach ve "en tiempo real") ─────────
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  kind text not null check (kind in ('training_done','nutrition_done','day_done')),
  event_date date not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  notified_at timestamptz,
  unique (client_id, kind, event_date)
);
create index on public.activity_events (workspace_id, created_at desc);
alter table public.activity_events enable row level security;
create policy ae_coach_read on public.activity_events for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
-- Los clientes no leen ni escriben eventos; solo las funciones de abajo (security definer).

-- Cierra el "día completo": entrenamiento + nutrición del mismo día. (Quien solo tiene uno de los dos ya genera su propio evento.)
create function public._close_day(p_client uuid, p_date date) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if exists (select 1 from activity_events where client_id = p_client and kind = 'training_done' and event_date = p_date)
     and exists (select 1 from activity_events where client_id = p_client and kind = 'nutrition_done' and event_date = p_date) then
    select workspace_id into ws from clients where id = p_client;
    insert into activity_events (workspace_id, client_id, kind, event_date) values (ws, p_client, 'day_done', p_date) on conflict do nothing;
  end if;
end $$;
revoke all on function public._close_day(uuid, date) from public, anon, authenticated;

-- Entrenamiento terminado → evento (disparador: no hay que tocar finish_workout).
create function public._on_workout_done() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.completed_at is not null then
    insert into activity_events (workspace_id, client_id, kind, event_date) values (new.workspace_id, new.client_id, 'training_done', new.log_date) on conflict do nothing;
    perform public._close_day(new.client_id, new.log_date);
  end if;
  return new;
end $$;
create trigger workout_done_event after insert or update of completed_at on public.workout_logs for each row execute function public._on_workout_done();

-- Marca / desmarca una comida del día. Devuelve el avance: {done,total,complete}.
create function public.log_meal(p_meal uuid, p_date date, p_done boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; wd int; total int; dn int; m nutrition_meals%rowtype;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  if not public.client_has_feature('nutrition') then raise exception 'not_allowed'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid_date'; end if;
  wd := extract(isodow from p_date)::int;
  select m2.* into m from nutrition_meals m2 join nutrition_plans p on p.id = m2.plan_id
    where m2.id = p_meal and p.client_id = cid and p.active and (m2.weekday is null or m2.weekday = wd);
  if m.id is null then raise exception 'not_found'; end if;
  select workspace_id into ws from clients where id = cid;
  if p_done then
    insert into meal_logs (client_id, workspace_id, log_date, meal_id) values (cid, ws, p_date, p_meal) on conflict do nothing;
  else
    delete from meal_logs where client_id = cid and log_date = p_date and meal_id = p_meal;
  end if;
  select count(*) into total from nutrition_meals x join nutrition_plans p on p.id = x.plan_id where p.client_id = cid and p.active and (x.weekday is null or x.weekday = wd);
  select count(*) into dn from meal_logs l join nutrition_meals x on x.id = l.meal_id join nutrition_plans p on p.id = x.plan_id
    where l.client_id = cid and l.log_date = p_date and p.client_id = cid and p.active and (x.weekday is null or x.weekday = wd);
  if total > 0 and dn >= total then
    insert into activity_events (workspace_id, client_id, kind, event_date) values (ws, cid, 'nutrition_done', p_date) on conflict do nothing;
    perform public._close_day(cid, p_date);
  else
    delete from activity_events where client_id = cid and kind in ('nutrition_done','day_done') and event_date = p_date and notified_at is null;
  end if;
  return jsonb_build_object('done', dn, 'total', total, 'complete', total > 0 and dn >= total);
end $$;

-- Lo que ve el coach: últimos eventos de su espacio de trabajo.
create function public.activity_feed(p_limit int default 20) returns table (id uuid, client_id uuid, client_name text, kind text, event_date date, created_at timestamptz, seen boolean)
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  return query select e.id, e.client_id, coalesce(pr.full_name, 'Cliente'), e.kind, e.event_date, e.created_at, e.seen_at is not null
    from activity_events e join clients c on c.id = e.client_id left join profiles pr on pr.id = c.profile_id
    where e.workspace_id = public.my_workspace() order by e.created_at desc limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
create function public.unseen_activity() returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from activity_events where workspace_id = public.my_workspace() and public.my_role() = 'coach' and seen_at is null $$;
create function public.mark_activity_seen() returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update activity_events set seen_at = now() where workspace_id = public.my_workspace() and seen_at is null;
end $$;

-- Push al coach cuando su cliente completa algo: solo el propio cliente, una vez por evento, en los 10 min siguientes.
create function public.push_event_targets(p_date date) returns table (kind text, client_name text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; nm text;
begin
  if cid is null then return; end if;
  select c.workspace_id, pr.full_name into ws, nm from clients c left join profiles pr on pr.id = c.profile_id where c.id = cid;
  if not exists (select 1 from activity_events where client_id = cid and event_date = p_date and notified_at is null and created_at > now() - interval '10 minutes') then return; end if;
  return query
    with ev as (update activity_events set notified_at = now() where client_id = cid and event_date = p_date and notified_at is null and created_at > now() - interval '10 minutes' returning activity_events.kind)
    select ev.kind, coalesce(nm, 'Un cliente'), s.endpoint, s.p256dh, s.auth from ev
      cross join (select ps.endpoint, ps.p256dh, ps.auth from push_subscriptions ps join profiles pc on pc.id = ps.profile_id where pc.role = 'coach' and ps.workspace_id = ws) s;
end $$;

-- ───────── 3. Datos del plan de entrenamiento: nivel (y por qué), próxima revisión y nota para el cliente ─────────
alter table public.training_plans
  add column level text check (level is null or level in ('beginner','intermediate','advanced')),
  add column level_reason text check (level_reason is null or length(level_reason) <= 400),
  add column review_on date,
  add column coach_note text check (coach_note is null or length(coach_note) <= 600);

create function public.set_plan_info(p_plan uuid, p_level text, p_reason text, p_review date, p_note text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update training_plans set level = nullif(p_level, ''), level_reason = nullif(trim(p_reason), ''), review_on = p_review, coach_note = nullif(trim(p_note), '')
  where id = p_plan and workspace_id = public.my_workspace();
  if not found then raise exception 'not_found'; end if;
end $$;

grant execute on function public.log_meal(uuid, date, boolean), public.activity_feed(int), public.unseen_activity(), public.mark_activity_seen(),
  public.push_event_targets(date), public.set_plan_info(uuid, text, text, date, text) to authenticated;
