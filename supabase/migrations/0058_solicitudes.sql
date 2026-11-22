-- 0058 (22-nov, pedido de Cristian): lo que los clientes le piden a Yeff sale como PRIORITARIO en su panel (dashboard y campana),
-- no solo como notificación al teléfono (que puede no llegar).
--   - Acceso: ya se guardaba en clients.access_requested_at (0034). Aquí solo se suma "clients" al tiempo real para que el
--     panel lo muestre al instante.
--   - Funciones del plan (nuevo): un cliente activo cuyo plan no incluye, por ejemplo, Nutrición, toca "Pedírselo a Yeff".
--     Queda en feature_requests y le llega una notificación a Yeff (como mucho una vez cada 12 h por cliente y función).
--     Se cierra cuando Yeff toca "Listo" o, sola, cuando el plan del cliente pasa a incluir esa función.
-- Revertir:
--   drop trigger clients_feature_requests on clients; drop function _close_feature_requests();
--   drop function request_feature(text); drop function resolve_feature_request(uuid); drop table feature_requests;
--   alter publication supabase_realtime drop table public.feature_requests, public.clients;

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  feature text not null check (feature in ('training', 'daily_report', 'progress', 'announcements', 'nutrition', 'education_basic', 'education_full')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create unique index if not exists feature_requests_open on public.feature_requests (client_id, feature) where handled_at is null;
create index if not exists feature_requests_ws on public.feature_requests (workspace_id) where handled_at is null;
alter table public.feature_requests enable row level security;
-- Solo lectura directa; crear y cerrar va por las funciones de abajo.
create policy fr_coach_read on public.feature_requests for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
create policy fr_client_read on public.feature_requests for select using (client_id = public.my_client_id());
grant select on public.feature_requests to authenticated;

-- El cliente pide una función que su plan no incluye. Devuelve los teléfonos del coach solo cuando hay que avisar.
create or replace function public.request_feature(p_feature text) returns table (client_name text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); c record; nm text; prev timestamptz;
begin
  if public.my_role() is distinct from 'client' or cid is null then raise exception 'not_allowed'; end if;
  select cl.id, cl.workspace_id, cl.status, cl.profile_id, coalesce(p.features, '{}') as features into c from clients cl left join plans p on p.id = cl.plan_id where cl.id = cid;
  if c.status <> 'active' then raise exception 'not_active'; end if;
  if p_feature not in ('training', 'daily_report', 'progress', 'announcements', 'nutrition', 'education_basic', 'education_full') then raise exception 'bad_feature'; end if;
  if p_feature = any(c.features) then raise exception 'already_included'; end if;
  select created_at into prev from feature_requests where client_id = cid and feature = p_feature and handled_at is null;
  if prev is not null and prev > now() - interval '12 hours' then return; end if;   -- ya lo pidió hace poco: no se repite el aviso
  if prev is null then insert into feature_requests (workspace_id, client_id, feature) values (c.workspace_id, cid, p_feature);
  else update feature_requests set created_at = now() where client_id = cid and feature = p_feature and handled_at is null; end if;
  select full_name into nm from profiles where id = c.profile_id;
  return query select coalesce(nullif(nm, ''), 'Un cliente'), s.endpoint, s.p256dh, s.auth
    from push_subscriptions s join profiles pc on pc.id = s.profile_id where pc.role = 'coach' and s.workspace_id = c.workspace_id;
end $$;
revoke all on function public.request_feature(text) from public, anon;
grant execute on function public.request_feature(text) to authenticated;

-- Yeff la marca como atendida.
create or replace function public.resolve_feature_request(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update feature_requests set handled_at = now() where id = p_id and workspace_id = public.my_workspace() and handled_at is null;
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.resolve_feature_request(uuid) from public, anon;
grant execute on function public.resolve_feature_request(uuid) to authenticated;

-- Cuando el plan del cliente pasa a incluir lo que pidió, la solicitud se cierra sola.
create or replace function public._close_feature_requests() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update feature_requests f set handled_at = now()
    from plans p where p.id = new.plan_id and f.client_id = new.id and f.handled_at is null and f.feature = any(p.features);
  return new;
end $$;
revoke all on function public._close_feature_requests() from public, anon, authenticated;
drop trigger if exists clients_feature_requests on public.clients;
create trigger clients_feature_requests after update of plan_id, status on public.clients for each row execute function public._close_feature_requests();

-- Tiempo real: el panel se entera al momento de una solicitud nueva o de un cliente que pide acceso.
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['feature_requests', 'clients'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
