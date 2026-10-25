-- Agenda: Jeff publica huecos; el cliente reserva. Un hueco = una sesión individual (sin clases grupales).
-- Reglas PROPUESTAS (no definidas por Jeff; ajustables en las funciones): 1 reserva futura por cliente a la vez;
-- el cliente cancela hasta 24 h antes (el coach, siempre). Las reglas viven en la base, no en la pantalla.
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  starts_at timestamptz not null,
  duration_min int not null default 30 check (duration_min between 10 and 240),
  kind text not null default 'initial' check (kind in ('initial','followup')),
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now(),
  unique (workspace_id, starts_at)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  slot_id uuid not null references public.availability_slots on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  booked_by text not null check (booked_by in ('client','coach')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz, cancelled_by text check (cancelled_by in ('client','coach'))
);
-- Un hueco confirmado solo puede tener UNA reserva, aunque dos personas pulsen a la vez.
create unique index one_confirmed_booking_per_slot on public.bookings (slot_id) where status = 'confirmed';
create index on public.bookings (client_id, status);
create index on public.availability_slots (workspace_id, starts_at);
alter table public.availability_slots enable row level security;
alter table public.bookings enable row level security;
create policy slots_coach on public.availability_slots for all using (workspace_id = public.my_workspace() and public.my_role()='coach') with check (workspace_id = public.my_workspace() and public.my_role()='coach');
create policy bk_coach on public.bookings for all using (workspace_id = public.my_workspace() and public.my_role()='coach') with check (workspace_id = public.my_workspace() and public.my_role()='coach');
-- El cliente solo LEE sus reservas y el hueco de ellas. Para reservar/cancelar usa funciones (sin escritura directa).
create policy bk_client_read on public.bookings for select using (client_id = (select public.my_client_id()));
create policy slots_client_read on public.availability_slots for select using (exists (select 1 from public.bookings b where b.slot_id = id and b.client_id = (select public.my_client_id())));

-- No se puede cancelar un hueco que ya tiene una reserva confirmada (primero se cancela la reserva).
create function public.slot_cancel_guard() returns trigger language plpgsql as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and exists (select 1 from public.bookings where slot_id = new.id and status = 'confirmed') then
    raise exception 'has_booking'; end if;
  return new;
end $$;
create trigger slot_cancel_guard before update on public.availability_slots for each row execute function public.slot_cancel_guard();

-- Huecos abiertos del espacio del cliente, SIN datos de otros clientes (solo si están ocupados y si el ocupado es él).
create function public.list_open_slots(p_from timestamptz, p_to timestamptz)
returns table (id uuid, starts_at timestamptz, duration_min int, kind text, taken boolean, mine boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.duration_min, s.kind,
    exists (select 1 from bookings b where b.slot_id = s.id and b.status = 'confirmed'),
    exists (select 1 from bookings b where b.slot_id = s.id and b.status = 'confirmed' and b.client_id = public.my_client_id())
  from availability_slots s
  where public.my_role() = 'client' and exists (select 1 from clients c where c.profile_id = auth.uid() and c.status = 'active')
    and s.workspace_id = public.my_workspace() and s.status = 'open' and s.starts_at >= p_from and s.starts_at < p_to
  order by s.starts_at $$;

create function public.book_slot(p_slot uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); ws uuid; s record; bid uuid;
begin
  if cid is null then raise exception 'not_allowed'; end if;
  select workspace_id into ws from clients where id = cid and status = 'active';
  if ws is null then raise exception 'not_active'; end if;
  select * into s from availability_slots where id = p_slot and workspace_id = ws and status = 'open' and starts_at > now();
  if s.id is null then raise exception 'slot_unavailable'; end if;
  if exists (select 1 from bookings b join availability_slots x on x.id = b.slot_id where b.client_id = cid and b.status = 'confirmed' and x.starts_at > now()) then
    raise exception 'already_has_booking'; end if;
  begin
    insert into bookings (workspace_id, slot_id, client_id, booked_by) values (ws, p_slot, cid, 'client') returning id into bid;
  exception when unique_violation then raise exception 'slot_taken'; end;
  return bid;
end $$;

create function public.coach_book_slot(p_slot uuid, p_client uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); bid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from availability_slots where id = p_slot and workspace_id = ws and status = 'open') then raise exception 'slot_unavailable'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws) then raise exception 'client_not_found'; end if;
  begin
    insert into bookings (workspace_id, slot_id, client_id, booked_by) values (ws, p_slot, p_client, 'coach') returning id into bid;
  exception when unique_violation then raise exception 'slot_taken'; end;
  return bid;
end $$;

create function public.cancel_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record; s record; r text := public.my_role();
begin
  select * into b from bookings where id = p_booking;
  if b.id is null then raise exception 'not_found'; end if;
  select * into s from availability_slots where id = b.slot_id;
  if r = 'coach' and b.workspace_id = public.my_workspace() then null;
  elsif r = 'client' and b.client_id = public.my_client_id() then
    if s.starts_at - now() < interval '24 hours' then raise exception 'too_late'; end if;
  else raise exception 'not_allowed'; end if;
  if b.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = r where id = p_booking;
end $$;
