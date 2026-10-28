-- 0036 · Avisos rápidos del coach, actividad solo del día y vídeo en el objetivo (pedidos de Cristian, 27-oct).
-- 1) nudges: Jeff toca "Avisar" en Seguimiento y al cliente le llega un aviso automático según lo que le falta hoy
--    (nothing = nada hoy, train = entreno, meals = nutrición, report = reporte). Máx. 1 por tipo, cliente y día.
-- 2) Actividad: activity_feed devuelve solo lo de hoy (Bogotá) y borra los eventos de más de 24 h del espacio.
-- 3) Objetivo con vídeo: clients.objective_video_id (vídeo privado que sube Jeff). Solo puede apuntar a un vídeo registrado para ESE cliente.
-- Compatible con el código viejo de main: tabla y columna nuevas; activity_feed mantiene su firma.
-- Revertir: drop table public.nudges; drop function public.nudge_targets(uuid, text); drop trigger clients_objective_video on public.clients;
--   drop function public._check_objective_video(); alter table public.clients drop column objective_video_id;
--   recrear activity_feed de 0025 y _video_in_use de 0035.

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  kind text not null check (kind in ('nothing','train','meals','report')),
  day date not null,
  created_at timestamptz not null default now(),
  unique (client_id, kind, day)
);
alter table public.nudges enable row level security;
create policy nudges_coach_read on public.nudges for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
-- Sin insert/update/delete directo: solo nudge_targets().

-- El coach avisa a un cliente de SU espacio. Devuelve los dispositivos del cliente (vacío si ya se avisó hoy por eso o no tiene avisos).
create function public.nudge_targets(p_client uuid, p_kind text) returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); today date := (now() at time zone 'America/Bogota')::date; n int;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_kind not in ('nothing','train','meals','report') then raise exception 'bad_kind'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws and status = 'active') then raise exception 'not_found'; end if;
  insert into nudges (workspace_id, client_id, kind, day) values (ws, p_client, p_kind, today) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'already_sent'; end if;
  return query select s.endpoint, s.p256dh, s.auth from push_subscriptions s join clients c on c.profile_id = s.profile_id where c.id = p_client;
end $$;

-- Actividad: solo hoy, y lo de más de 24 h se borra.
create or replace function public.activity_feed(p_limit int default 20) returns table (id uuid, client_id uuid, client_name text, kind text, event_date date, created_at timestamptz, seen boolean)
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  delete from activity_events ae where ae.workspace_id = ws and ae.created_at < now() - interval '24 hours';
  delete from nudges nd where nd.workspace_id = ws and nd.day < (now() at time zone 'America/Bogota')::date - 2;
  return query select e.id, e.client_id, coalesce(pr.full_name, 'Cliente'), e.kind, e.event_date, e.created_at, e.seen_at is not null
    from activity_events e join clients c on c.id = e.client_id left join profiles pr on pr.id = c.profile_id
    where e.workspace_id = ws and e.event_date >= (now() at time zone 'America/Bogota')::date
    order by e.created_at desc limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Objetivo con vídeo
alter table public.clients add column objective_video_id text references public.video_uploads(video_id) on delete set null;
create function public._check_objective_video() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.objective_video_id is not null and new.objective_video_id is distinct from old.objective_video_id
     and not exists (select 1 from video_uploads u where u.video_id = new.objective_video_id and u.client_id = new.id) then
    raise exception 'bad_video';
  end if;
  return new;
end $$;
create trigger clients_objective_video before update of objective_video_id on public.clients for each row execute function public._check_objective_video();

create or replace function public._video_in_use(p_video text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_reports where video_id = p_video)
      or exists (select 1 from messages where video_id = p_video)
      or exists (select 1 from plan_days where video_id = p_video)
      or exists (select 1 from materials where video_id = p_video)
      or exists (select 1 from clients where objective_video_id = p_video) $$;

grant execute on function public.nudge_targets(uuid, text) to authenticated;
