-- 0041 · Pedidos de Cristian tras probar Vercel (29-oct, noche).
-- 1) Tiempo real: avisos, respuestas de Jeff, reservas, reportes y actividad llegan a la pantalla sin salir y volver a entrar
--    (se agregan esas tablas a la publicación de Supabase Realtime; la seguridad la siguen poniendo las políticas RLS).
-- 2) Respuestas de Jeff a un entrenamiento con FOTO o VÍDEO, además de texto y audio. La foto vive en message-images
--    (<espacio>/<cliente>/<archivo>) y el vídeo es un vídeo de Bunny registrado para ESE cliente. Lo adjunto (foto, vídeo y audio)
--    se borra 7 días después de la respuesta; el texto queda en la ficha. review_workout acepta p_image / p_video / p_media.
-- 3) Agenda: el cliente solo puede cancelar en los 10 minutos siguientes a reservar (y solo lo que reservó él); después escribe a Jeff.
--    Jeff cancela cuando quiera, con motivo opcional (bookings.cancel_reason), y el aviso al cliente sale solo si la sesión aún no pasó.
-- 4) Vídeo del día y vídeo de la semana A LA VEZ (antes solo uno: el segundo reemplazaba al primero). Portada difuminada
--    (materials.poster y plan_days.video_poster: miniatura diminuta en data URL que la app toma del vídeo al subirlo).
-- 5) coach_attention(): lo que Jeff necesita ver de cada cliente activo (rutina, nutrición, días vacíos, última actividad,
--    último reporte, llamada del mes, revisión del plan). Solo el coach del espacio.
-- 6) portal_boot(): todo lo que el portal necesita al abrir, en un solo viaje a la base (perfil, ficha, rutina y registros).
-- Compatible con el código de main: columnas nuevas opcionales; funciones con los mismos nombres y parámetros nuevos con valor por defecto.
-- Revertir:
--   drop function public.portal_boot(), public.coach_attention(), public._purge_feedback_media(uuid);
--   drop function public.review_workout(uuid, text, text, text, text, boolean); recrear review_workout(uuid, text, text) de 0031;
--   drop function public.cancel_booking(uuid, text); recrear cancel_booking(uuid) de 0012;
--   drop function public.booking_cancel_targets(uuid); recrear la de 0038;
--   drop function public.list_materials(); recrear la de 0035; recrear set_featured_material, protect_coach_columns, _video_in_use,
--     feedback_targets y purge_messages de su migración anterior (0035, 0031, 0036, 0038 y 0028);
--   drop index public.one_featured_material_per_period; create unique index one_featured_material on public.materials (workspace_id) where is_featured;
--   alter table public.workout_logs drop column coach_comment_image, drop column coach_comment_video;
--   alter table public.bookings drop column cancel_reason; alter table public.materials drop column poster; alter table public.plan_days drop column video_poster;
--   alter publication supabase_realtime drop table public.nudges, public.workout_logs, public.bookings, public.daily_reports, public.activity_events;

-- 1) Tiempo real
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['nudges', 'workout_logs', 'bookings', 'daily_reports', 'activity_events'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- 2) Respuestas de Jeff con foto y vídeo
alter table public.workout_logs
  add column coach_comment_image text check (coach_comment_image is null or length(coach_comment_image) <= 300),
  add column coach_comment_video text references public.video_uploads(video_id) on delete set null;

-- El cliente nunca escribe lo del coach (ahora también la foto y el vídeo de la respuesta).
create or replace function public.protect_coach_columns() returns trigger language plpgsql as $$
begin
  if public.my_role() is distinct from 'coach' then
    if tg_op = 'INSERT' then
      new.coach_seen_at := null; new.coach_comment := null; new.coach_comment_audio := null; new.coach_comment_image := null; new.coach_comment_video := null;
    else
      new.coach_seen_at := old.coach_seen_at; new.coach_comment := old.coach_comment; new.coach_comment_audio := old.coach_comment_audio;
      new.coach_comment_image := old.coach_comment_image; new.coach_comment_video := old.coach_comment_video;
    end if;
  end if;
  return new;
