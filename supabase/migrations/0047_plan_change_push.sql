-- 0047 · Aviso al cliente cuando Jeff cambia su plan (pedido de Cristian, 2-nov): "cuando cambia el plan de nutrición o entrenamiento
-- debe llegar notificación". Antes no existía.
--   * plan_change_targets(cliente, 'training'|'nutrition'): solo el coach de ese espacio, solo clientes activos; devuelve los teléfonos
--     del cliente para la notificación. Como Jeff suele cambiar varias cosas seguidas (varios días, pesos…), sale UNA notificación por
--     cliente y tipo cada 30 minutos (tabla plan_notices); lo demás se guarda igual, solo no vuelve a sonar.
--   * my_push_devices(): cuántos teléfonos con avisos tiene la cuenta con sesión (para el botón "Probar avisos").
-- Compatible con main (todo nuevo).
-- Revertir: drop function public.plan_change_targets(uuid, text), public.my_push_devices(); drop table public.plan_notices;

create table public.plan_notices (
  client_id uuid not null references public.clients on delete cascade,
  kind text not null check (kind in ('training','nutrition')),
  sent_at timestamptz not null default now(),
  primary key (client_id, kind)
);
alter table public.plan_notices enable row level security;   -- sin políticas: solo la función la toca

create function public.plan_change_targets(p_client uuid, p_kind text) returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); ok boolean;
begin
  if public.my_role() is distinct from 'coach' or p_kind not in ('training','nutrition') then return; end if;
  if not exists (select 1 from clients c where c.id = p_client and c.workspace_id = ws and c.status = 'active') then return; end if;
  insert into plan_notices (client_id, kind) values (p_client, p_kind)
    on conflict (client_id, kind) do update set sent_at = now() where plan_notices.sent_at < now() - interval '30 minutes'
    returning true into ok;
  if ok is null then return; end if;   -- ya se le avisó hace menos de 30 min
  return query select s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = p_client;
end $$;
revoke all on function public.plan_change_targets(uuid, text) from public, anon;
grant execute on function public.plan_change_targets(uuid, text) to authenticated;

create function public.my_push_devices() returns table (endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select s.endpoint, s.p256dh, s.auth from push_subscriptions s where s.profile_id = auth.uid() and auth.uid() is not null $$;
revoke all on function public.my_push_devices() from public, anon;
grant execute on function public.my_push_devices() to authenticated;
