-- 0063 (22-nov, noche, pedido de Cristian): recordatorios de las sesiones agendadas, al cliente y a Yeff.
--   Cliente: el día anterior dos veces (con el aviso del mediodía y con el de la noche), el mismo día temprano (con el de la
--   mañana) y 1 hora antes (ya existía, due_reminders 'session'). Si Yeff lo agenda, le llega "Yeff te agendó una sesión".
--   Yeff: al reservar un cliente (ya existía, 0060), y un resumen de "sesiones de mañana" (mediodía y noche) y "sesiones de hoy"
--   (mañana), además del aviso 1 hora antes (ya existía).
-- No hay tareas programadas nuevas: usa yeffitnes-buenosdias (morning), -mediodia (midday) y -noche (night), que ya llaman a
-- /api/cron/reminders. Cada aviso sale una sola vez (reminder_log). Compatible con el código de main (solo agrega).
--   Panel de Yeff: "Recordarle" en la tarjeta de sesiones de hoy y mañana (session_remind_targets), una vez al día por sesión.
-- Revertir: drop function due_session_notices_cron(text, text); drop function booking_client_targets(uuid);
--           drop function session_remind_targets(uuid); drop function _hora_co(timestamptz);
--           alter table bookings drop column client_book_notified_at, drop column coach_reminded_at;

alter table public.bookings add column if not exists client_book_notified_at timestamptz, add column if not exists coach_reminded_at timestamptz;

-- "7:00 a. m." en hora de Colombia
create or replace function public._hora_co(t timestamptz) returns text language sql immutable set search_path = public as $$
  select to_char(t at time zone 'America/Bogota', 'FMHH12:MI') || case when extract(hour from t at time zone 'America/Bogota') < 12 then ' a. m.' else ' p. m.' end
$$;

create or replace function public.due_session_notices_cron(p_secret text, p_kind text)
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Bogota')::date; d date; r record; w record; tomorrow boolean;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  if p_kind not in ('morning', 'midday', 'night') then return; end if;
  tomorrow := p_kind <> 'morning';
  d := case when tomorrow then today + 1 else today end;

  -- Cliente: una por reserva y por momento (mediodía, noche, mañana del día)
  for r in select b.id, c.profile_id, s.starts_at, s.kind from bookings b
           join availability_slots s on s.id = b.slot_id join clients c on c.id = b.client_id
           where b.status = 'confirmed' and (s.starts_at at time zone 'America/Bogota')::date = d and s.starts_at > now() + interval '60 minutes'
  loop
    insert into reminder_log (kind, ref) values ('sess-' || p_kind, r.id::text) on conflict do nothing;
    if found then return query select ps.endpoint, ps.p256dh, ps.auth,
      (case when tomorrow then 'Mañana tienes sesión con Yeff' else 'Hoy tienes sesión con Yeff' end)::text,
      ('A las ' || public._hora_co(r.starts_at) || ' · ' || (case r.kind when 'initial' then 'llamada inicial' when 'followup' then 'seguimiento' else 'sesión' end)
        || (case when tomorrow then '. Te esperamos.' else '. Te avisamos 1 hora antes.' end))::text,
      '/inicio/agenda'::text, ('sess-' || r.id)::text
      from push_subscriptions ps where ps.profile_id = r.profile_id; end if;
  end loop;

  -- Yeff: un solo aviso con todas las sesiones del día (por espacio)
  for w in select b.workspace_id, count(*)::int as n,
             string_agg(coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Cliente') || ' ' || public._hora_co(s.starts_at), ', ' order by s.starts_at) as txt
           from bookings b join availability_slots s on s.id = b.slot_id join clients c on c.id = b.client_id join profiles p on p.id = c.profile_id
           where b.status = 'confirmed' and (s.starts_at at time zone 'America/Bogota')::date = d and s.starts_at > now()
           group by b.workspace_id
  loop
    insert into reminder_log (kind, ref) values ('sess-coach-' || p_kind, w.workspace_id || ':' || d) on conflict do nothing;
    if found then return query select ps.endpoint, ps.p256dh, ps.auth,
      ((case when tomorrow then 'Mañana: ' else 'Hoy: ' end) || w.n || (case when w.n = 1 then ' sesión agendada' else ' sesiones agendadas' end))::text,
      (left(w.txt, 150) || '.')::text, '/coach#sesiones'::text, ('sess-coach-' || d)::text
      from push_subscriptions ps join profiles pc on pc.id = ps.profile_id and pc.role = 'coach' where ps.workspace_id = w.workspace_id; end if;
  end loop;
end $$;
revoke all on function public.due_session_notices_cron(text, text) from public;
grant execute on function public.due_session_notices_cron(text, text) to anon, authenticated;

-- Yeff agendó a un cliente → notificación al cliente (la pide el coach justo después; ruta /api/push/booking-client).
-- Solo el coach del espacio, reservas que hizo él hace menos de 10 min, una sola vez.
create or replace function public.booking_client_targets(p_booking uuid) returns table (starts_at timestamptz, kind text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update bookings set client_book_notified_at = now() where id = p_booking and workspace_id = public.my_workspace() and status = 'confirmed'
    and booked_by = 'coach' and created_at > now() - interval '10 minutes' and client_book_notified_at is null;
  if not found then return; end if;
  select bk.client_id, s.starts_at, s.kind into b from bookings bk join availability_slots s on s.id = bk.slot_id where bk.id = p_booking;
  return query select b.starts_at, b.kind, ps.endpoint, ps.p256dh, ps.auth
    from push_subscriptions ps join clients c on c.profile_id = ps.profile_id where c.id = b.client_id;
end $$;
revoke all on function public.booking_client_targets(uuid) from public, anon;
grant execute on function public.booking_client_targets(uuid) to authenticated;

-- "Recordarle" desde el panel de Yeff: aviso al cliente con la hora de su sesión. Solo el coach del espacio, sesiones confirmadas
-- que aún no empiezan, una vez al día por sesión (coach_reminded_at lo ve el panel para mostrar "Recordado").
create or replace function public.session_remind_targets(p_booking uuid) returns table (starts_at timestamptz, kind text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare b record; today date := (now() at time zone 'America/Bogota')::date;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  select bk.id, bk.client_id, s.starts_at, s.kind into b from bookings bk join availability_slots s on s.id = bk.slot_id
    where bk.id = p_booking and bk.workspace_id = public.my_workspace() and bk.status = 'confirmed' and s.starts_at > now();
  if b.id is null then return; end if;
  update bookings set coach_reminded_at = now() where id = p_booking
    and (coach_reminded_at is null or (coach_reminded_at at time zone 'America/Bogota')::date < today);
  if not found then return; end if;
  return query select b.starts_at, b.kind, ps.endpoint, ps.p256dh, ps.auth
    from push_subscriptions ps join clients c on c.profile_id = ps.profile_id where c.id = b.client_id;
end $$;
revoke all on function public.session_remind_targets(uuid) from public, anon;
grant execute on function public.session_remind_targets(uuid) to authenticated;
