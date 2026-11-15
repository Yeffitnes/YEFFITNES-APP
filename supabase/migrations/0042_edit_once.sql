-- 0042 · Corregir UNA vez (decisión del 30-oct, tras el reporte de Cristian: "después de que el coach lo revisa, todavía me deja editar").
-- Regla única para entrenamiento, reporte diario y nutrición del día: después de enviarlo, el cliente puede corregirlo UNA sola vez y
-- nunca si Jeff ya lo revisó. Se corrige el MISMO registro (el comentario nuevo reemplaza al anterior), así que en el panel de Jeff
-- no quedan dos versiones; Jeff ve la marca "corregido". Lo valida la base, no solo la pantalla.
--   * Entrenamiento: workout_logs.edits. finish_workout sobre uno ya terminado = corrección (máx. 1; no si coach_seen_at).
--     Las series (log_set, unlog_set o escritura directa) de uno terminado: solo si aún tiene su corrección y Jeff no lo revisó (disparador).
--   * Reporte: daily_reports.edits. submit_report sobre uno existente = corrección (máx. 1; no si ya lo vio Jeff).
--   * Nutrición: meal_day_locks. Con todas las comidas del día marcadas, desmarcar una = abrir la corrección (máx. 1).
-- Compatible con main: columnas nuevas con valor por defecto; funciones con los mismos parámetros. El código viejo verá un error
-- genérico si intenta una segunda corrección.
-- Revertir:
--   drop trigger set_logs_lock on public.set_logs; drop function public._set_logs_lock(), public._workout_editable(uuid, date);
--   recrear finish_workout (0006/0025), submit_report (0033), log_meal (0025),
--   protect_coach_columns y portal_boot (0041); drop table public.meal_day_locks;
--   alter table public.workout_logs drop column edits, drop column edited_at; alter table public.daily_reports drop column edits;

alter table public.workout_logs add column edits smallint not null default 0, add column edited_at timestamptz;
alter table public.daily_reports add column edits smallint not null default 0;

-- El cliente no puede cambiar a mano su contador de correcciones (solo finish_workout, que marca yf.edit para esta transacción).
create or replace function public.protect_coach_columns() returns trigger language plpgsql as $$
begin
  if public.my_role() is distinct from 'coach' then
    if tg_op = 'INSERT' then
      new.coach_seen_at := null; new.coach_comment := null; new.coach_comment_audio := null; new.coach_comment_image := null; new.coach_comment_video := null;
      new.edits := 0; new.edited_at := null;
    else
      new.coach_seen_at := old.coach_seen_at; new.coach_comment := old.coach_comment; new.coach_comment_audio := old.coach_comment_audio;
      new.coach_comment_image := old.coach_comment_image; new.coach_comment_video := old.coach_comment_video;
      if coalesce(current_setting('yf.edit', true), '') <> '1' then new.edits := old.edits; new.edited_at := old.edited_at; end if;
    end if;
  end if;
  return new;
end $$;

-- ¿Puede el cliente tocar el entrenamiento de ese día? Sí si no está terminado; si está terminado, solo con su corrección disponible.
create function public._workout_editable(p_client uuid, p_date date) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select w.completed_at is null or (w.coach_seen_at is null and w.edits < 1) from workout_logs w where w.client_id = p_client and w.log_date = p_date), true) $$;
revoke all on function public._workout_editable(uuid, date) from public, anon, authenticated;

create or replace function public.finish_workout(p_date date, p_effort integer, p_note text) returns uuid
language plpgsql set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; lid uuid; w record;
begin
  if cid is null then raise exception 'not a client'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid date'; end if;
  select workspace_id into ws from clients where id = cid;
  select * into w from workout_logs where client_id = cid and log_date = p_date;
  if w.id is not null and w.completed_at is not null then
    if w.coach_seen_at is not null then raise exception 'locked_reviewed'; end if;
    if w.edits >= 1 then raise exception 'locked_edited'; end if;
    perform set_config('yf.edit', '1', true);
    update workout_logs set effort = p_effort, note = nullif(trim(p_note), ''), edits = edits + 1, edited_at = now() where id = w.id returning id into lid;
    perform set_config('yf.edit', '', true);   -- la marca se apaga de inmediato: nada más en la misma transacción puede tocar el contador
    return lid;
  end if;
  insert into workout_logs (workspace_id, client_id, log_date, effort, note, completed_at) values (ws, cid, p_date, p_effort, nullif(trim(p_note), ''), now())
    on conflict (client_id, log_date) do update set effort = excluded.effort, note = excluded.note, completed_at = now() returning id into lid;
  return lid;
end $$;

