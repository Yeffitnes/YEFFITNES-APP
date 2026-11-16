-- 0056 (15-nov, pedido de Cristian y Jeff): programas y planes por SEMANAS.
--   Un programa de N semanas puede repetir la misma semana (como hasta ahora) o tener una semana distinta cada vez
--   (semana 1: pecho el lunes; semana 2: otra cosa...). Al asignarlo, el plan del cliente guarda todas sus semanas y
--   cada día se muestra la rutina de la semana que corre.
--   - plan_days.week y program_days.week (1..16, por defecto 1). Lo existente queda en la semana 1: nada cambia.
--   - training_plans.cycle_weeks: cuántas semanas distintas tiene el plan (1 = la misma semana siempre). Al terminar
--     la última semana vuelve a la 1 hasta que Jeff cambie el plan.
--   - plan_week(inicio, ciclo, día): qué semana corre. Las semanas empiezan el lunes de la semana en que empezó el plan.
--   - assign_day(..., p_week), save_program con "week" en cada día, apply_program copia todas las semanas.
--   - portal_boot y el recordatorio de la mañana usan la semana que corre.
-- Revertir (solo si ningún plan usa semanas > 1):
--   delete from plan_days where week > 1; delete from program_days where week > 1;
--   alter table plan_days drop constraint plan_days_plan_week_weekday_key, add constraint plan_days_plan_id_weekday_key unique (plan_id, weekday), drop column week;
--   alter table program_days drop constraint program_days_pkey, add primary key (program_id, weekday), drop column week;
--   alter table training_plans drop column cycle_weeks; drop function plan_week(date, smallint, date);
--   y volver a correr las definiciones de assign_day/save_program/apply_program (0005/0043), portal_boot (0042) y due_reminders (0041).

alter table public.plan_days add column week smallint not null default 1 check (week between 1 and 16);
alter table public.plan_days drop constraint plan_days_plan_id_weekday_key;
alter table public.plan_days add constraint plan_days_plan_week_weekday_key unique (plan_id, week, weekday);
alter table public.training_plans add column cycle_weeks smallint not null default 1 check (cycle_weeks between 1 and 16);
alter table public.program_days add column week smallint not null default 1 check (week between 1 and 16);
alter table public.program_days drop constraint program_days_pkey;
alter table public.program_days add primary key (program_id, week, weekday);

create function public.plan_week(p_start date, p_cycle smallint, p_day date) returns int
language sql immutable as $$
  select case when coalesce(p_cycle, 1) <= 1 or p_day is null or p_start is null then 1
    else (greatest(0, (p_day - (p_start - (extract(isodow from p_start)::int - 1))) / 7) % p_cycle) + 1 end
$$;

-- assign_day con semana (por defecto 1: las llamadas viejas siguen igual).
drop function public.assign_day(uuid, integer, uuid);
create function public.assign_day(p_plan uuid, p_weekday integer, p_template uuid, p_week integer default 1) returns uuid
language plpgsql set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; did uuid; t record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_week is null or p_week not between 1 and 16 then raise exception 'bad week'; end if;
  select client_id into cid from training_plans where id = p_plan and workspace_id = ws and status = 'active';
  if cid is null then raise exception 'plan not found'; end if;
  select name, est_minutes, category, video_ref into t from routine_templates where id = p_template and workspace_id = ws;
  if t.name is null then raise exception 'template not found'; end if;
  delete from plan_days where plan_id = p_plan and weekday = p_weekday and week = p_week;
  insert into plan_days (workspace_id, client_id, plan_id, weekday, week, name, source_template_id, est_minutes, category, video_ref)
    values (ws, cid, p_plan, p_weekday, p_week, t.name, p_template, t.est_minutes, t.category, t.video_ref) returning id into did;
  insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds)
    select ws, cid, did, exercise_id, position, sets, reps, rest_seconds from template_items where template_id = p_template;
  if p_week > (select cycle_weeks from training_plans where id = p_plan) then update training_plans set cycle_weeks = p_week where id = p_plan; end if;
  return did;
end $$;
grant execute on function public.assign_day(uuid, integer, uuid, integer) to authenticated;

