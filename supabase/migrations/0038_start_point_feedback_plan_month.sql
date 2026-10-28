-- 0038 · Pedidos de Cristian (28-oct, tarde).
-- 1) Punto de partida OBLIGATORIO en la bienvenida: peso (kg) y estatura (cm), para todos los clientes.
--    save_start_point() lo guarda en la ficha (clients) y, si el plan incluye Progreso, también como medición de hoy.
-- 2) Respuestas de Jeff a un entrenamiento como aviso aparte en Hoy ("Respuesta a tu entrenamiento de Pierna, martes 27"),
--    sin poder responder: el cliente solo lo marca como visto (mark_feedback_seen). Si Jeff cambia su respuesta, vuelve a salir.
--    feedback_targets() le avisa al teléfono del cliente cuando Jeff responde (una vez por respuesta).
-- Notificación al cliente cuando Jeff responde (una por respuesta; si Jeff la cambia, se puede volver a avisar).
alter table public.workout_logs add column feedback_notified_at timestamptz;
create function public.feedback_targets(p_log uuid) returns table (day_name text, log_date date, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid; dn text; ld date;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update workout_logs w set feedback_notified_at = now()
    where w.id = p_log and w.workspace_id = public.my_workspace() and w.coach_seen_at > now() - interval '10 minutes'
      and (w.coach_comment is not null or w.coach_comment_audio is not null)
      and (w.feedback_notified_at is null or w.feedback_notified_at < w.coach_seen_at)
    returning w.client_id, w.log_date into cid, ld;
  if cid is null then return; end if;
  select pd.name into dn from workout_logs w left join plan_days pd on pd.id = w.plan_day_id where w.id = p_log;
  return query select coalesce(dn, 'tu entrenamiento'), ld, s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = cid;
end $$;

-- 3) Plan mensual: clients.plan_since (fecha de inicio del mes de plan). Se pone sola al asignar o cambiar el plan.
--    A los 30 días el plan cuenta como vencido: Jeff lo ve en su panel y le llega UNA notificación (due_plan_expiry_cron,
--    en la tarea de la mañana). Jeff renueva (renew_plan) o lo quita a mano.
-- 4) Jeff cancela la sesión de un cliente: booking_cancel_targets() le da sus dispositivos para avisarle (una sola vez).
-- Compatible con el código de main: solo columnas y funciones nuevas (y un disparador que solo escribe plan_since).
-- Revertir:
--   drop function public.save_start_point(numeric, numeric), public.mark_feedback_seen(uuid), public.feedback_targets(uuid), public.renew_plan(uuid),
--     public.due_plan_expiry_cron(text), public.booking_cancel_targets(uuid);
--   drop trigger clients_plan_since on public.clients; drop function public._on_plan_change();
--   alter table public.clients drop column height_cm, drop column start_weight_kg, drop column start_point_at,
--     drop column plan_since, drop column plan_expiry_notified_on;
--   alter table public.workout_logs drop column feedback_seen_at, drop column feedback_notified_at; alter table public.bookings drop column cancel_notified_at;

-- 1) Punto de partida
alter table public.clients
  add column height_cm numeric(4,1) check (height_cm between 100 and 250),
  add column start_weight_kg numeric(5,1) check (start_weight_kg between 20 and 400),
  add column start_point_at timestamptz;

create function public.save_start_point(p_weight numeric, p_height numeric) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; today date := (now() at time zone 'America/Bogota')::date;
begin
  if public.my_role() is distinct from 'client' or cid is null then raise exception 'not_allowed'; end if;
  if p_weight is null or p_weight < 20 or p_weight > 400 then raise exception 'bad_weight'; end if;
  if p_height is null or p_height < 100 or p_height > 250 then raise exception 'bad_height'; end if;
  update clients set height_cm = round(p_height, 1), start_weight_kg = round(p_weight, 1), start_point_at = now()
    where id = cid returning workspace_id into ws;
  if public.client_has_feature('progress') then
    insert into measurements (workspace_id, client_id, measured_on, weight_kg, recorded_by) values (ws, cid, today, round(p_weight, 1), 'client')
      on conflict (client_id, measured_on) do update set weight_kg = excluded.weight_kg;
  end if;
