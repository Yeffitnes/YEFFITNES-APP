-- 0037 · Avisos de Jeff más confiables y visibles en la app (27-oct, noche).
-- Antes el aviso solo existía como notificación del teléfono: si el cliente no tenía avisos activos (o fallaba el envío) no llegaba a ningún lado,
-- y si la llamada al servidor fallaba tampoco quedaba guardado (por eso los botones "Avisar" volvían a aparecer).
-- Ahora: 1) send_nudge() guarda el aviso directo desde el navegador del coach (no depende del envío push);
--        2) el CLIENTE ve sus avisos de hoy en su pantalla Hoy ("Jeff te está esperando…");
--        3) nudge_push_targets() entrega una sola vez los dispositivos del cliente para la notificación del teléfono.
-- Compatible con lo anterior: nudge_targets() de 0036 sigue existiendo.
-- Revertir: drop function public.send_nudge(uuid, text), public.nudge_push_targets(uuid); drop policy nudges_client_read on public.nudges;
--   alter table public.nudges drop column notified_at;

alter table public.nudges add column notified_at timestamptz;
create policy nudges_client_read on public.nudges for select using (client_id = public.my_client_id());

create function public.send_nudge(p_client uuid, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); today date := (now() at time zone 'America/Bogota')::date; nid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_kind not in ('nothing','train','meals','report') then raise exception 'bad_kind'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws and status = 'active') then raise exception 'not_found'; end if;
  insert into nudges (workspace_id, client_id, kind, day) values (ws, p_client, p_kind, today) on conflict do nothing returning id into nid;
  if nid is null then raise exception 'already_sent'; end if;
  return nid;
end $$;

create function public.nudge_push_targets(p_nudge uuid) returns table (kind text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare k text; cid uuid;
begin
  if public.my_role() is distinct from 'coach' then return; end if;
  update nudges set notified_at = now()
    where id = p_nudge and workspace_id = public.my_workspace() and notified_at is null and created_at > now() - interval '10 minutes'
    returning nudges.kind, nudges.client_id into k, cid;
  if k is null then return; end if;
  return query select k, s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = cid;
end $$;

grant execute on function public.send_nudge(uuid, text), public.nudge_push_targets(uuid) to authenticated;