-- Semanas del plan del cliente (Jeff, desde su ficha): 1 = la misma semana siempre. Al bajar el número se borran las semanas sobrantes.
create function public.set_plan_weeks(p_plan uuid, p_weeks int) returns void
language plpgsql set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_weeks is null or p_weeks not between 1 and 16 then raise exception 'bad week'; end if;
  update training_plans set cycle_weeks = p_weeks where id = p_plan and workspace_id = ws and status = 'active';
  if not found then raise exception 'plan not found'; end if;
  delete from plan_days where plan_id = p_plan and week > p_weeks;
end $$;
grant execute on function public.set_plan_weeks(uuid, int) to authenticated;

-- Copia una semana del plan del cliente sobre otra (para no armar cada semana desde cero).
create function public.copy_plan_week(p_plan uuid, p_from int, p_to int) returns void
language plpgsql set search_path = public as $$
declare ws uuid := public.my_workspace(); d record; did uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_from = p_to or p_to not between 1 and 16 then raise exception 'bad week'; end if;
  if not exists (select 1 from training_plans where id = p_plan and workspace_id = ws and status = 'active') then raise exception 'plan not found'; end if;
  delete from plan_days where plan_id = p_plan and week = p_to;
  for d in select * from plan_days where plan_id = p_plan and week = p_from loop
    insert into plan_days (workspace_id, client_id, plan_id, weekday, week, name, source_template_id, est_minutes, category, video_ref, video_id, video_poster)
      values (d.workspace_id, d.client_id, p_plan, d.weekday, p_to, d.name, d.source_template_id, d.est_minutes, d.category, d.video_ref, d.video_id, d.video_poster) returning id into did;
    insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds, target_weight)
      select workspace_id, client_id, did, exercise_id, position, sets, reps, rest_seconds, target_weight from plan_items where plan_day_id = d.id;
  end loop;
  update training_plans set cycle_weeks = greatest(cycle_weeks, p_to) where id = p_plan;
end $$;
grant execute on function public.copy_plan_week(uuid, int, int) to authenticated;

