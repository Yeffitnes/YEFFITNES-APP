-- 0026 · Corrige la lectura del horario de la propia reserva del cliente.
-- Error en 0012: dentro del exists(), "id" se resolvía como bookings.id y no como availability_slots.id,
-- así el cliente nunca veía el horario de su reserva y Hoy decía "aún no tienes una sesión reservada".
-- Revertir: volver a crear la política con la condición anterior (no recomendado: reintroduce el fallo).
drop policy if exists slots_client_read on public.availability_slots;
create policy slots_client_read on public.availability_slots for select
  using (exists (select 1 from public.bookings b where b.slot_id = availability_slots.id and b.client_id = (select public.my_client_id())));

-- Destachar una serie: el cliente puede deshacer una serie que marcó por error (solo la suya, de ayer a mañana).
create function public.unlog_set(p_date date, p_item uuid, p_set int) returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id();
begin
  if cid is null or not public.client_has_feature('training') then raise exception 'not_allowed'; end if;
  if abs(p_date - current_date) > 1 then raise exception 'invalid_date'; end if;
  delete from set_logs where client_id = cid and plan_item_id = p_item and set_number = p_set and kind = 'work'
    and workout_log_id in (select id from workout_logs where client_id = cid and log_date = p_date);
end $$;
revoke all on function public.unlog_set(date, uuid, int) from public, anon;
grant execute on function public.unlog_set(date, uuid, int) to authenticated;
-- Revertir: drop function public.unlog_set(date, uuid, int);