-- Las series se cierran en la propia tabla: vale para log_set, unlog_set y para escrituras directas (políticas de 0006/0009).
create function public._set_logs_lock() returns trigger language plpgsql security definer set search_path = public as $$
declare d date; c uuid;
begin
  if auth.uid() is null or public.my_role() = 'coach' then return coalesce(new, old); end if;   -- admin/tareas o el coach: sin cierre
  select log_date, client_id into d, c from workout_logs where id = coalesce(new.workout_log_id, old.workout_log_id);
  if d is not null and not public._workout_editable(c, d) then raise exception 'locked'; end if;
  return coalesce(new, old);
end $$;
create trigger set_logs_lock before insert or update or delete on public.set_logs for each row execute function public._set_logs_lock();

create or replace function public.submit_report(p_date date, p_comment text, p_video_id text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); rid uuid; r record;
begin
  if not public.can_report() then raise exception 'not_allowed'; end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 1 then raise exception 'bad_date'; end if;
  if p_comment is not null and length(p_comment) > 1000 then raise exception 'comment_too_long'; end if;
  if p_video_id is not null and not exists (select 1 from video_uploads u where u.video_id = p_video_id and u.client_id = cid) then raise exception 'unknown_video'; end if;
  select * into r from daily_reports where client_id = cid and report_date = p_date;
  if r.id is not null and r.coach_seen_at is not null then raise exception 'already_reviewed'; end if;
  if r.id is not null and r.edits >= 1 then raise exception 'already_edited'; end if;
  insert into daily_reports (workspace_id, client_id, report_date, comment, video_id, video_state, delete_after)
  values (public.my_workspace(), cid, p_date, nullif(trim(p_comment), ''), p_video_id, case when p_video_id is null then 'none' else 'uploaded' end,
          case when p_video_id is null then null else now() + interval '32 hours' end)
  on conflict (client_id, report_date) do update set
    comment = excluded.comment, edits = daily_reports.edits + 1,
    video_id = coalesce(excluded.video_id, daily_reports.video_id),
    video_state = case when coalesce(excluded.video_id, daily_reports.video_id) is null then 'none' else 'uploaded' end,
    delete_after = case when coalesce(excluded.video_id, daily_reports.video_id) is null then null
                        when excluded.video_id is not null then now() + interval '32 hours' else daily_reports.delete_after end
  returning id into rid;
  return rid;
end $$;

-- Nutrición del día: con todas las comidas marcadas, desmarcar una abre la única corrección del día.
create table public.meal_day_locks (
  client_id uuid not null references public.clients(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id),
  log_date date not null,
  reopens smallint not null default 0,
  primary key (client_id, log_date)
);
alter table public.meal_day_locks enable row level security;
create policy mdl_client_read on public.meal_day_locks for select using (client_id = public.my_client_id());
create policy mdl_coach_read on public.meal_day_locks for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');