end $$;

-- 2) Respuesta de Jeff vista por el cliente
alter table public.workout_logs add column feedback_seen_at timestamptz;
create function public.mark_feedback_seen(p_log uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'client' then raise exception 'not_allowed'; end if;
  update workout_logs set feedback_seen_at = now() where id = p_log and client_id = public.my_client_id();
  if not found then raise exception 'not_found'; end if;
end $$;

-- 3) Plan mensual
alter table public.clients add column plan_since date, add column plan_expiry_notified_on date;
-- Clientes que ya tienen plan: empiezan a contar desde que se activaron (o desde hoy si no se sabe).
update public.clients set plan_since = coalesce((activated_at at time zone 'America/Bogota')::date, (now() at time zone 'America/Bogota')::date)
  where plan_id is not null;
create function public._on_plan_change() returns trigger language plpgsql as $$
begin
  if new.plan_id is null then new.plan_since := null;
  elsif new.plan_id is distinct from old.plan_id then new.plan_since := (now() at time zone 'America/Bogota')::date; new.plan_expiry_notified_on := null;
  end if;
  return new;
end $$;
create trigger clients_plan_since before update of plan_id on public.clients for each row execute function public._on_plan_change();

create function public.renew_plan(p_client uuid) returns date
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Bogota')::date;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update clients set plan_since = d, plan_expiry_notified_on = null
    where id = p_client and workspace_id = public.my_workspace() and plan_id is not null;
  if not found then raise exception 'not_found'; end if;
  return d;
end $$;

-- Tarea de la mañana: a cada coach con planes recién vencidos le llega un aviso (una vez por vencimiento).
create function public.due_plan_expiry_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, n int, names text)
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Bogota')::date;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  return query
  with due as (
    update clients c set plan_expiry_notified_on = today
    where c.plan_id is not null and c.status = 'active' and c.plan_since is not null and c.plan_since + 30 <= today
      and (c.plan_expiry_notified_on is null or c.plan_expiry_notified_on < c.plan_since + 30)
    returning c.workspace_id, c.profile_id
  ), per_ws as (
    select d.workspace_id, count(*)::int as cnt, string_agg(coalesce(nullif(p.full_name, ''), 'Cliente'), ', ' order by p.full_name) as nm
    from due d left join profiles p on p.id = d.profile_id group by d.workspace_id
  )
  select s.endpoint, s.p256dh, s.auth, w.cnt, w.nm
  from per_ws w join push_subscriptions s on s.workspace_id = w.workspace_id join profiles pc on pc.id = s.profile_id and pc.role = 'coach';
end $$;
revoke all on function public.due_plan_expiry_cron(text) from public;

-- 4) Jeff cancela una sesión: aviso al cliente (una sola vez, en los 10 min siguientes)
alter table public.bookings add column cancel_notified_at timestamptz;
create function public.booking_cancel_targets(p_booking uuid) returns table (starts_at timestamptz, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid; st timestamptz;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update bookings b set cancel_notified_at = now()
    where b.id = p_booking and b.workspace_id = public.my_workspace() and b.status = 'cancelled' and b.cancelled_by = 'coach'
      and b.cancel_notified_at is null and b.cancelled_at > now() - interval '10 minutes'
    returning b.client_id into cid;
  if cid is null then return; end if;
  select a.starts_at into st from bookings b join availability_slots a on a.id = b.slot_id where b.id = p_booking;
  return query select st, s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = cid;
end $$;

grant execute on function public.save_start_point(numeric, numeric), public.mark_feedback_seen(uuid), public.feedback_targets(uuid), public.renew_plan(uuid),
  public.booking_cancel_targets(uuid) to authenticated;
grant execute on function public.due_plan_expiry_cron(text) to anon, authenticated;
