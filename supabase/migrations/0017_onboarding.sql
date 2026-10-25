-- Bienvenida (onboarding): se muestra una vez al cliente activo. Solo se marca con la función; el cliente no escribe en clients.
alter table public.clients add column onboarded_at timestamptz;
create function public.complete_onboarding() returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'client' then raise exception 'not_allowed'; end if;
  update clients set onboarded_at = coalesce(onboarded_at, now()) where id = public.my_client_id() and status = 'active';
  if not found then raise exception 'not_allowed'; end if;
end $$;