create or replace function public.log_meal(p_meal uuid, p_date date, p_done boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; wd int; total int; dn int; m nutrition_meals%rowtype; reo int;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  if not public.client_has_feature('nutrition') then raise exception 'not_allowed'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid_date'; end if;
  wd := extract(isodow from p_date)::int;
  select m2.* into m from nutrition_meals m2 join nutrition_plans p on p.id = m2.plan_id
    where m2.id = p_meal and p.client_id = cid and p.active and (m2.weekday is null or m2.weekday = wd);
  if m.id is null then raise exception 'not_found'; end if;
  select workspace_id into ws from clients where id = cid;
  select count(*) into total from nutrition_meals x join nutrition_plans p on p.id = x.plan_id where p.client_id = cid and p.active and (x.weekday is null or x.weekday = wd);
  select count(*) into dn from meal_logs l join nutrition_meals x on x.id = l.meal_id join nutrition_plans p on p.id = x.plan_id
    where l.client_id = cid and l.log_date = p_date and p.client_id = cid and p.active and (x.weekday is null or x.weekday = wd);
  if not p_done and total > 0 and dn >= total and exists (select 1 from meal_logs where client_id = cid and log_date = p_date and meal_id = p_meal) then
    select reopens into reo from meal_day_locks where client_id = cid and log_date = p_date;
    if coalesce(reo, 0) >= 1 then raise exception 'locked'; end if;
    insert into meal_day_locks (client_id, workspace_id, log_date, reopens) values (cid, ws, p_date, 1)
      on conflict (client_id, log_date) do update set reopens = meal_day_locks.reopens + 1;
  end if;
  if p_done then
    insert into meal_logs (client_id, workspace_id, log_date, meal_id) values (cid, ws, p_date, p_meal) on conflict do nothing;
  else
    delete from meal_logs where client_id = cid and log_date = p_date and meal_id = p_meal;
  end if;
  select count(*) into dn from meal_logs l join nutrition_meals x on x.id = l.meal_id join nutrition_plans p on p.id = x.plan_id
    where l.client_id = cid and l.log_date = p_date and p.client_id = cid and p.active and (x.weekday is null or x.weekday = wd);
  if total > 0 and dn >= total then
    insert into activity_events (workspace_id, client_id, kind, event_date) values (ws, cid, 'nutrition_done', p_date) on conflict do nothing;
    perform public._close_day(cid, p_date);
  else
    delete from activity_events where client_id = cid and kind in ('nutrition_done','day_done') and event_date = p_date and notified_at is null;
  end if;
  select reopens into reo from meal_day_locks where client_id = cid and log_date = p_date;
  return jsonb_build_object('done', dn, 'total', total, 'complete', total > 0 and dn >= total, 'reopens', coalesce(reo, 0));
end $$;

-- El arranque del portal (0041) también trae el contador de correcciones del entrenamiento.
create or replace function public.portal_boot() returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare uid uuid := auth.uid(); prof jsonb; cli record; plans_j jsonb; logs_j jsonb; since date := (now() at time zone 'America/Bogota')::date - 90;
begin
  if uid is null then return null; end if;
  select jsonb_build_object('id', p.id, 'role', p.role, 'full_name', p.full_name, 'workspace_id', p.workspace_id) into prof from profiles p where p.id = uid;
  if prof is null then return jsonb_build_object('profile', null); end if;
  select c.id, c.status, c.onboarded_at, c.objective, c.objective_at, c.access_requested_at, c.objective_video_id, pl.name as plan_name, pl.features
    into cli from clients c left join plans pl on pl.id = c.plan_id where c.profile_id = uid;
  if cli.id is null then return jsonb_build_object('profile', prof, 'client', null); end if;
  if cli.status = 'active' then
    select coalesce(jsonb_agg(jsonb_build_object('id', tp.id, 'name', tp.name, 'status', tp.status, 'starts_on', tp.starts_on, 'ends_on', tp.ends_on,
        'level', tp.level, 'level_reason', tp.level_reason, 'review_on', tp.review_on, 'coach_note', tp.coach_note,
        'plan_days', coalesce((select jsonb_agg(jsonb_build_object('id', pd.id, 'weekday', pd.weekday, 'name', pd.name, 'est_minutes', pd.est_minutes,
            'category', pd.category, 'video_ref', pd.video_ref, 'video_id', pd.video_id, 'video_poster', pd.video_poster,
            'plan_items', coalesce((select jsonb_agg(jsonb_build_object('id', pi.id, 'position', pi.position, 'sets', pi.sets, 'reps', pi.reps,
                'rest_seconds', pi.rest_seconds, 'target_weight', pi.target_weight,
                'exercises', (select jsonb_build_object('name', e.name, 'muscle_group', e.muscle_group, 'equipment', e.equipment, 'video_ref', e.video_ref,
                    'instructions', e.instructions, 'image', e.image) from exercises e where e.id = pi.exercise_id)) order by pi.position)
              from plan_items pi where pi.plan_day_id = pd.id), '[]'::jsonb)) order by pd.weekday)
          from plan_days pd where pd.plan_id = tp.id), '[]'::jsonb)) order by tp.created_at desc), '[]'::jsonb)
      into plans_j from training_plans tp where tp.client_id = cli.id;
    select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'log_date', w.log_date, 'effort', w.effort, 'note', w.note, 'completed_at', w.completed_at,
        'plan_day_id', w.plan_day_id, 'coach_comment', w.coach_comment, 'coach_comment_audio', w.coach_comment_audio,
        'coach_comment_image', w.coach_comment_image, 'coach_comment_video', w.coach_comment_video,
        'coach_seen_at', w.coach_seen_at, 'feedback_seen_at', w.feedback_seen_at, 'edits', w.edits,
        'plan_days', (select jsonb_build_object('name', pd.name) from plan_days pd where pd.id = w.plan_day_id),
        'set_logs', coalesce((select jsonb_agg(jsonb_build_object('plan_item_id', s.plan_item_id, 'set_number', s.set_number, 'reps', s.reps, 'weight', s.weight))
          from set_logs s where s.workout_log_id = w.id), '[]'::jsonb)) order by w.log_date desc), '[]'::jsonb)
      into logs_j from workout_logs w where w.client_id = cli.id and w.log_date >= since;
  end if;
  return jsonb_build_object('profile', prof,
    'client', jsonb_build_object('id', cli.id, 'status', cli.status, 'onboarded_at', cli.onboarded_at, 'objective', cli.objective, 'objective_at', cli.objective_at,
      'access_requested_at', cli.access_requested_at, 'objective_video_id', cli.objective_video_id,
      'plans', case when cli.plan_name is null then null else jsonb_build_object('name', cli.plan_name, 'features', to_jsonb(cli.features)) end),
    'plans', plans_j, 'logs', logs_j);
end $$;
