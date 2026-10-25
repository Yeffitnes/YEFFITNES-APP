-- Clases grupales: un hueco puede tener varios cupos (capacity). 1 = sesión individual (comportamiento anterior).
alter table public.availability_slots add column capacity int not null default 1 check (capacity between 1 and 30);
drop index public.one_confirmed_booking_per_slot;
-- Un mismo cliente no puede estar dos veces en el mismo hueco; el límite de cupos lo valida la función (con el hueco bloqueado).
create unique index one_confirmed_booking_per_client_slot on public.bookings (slot_id, client_id) where status = 'confirmed';

drop function public.list_open_slots(timestamptz, timestamptz);
create function public.list_open_slots(p_from timestamptz, p_to timestamptz)
returns table (id uuid, starts_at timestamptz, duration_min int, kind text, taken boolean, mine boolean, capacity int, booked int)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.duration_min, s.kind,
    (select count(*) from bookings b where b.slot_id = s.id and b.status = 'confirmed') >= s.capacity,
    exists (select 1 from bookings b where b.slot_id = s.id and b.status = 'confirmed' and b.client_id = public.my_client_id()),
    s.capacity, (select count(*)::int from bookings b where b.slot_id = s.id and b.status = 'confirmed')
  from availability_slots s
  where public.my_role() = 'client' and exists (select 1 from clients c where c.profile_id = auth.uid() and c.status = 'active')
    and s.workspace_id = public.my_workspace() and s.status = 'open' and s.starts_at >= p_from and s.starts_at < p_to
  order by s.starts_at $$;

create or replace function public.book_slot(p_slot uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; s record; bid uuid;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  select workspace_id into ws from clients where id = cid and status = 'active';
  if ws is null then raise exception 'not_active'; end if;
  select * into s from availability_slots where id = p_slot and workspace_id = ws and status = 'open' and starts_at > now() for update;   -- bloquea el hueco: dos clientes a la vez no superan los cupos
  if s.id is null then raise exception 'slot_unavailable'; end if;
  if exists (select 1 from bookings b join availability_slots x on x.id = b.slot_id where b.client_id = cid and b.status = 'confirmed' and x.starts_at > now()) then
    raise exception 'already_has_booking'; end if;
  if (select count(*) from bookings where slot_id = p_slot and status = 'confirmed') >= s.capacity then raise exception 'slot_taken'; end if;
  begin
    insert into bookings (workspace_id, slot_id, client_id, booked_by) values (ws, p_slot, cid, 'client') returning id into bid;
  exception when unique_violation then raise exception 'slot_taken'; end;
  return bid;
end $$;

create or replace function public.coach_book_slot(p_slot uuid, p_client uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); bid uuid; s record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select * into s from availability_slots where id = p_slot and workspace_id = ws and status = 'open' for update;
  if s.id is null then raise exception 'slot_unavailable'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws) then raise exception 'client_not_found'; end if;
  if (select count(*) from bookings where slot_id = p_slot and status = 'confirmed') >= s.capacity then raise exception 'slot_taken'; end if;
  begin
    insert into bookings (workspace_id, slot_id, client_id, booked_by) values (ws, p_slot, p_client, 'coach') returning id into bid;
  exception when unique_violation then raise exception 'slot_taken'; end;
  return bid;
end $$;