-- p_days: [{"week":1,"weekday":1,"template_id":"..."}, ...] ("week" opcional = 1). Reemplaza los días del programa.
create or replace function public.save_program(p_id uuid, p_name text, p_weeks int, p_notes text, p_days jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pid uuid := p_id; d jsonb; wk int;
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
    wk := coalesce((d->>'week')::int, 1);
    if wk < 1 or wk > p_weeks then raise exception 'bad_week'; end if;
    if not exists (select 1 from routine_templates where id = (d->>'template_id')::uuid and workspace_id = ws) then raise exception 'template_not_found'; end if;
    insert into program_days (program_id, workspace_id, week, weekday, template_id) values (pid, ws, wk, (d->>'weekday')::smallint, (d->>'template_id')::uuid);
  end loop;
  return pid;
end $$;

-- Asigna el programa: plan nuevo con todas sus semanas. Si el programa solo tiene la semana 1, el plan repite esa semana.
create or replace function public.apply_program(p_client uuid, p_program uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pr record; pid uuid; d record; cyc int;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select name, weeks into pr from program_templates where id = p_program and workspace_id = ws and active;
  if pr.name is null then raise exception 'not_found'; end if;
  if not exists (select 1 from program_days where program_id = p_program) then raise exception 'no_days'; end if;
  pid := public.create_training_plan(p_client, pr.name);
  for d in select week, weekday, template_id from program_days where program_id = p_program order by week, weekday loop
    perform public.assign_day(pid, d.weekday, d.template_id, d.week);
  end loop;
  select max(week) into cyc from program_days where program_id = p_program;
  update training_plans set review_on = (now() at time zone 'America/Bogota')::date + pr.weeks * 7, cycle_weeks = greatest(1, cyc) where id = pid;
  return pid;
end $$;

CREATE OR REPLACE FUNCTION public.portal_boot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
        'level', tp.level, 'level_reason', tp.level_reason, 'review_on', tp.review_on, 'coach_note', tp.coach_note, 'cycle_weeks', tp.cycle_weeks,
        'plan_days', coalesce((select jsonb_agg(jsonb_build_object('id', pd.id, 'weekday', pd.weekday, 'week', pd.week, 'name', pd.name, 'est_minutes', pd.est_minutes,
            'category', pd.category, 'video_ref', pd.video_ref, 'video_id', pd.video_id, 'video_poster', pd.video_poster,
            'plan_items', coalesce((select jsonb_agg(jsonb_build_object('id', pi.id, 'position', pi.position, 'sets', pi.sets, 'reps', pi.reps,
                'rest_seconds', pi.rest_seconds, 'target_weight', pi.target_weight,
                'exercises', (select jsonb_build_object('name', e.name, 'muscle_group', e.muscle_group, 'equipment', e.equipment, 'video_ref', e.video_ref,
                    'instructions', e.instructions, 'image', e.image) from exercises e where e.id = pi.exercise_id)) order by pi.position)
              from plan_items pi where pi.plan_day_id = pd.id), '[]'::jsonb)) order by pd.week, pd.weekday)
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
end $function$
;


CREATE OR REPLACE FUNCTION public.due_reminders(p_secret text, p_kind text, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d date := (p_now at time zone 'America/Bogota')::date; wd int := extract(isodow from (p_now at time zone 'America/Bogota'))::int; r record;
begin
  if p_secret is null or not exists (select 1 from app_secrets where name = 'cron' and value = p_secret) then return; end if;
  if p_kind not in ('morning', 'midday', 'night', 'session') then return; end if;
  delete from reminder_log where created_at < p_now - interval '10 days';

  if p_kind = 'morning' then
    for r in select c.id, c.profile_id, (select pd.name from plan_days pd join training_plans tp on tp.id = pd.plan_id and tp.status = 'active'
                where tp.client_id = c.id and pd.weekday = wd and pd.week = public.plan_week(tp.starts_on, tp.cycle_weeks, d) and 'training' = any(p.features) limit 1) as day_name
             from clients c join plans p on p.id = c.plan_id where c.status = 'active' loop
      insert into reminder_log (kind, ref) values ('morning', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Buenos días'::text,
        (case when r.day_name is not null then 'Hoy toca ' || lower(r.day_name) || '. Tú puedes con esto, vamos con toda.' else 'Un día más para cuidarte. Tú puedes con esto.' end)::text,
        '/inicio'::text, 'morning'::text from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'midday' then
    for r in select c.id, c.profile_id from clients c where c.status = 'active' loop
      insert into reminder_log (kind, ref) values ('midday', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Espero que tu día vaya muy bien'::text,
        'Recuerda cumplir con tu plan de hoy. Tu coach está pendiente de ti.'::text, '/inicio'::text, 'midday'::text
        from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'night' then
    for r in select c.id, c.profile_id from clients c join plans p on p.id = c.plan_id
             where c.status = 'active' and 'daily_report' = any(p.features)
               and not exists (select 1 from daily_reports x where x.client_id = c.id and x.report_date = d) loop
      insert into reminder_log (kind, ref) values ('night', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Cuéntale a tu coach cómo te fue hoy'::text, 'Envía tu reporte diario antes de dormir.'::text, '/inicio'::text, 'report'::text
        from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'session' then
    for r in select b.id, b.workspace_id, c.profile_id, pr.full_name, sl.starts_at from bookings b
             join availability_slots sl on sl.id = b.slot_id join clients c on c.id = b.client_id join profiles pr on pr.id = c.profile_id
             where b.status = 'confirmed' and sl.starts_at > p_now and sl.starts_at <= p_now + interval '60 minutes' loop
      insert into reminder_log (kind, ref) values ('session', r.id::text) on conflict do nothing;
      if found then
        return query select s.endpoint, s.p256dh, s.auth, 'Tu sesión empieza pronto'::text, ('Hoy a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/inicio/agenda'::text, 'session'::text from push_subscriptions s where s.profile_id = r.profile_id;
        return query select s.endpoint, s.p256dh, s.auth, 'Sesión próxima'::text, (coalesce(r.full_name, 'Un cliente') || ' a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/coach/agenda'::text, 'session-coach'::text
          from push_subscriptions s join profiles co on co.id = s.profile_id where co.role = 'coach' and s.workspace_id = r.workspace_id;
      end if;
    end loop;
  end if;
end $function$
;

