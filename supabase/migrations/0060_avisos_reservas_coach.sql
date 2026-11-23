-- 0060 (22-nov, pedido de Cristian): a Yeff le llega una notificación cuando un cliente RESERVA una sesión y cuando la CANCELA.
-- Antes solo le llegaban mensajes, solicitudes y entrenamientos terminados. Igual que las demás: la pide el propio cliente justo
-- después de reservar o cancelar (ruta /api/push/booking-coach) y la base decide si toca y a qué teléfonos (los del coach del
-- espacio), una sola vez por reserva y por evento.
-- Revertir: drop function booking_coach_targets(uuid, text); alter table bookings drop column coach_book_notified_at, drop column coach_cancel_notified_at;

alter table public.bookings add column if not exists coach_book_notified_at timestamptz, add column if not exists coach_cancel_notified_at timestamptz;

create or replace function public.booking_coach_targets(p_booking uuid, p_kind text) returns table (client_name text, starts_at timestamptz, kind text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); b record;
begin
  if cid is null or p_kind not in ('booked', 'cancelled') then return; end if;
  select bk.id, bk.workspace_id, bk.client_id, s.starts_at, s.kind, p.full_name into b
    from bookings bk join availability_slots s on s.id = bk.slot_id join clients c on c.id = bk.client_id join profiles p on p.id = c.profile_id
    where bk.id = p_booking and bk.client_id = cid;
  if b.id is null then return; end if;
  if p_kind = 'booked' then
    update bookings set coach_book_notified_at = now() where id = p_booking and status = 'confirmed' and booked_by = 'client'
      and created_at > now() - interval '10 minutes' and coach_book_notified_at is null;
  else
    update bookings set coach_cancel_notified_at = now() where id = p_booking and status = 'cancelled' and cancelled_by = 'client'
      and cancelled_at > now() - interval '10 minutes' and coach_cancel_notified_at is null;
  end if;
  if not found then return; end if;
  return query select coalesce(nullif(b.full_name, ''), 'Un cliente'), b.starts_at, b.kind, s.endpoint, s.p256dh, s.auth
    from push_subscriptions s join profiles pc on pc.id = s.profile_id where pc.role = 'coach' and s.workspace_id = b.workspace_id;
end $$;
revoke all on function public.booking_coach_targets(uuid, text) from public, anon;
grant execute on function public.booking_coach_targets(uuid, text) to authenticated;
