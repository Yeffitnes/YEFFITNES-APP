-- 0034 · Cliente sin plan DENTRO de la app (decisión de Cristian, 27-oct): ve todo bloqueado y pide acceso a Jeff con un botón.
-- request_access(): solo un cliente PENDIENTE; anota la fecha y devuelve los dispositivos del coach para avisarle (máx. 1 aviso cada 12 h).
-- Al activarlo (pasar a 'active'), un disparador anota activated_at; activation_targets() le da al coach los dispositivos del cliente
-- para avisarle "Tu plan está activo" (una sola vez, en los 10 min siguientes).
-- Compatible con el código viejo de main: solo columnas nuevas y funciones nuevas.
-- Revertir: drop function public.request_access(), public.activation_targets(uuid); drop trigger clients_activation on public.clients;
--   drop function public._on_client_activation(); alter table public.clients drop column access_requested_at, drop column activated_at, drop column activation_notified_at;

alter table public.clients
  add column access_requested_at timestamptz,
  add column activated_at timestamptz,
  add column activation_notified_at timestamptz;

create function public.request_access() returns table (client_name text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); c record; nm text;
begin
  if public.my_role() is distinct from 'client' or cid is null then raise exception 'not_allowed'; end if;
  select * into c from clients where id = cid;
  if c.status <> 'pending' then raise exception 'not_pending'; end if;
  if c.access_requested_at is not null and c.access_requested_at > now() - interval '12 hours' then return; end if;   -- ya avisó hace poco
  update clients set access_requested_at = now() where id = cid;
  select full_name into nm from profiles where id = c.profile_id;
  return query select coalesce(nullif(nm, ''), 'Un cliente nuevo'), s.endpoint, s.p256dh, s.auth
    from push_subscriptions s join profiles pc on pc.id = s.profile_id where pc.role = 'coach' and s.workspace_id = c.workspace_id;
end $$;

create function public._on_client_activation() returns trigger language plpgsql as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then new.activated_at := now(); new.activation_notified_at := null; end if;
  return new;
end $$;
create trigger clients_activation before update of status on public.clients for each row execute function public._on_client_activation();

create function public.activation_targets(p_client uuid) returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update clients set activation_notified_at = now()
    where id = p_client and workspace_id = public.my_workspace() and status = 'active'
      and activation_notified_at is null and activated_at > now() - interval '10 minutes';
  if not found then return; end if;
  return query select s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = p_client;
end $$;

grant execute on function public.request_access(), public.activation_targets(uuid) to authenticated;
