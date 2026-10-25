-- Notificaciones push (el teléfono avisa aunque la app esté cerrada). Cada dispositivo guarda su suscripción.
create table public.push_subscriptions (
  endpoint text primary key check (length(endpoint) <= 1000),
  profile_id uuid not null references public.profiles on delete cascade,
  workspace_id uuid not null references public.workspaces,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;
create policy push_own_read on public.push_subscriptions for select using (profile_id = auth.uid());
create policy push_own_delete on public.push_subscriptions for delete using (profile_id = auth.uid());
-- Sin insert/update directo: save_push_subscription() (un dispositivo compartido pasa a la cuenta que inicia sesión).

create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.my_workspace() is null then raise exception 'not_allowed'; end if;
  if (select count(*) from push_subscriptions where profile_id = auth.uid()) >= 10 then
    delete from push_subscriptions where endpoint in (select endpoint from push_subscriptions where profile_id = auth.uid() order by created_at limit 1);
  end if;
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values (p_endpoint, auth.uid(), public.my_workspace(), p_p256dh, p_auth);
end $$;

-- Solo quien ENVIÓ un mensaje (hace menos de 5 min) y solo una vez, obtiene los dispositivos del DESTINATARIO.
create function public.push_targets(p_message uuid) returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare m messages%rowtype; r text := public.my_role();
begin
  select * into m from messages where id = p_message and notified_at is null and created_at > now() - interval '5 minutes';
  if not found then return; end if;
  if m.sender = 'client' and r = 'client' and public.my_client_id() = m.client_id then
    update messages set notified_at = now() where id = p_message;
    return query select s.endpoint, s.p256dh, s.auth from push_subscriptions s join profiles pr on pr.id = s.profile_id where pr.role = 'coach' and s.workspace_id = m.workspace_id;
  elsif m.sender = 'coach' and r = 'coach' and m.workspace_id = public.my_workspace() then
    update messages set notified_at = now() where id = p_message;
    return query select s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = m.client_id;
  end if;
end $$;

create function public.prune_push(p_endpoints text[]) returns void language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = any(p_endpoints) and auth.uid() is not null $$;