end $$;

-- p_media = false (código viejo, 3 argumentos): la foto y el vídeo se dejan como estaban. p_media = true: se ponen los que llegan (null = quitar).
drop function public.review_workout(uuid, text, text);
create function public.review_workout(p_log uuid, p_comment text, p_audio text default null, p_image text default null, p_video text default null, p_media boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; old_a text; old_i text; old_v text;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  select client_id, coach_comment_audio, coach_comment_image, coach_comment_video into cid, old_a, old_i, old_v from workout_logs where id = p_log and workspace_id = ws;
  if cid is null then raise exception 'not found'; end if;
  if p_audio is not null and p_audio not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_audio'; end if;
  if p_media then
    if p_image is not null and p_image not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_image'; end if;
    if p_video is not null and not exists (select 1 from video_uploads u where u.video_id = p_video and u.client_id = cid and u.workspace_id = ws) then raise exception 'unknown_video'; end if;
    update workout_logs set coach_seen_at = now(), coach_comment = nullif(trim(p_comment), ''), coach_comment_audio = p_audio,
      coach_comment_image = p_image, coach_comment_video = p_video where id = p_log;
    if old_i is not null and old_i is distinct from p_image then insert into message_trash (workspace_id, kind, ref) values (ws, 'image', old_i); end if;
    if old_v is not null and old_v is distinct from p_video then insert into message_trash (workspace_id, kind, ref) values (ws, 'video', old_v); end if;
  else
    update workout_logs set coach_seen_at = now(), coach_comment = nullif(trim(p_comment), ''), coach_comment_audio = p_audio where id = p_log;
  end if;
  -- Lo reemplazado o quitado va a la basura para que la limpieza lo borre del almacenamiento (y de Bunny).
  if old_a is not null and old_a is distinct from p_audio then insert into message_trash (workspace_id, kind, ref) values (ws, 'audio', old_a); end if;
end $$;
grant execute on function public.review_workout(uuid, text, text, text, text, boolean) to authenticated;

-- Aviso al cliente: también cuando la respuesta es solo una foto o un vídeo.
create or replace function public.feedback_targets(p_log uuid) returns table (day_name text, log_date date, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid; dn text; ld date;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update workout_logs w set feedback_notified_at = now()
    where w.id = p_log and w.workspace_id = public.my_workspace() and w.coach_seen_at > now() - interval '10 minutes'
      and (w.coach_comment is not null or w.coach_comment_audio is not null or w.coach_comment_image is not null or w.coach_comment_video is not null)
      and (w.feedback_notified_at is null or w.feedback_notified_at < w.coach_seen_at)
    returning w.client_id, w.log_date into cid, ld;
  if cid is null then return; end if;
  select pd.name into dn from workout_logs w left join plan_days pd on pd.id = w.plan_day_id where w.id = p_log;
  return query select coalesce(dn, 'tu entrenamiento'), ld, s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = cid;
end $$;

-- El vídeo de una respuesta está en uso (si no, la limpieza de huérfanos lo borraría a las 3 h).
create or replace function public._video_in_use(p_video text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_reports where video_id = p_video)
      or exists (select 1 from messages where video_id = p_video)
      or exists (select 1 from plan_days where video_id = p_video)
      or exists (select 1 from materials where video_id = p_video)
      or exists (select 1 from clients where objective_video_id = p_video)
      or exists (select 1 from workout_logs where coach_comment_video = p_video) $$;
revoke all on function public._video_in_use(text) from public, anon, authenticated;

-- Lo adjunto a una respuesta (foto, vídeo, audio) se borra 7 días después de responder. El texto se queda.
create function public._purge_feedback_media(p_ws uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  with gone as (
    update workout_logs w set coach_comment_image = null, coach_comment_video = null, coach_comment_audio = null
    from (select id, coach_comment_image i, coach_comment_video v, coach_comment_audio a from workout_logs
          where workspace_id = p_ws and coach_seen_at < now() - interval '7 days'
            and (coach_comment_image is not null or coach_comment_video is not null or coach_comment_audio is not null)) old
    where w.id = old.id
    returning old.i, old.v, old.a)
  insert into message_trash (workspace_id, kind, ref)
    select p_ws, 'image', i from gone where i is not null
    union all select p_ws, 'video', v from gone where v is not null
    union all select p_ws, 'audio', a from gone where a is not null;
end $$;
revoke all on function public._purge_feedback_media(uuid) from public, anon, authenticated;

-- La limpieza que corre al abrir Mensajes (coach) también limpia lo adjunto de las respuestas vencidas.
create or replace function public.purge_messages() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  for r in select distinct client_id from messages where workspace_id = public.my_workspace()
           and ((read_at is not null and read_at < now() - interval '24 hours') or created_at < now() - interval '30 days') loop
    perform public._purge_client_messages(r.client_id);
  end loop;
  perform public._purge_feedback_media(public.my_workspace());
end $$;

-- 3) Agenda
alter table public.bookings add column cancel_reason text check (cancel_reason is null or length(cancel_reason) <= 120);

drop function public.cancel_booking(uuid);
create function public.cancel_booking(p_booking uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare b record; s record; r text := public.my_role();
begin
  select * into b from bookings where id = p_booking;
  if b.id is null then raise exception 'not_found'; end if;
  select * into s from availability_slots where id = b.slot_id;
  if r = 'coach' and b.workspace_id = public.my_workspace() then null;
  elsif r = 'client' and b.client_id = public.my_client_id() then
    -- Decisión de Cristian (29-oct): 10 minutos para arrepentirse de lo que reservó él mismo. Después, se pide a Jeff por mensaje.
    if b.booked_by <> 'client' or b.created_at < now() - interval '10 minutes' or s.starts_at <= now() then raise exception 'cancel_closed'; end if;
  else raise exception 'not_allowed'; end if;
  if b.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = r,
    cancel_reason = case when r = 'coach' then nullif(left(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g'), 120), '') end
    where id = p_booking;
end $$;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- Aviso al cliente cuando Jeff cancela: una sola vez, en los 10 min siguientes y solo si la sesión aún no pasó.
drop function public.booking_cancel_targets(uuid);
create function public.booking_cancel_targets(p_booking uuid) returns table (starts_at timestamptz, reason text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid; st timestamptz; why text;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update bookings b set cancel_notified_at = now()
    from availability_slots a
    where b.id = p_booking and a.id = b.slot_id and a.starts_at > now() and b.workspace_id = public.my_workspace() and b.status = 'cancelled'
      and b.cancelled_by = 'coach' and b.cancel_notified_at is null and b.cancelled_at > now() - interval '10 minutes'
    returning b.client_id, a.starts_at, b.cancel_reason into cid, st, why;
  if cid is null then return; end if;
  return query select st, why, s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = cid;
end $$;
grant execute on function public.booking_cancel_targets(uuid) to authenticated;

-- 4) Vídeo del día y de la semana a la vez + portada difuminada
drop index if exists public.one_featured_material;
create unique index one_featured_material_per_period on public.materials (workspace_id, featured_period) where is_featured;

alter table public.materials add column poster text
  check (poster is null or (length(poster) <= 16000 and poster ~ '^data:image/(jpeg|webp);base64,[A-Za-z0-9+/]+=*$'));
alter table public.plan_days add column video_poster text
  check (video_poster is null or (length(video_poster) <= 16000 and video_poster ~ '^data:image/(jpeg|webp);base64,[A-Za-z0-9+/]+=*$'));

create or replace function public.set_featured_material(p_id uuid, p_on boolean, p_period text default 'week') returns void
language plpgsql set search_path = public as $$
declare ws uuid := public.my_workspace(); today date := (now() at time zone 'America/Bogota')::date;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_period not in ('day','week') then raise exception 'bad_period'; end if;
  if not p_on then update materials set is_featured = false where id = p_id and workspace_id = ws; return; end if;
  -- Solo se reemplaza el destacado del MISMO tipo: el vídeo del día no quita el de la semana (pedido de Cristian, 29-oct).
  update materials set is_featured = false where workspace_id = ws and is_featured and (featured_period = p_period or id = p_id);
  update materials set is_featured = true, featured_period = p_period, featured_until = case p_period when 'day' then today else today + 6 end
    where id = p_id and workspace_id = ws and kind = 'video' and tier = 'basic' and published and (video_ref is not null or video_id is not null);
  if not found then raise exception 'not_featurable'; end if;
end $$;

drop function public.list_materials();
create function public.list_materials()
returns table (id uuid, kind text, title text, category text, tier text, published_on date, is_featured boolean, unlocked boolean, is_new boolean,
  featured_period text, private_video boolean, poster text, video_ref text)
language sql stable security definer set search_path = public as $$
  select m.id, m.kind, m.title, m.category, m.tier, m.published_on, public._featured_now(m), public.material_unlocked(m.tier),
    (not exists (select 1 from material_views v where v.material_id = m.id and v.client_id = public.my_client_id()) and m.published_on >= current_date - 14),
    m.featured_period, m.video_id is not null, m.poster,
    case when public.material_unlocked(m.tier) then m.video_ref end
  from materials m
  where public.my_role() = 'client' and exists (select 1 from clients c where c.profile_id = auth.uid() and c.status = 'active')
    and m.workspace_id = public.my_workspace() and m.published and (m.kind = 'article' or m.video_ref is not null or m.video_id is not null)
  order by m.published_on desc, m.created_at desc $$;
grant execute on function public.list_materials() to authenticated;

-- 5) Qué necesita Jeff de cada cliente activo (el panel arma las alertas con reglas simples).
create function public.coach_attention()
returns table (client_id uuid, features text[], plan_since date, activated_at timestamptz, created_at timestamptz,
  training_plan boolean, plan_days int, empty_days int, review_on date, nutrition boolean,
  last_workout date, last_report date, last_meal date, last_message timestamptz, last_call timestamptz, next_call timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, coalesce(p.features, '{}'::text[]), c.plan_since, c.activated_at, c.created_at,
    tp.id is not null, coalesce(d.n, 0), coalesce(d.empty, 0), tp.review_on,
    exists (select 1 from nutrition_plans n where n.client_id = c.id and n.active),
    (select max(w.log_date) from workout_logs w where w.client_id = c.id),
    (select max(r.report_date) from daily_reports r where r.client_id = c.id),
    (select max(m.log_date) from meal_logs m where m.client_id = c.id),
    (select max(x.created_at) from messages x where x.client_id = c.id and x.sender = 'client'),
    (select max(s.starts_at) from bookings b join availability_slots s on s.id = b.slot_id where b.client_id = c.id and b.status in ('confirmed', 'completed') and s.starts_at <= now()),
    (select min(s.starts_at) from bookings b join availability_slots s on s.id = b.slot_id where b.client_id = c.id and b.status = 'confirmed' and s.starts_at > now())
  from clients c
  left join plans p on p.id = c.plan_id
  left join training_plans tp on tp.client_id = c.id and tp.status = 'active'
  left join lateral (select count(*)::int as n, count(*) filter (where not exists (select 1 from plan_items i where i.plan_day_id = pd.id))::int as empty
                     from plan_days pd where pd.plan_id = tp.id) d on true
  where public.my_role() = 'coach' and c.workspace_id = public.my_workspace() and c.status = 'active' $$;
grant execute on function public.coach_attention() to authenticated;

-- 6) Arranque del portal en un solo viaje. Con los permisos de quien llama (RLS): cada cliente solo recibe lo suyo.
create function public.portal_boot() returns jsonb language plpgsql stable security invoker set search_path = public as $$
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
        'coach_seen_at', w.coach_seen_at, 'feedback_seen_at', w.feedback_seen_at,
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
grant execute on function public.portal_boot() to authenticated;
