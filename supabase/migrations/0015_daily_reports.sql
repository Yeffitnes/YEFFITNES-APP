-- Reporte diario: comentario corto + vídeo de verificación (Bunny Stream). PROPUESTA (confirmar con Jeff): 1 por día, vídeo ≤ 90 s,
-- se borra 24 h después de que Jeff lo ve y, como máximo, 7 días después de enviado.
create table public.video_uploads (            -- vídeos que el servidor creó en Bunny para un cliente (evita apuntar a vídeos ajenos y limita abusos)
  video_id text primary key check (video_id ~ '^[0-9a-fA-F-]{20,64}$'),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.video_uploads (client_id, created_at desc);
alter table public.video_uploads enable row level security;   -- sin políticas: solo funciones

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  report_date date not null,
  comment text check (comment is null or length(comment) <= 1000),
  video_id text unique references public.video_uploads(video_id),
  video_state text not null default 'none' check (video_state in ('none','uploaded','deleted')),
  coach_seen_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, report_date),
  check (video_state = 'none' or video_id is not null or video_state = 'deleted')
);
create index on public.daily_reports (workspace_id, coach_seen_at, report_date desc);
alter table public.daily_reports enable row level security;
create policy dr_coach on public.daily_reports for all
  using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach');
create policy dr_client_read on public.daily_reports for select using (client_id = public.my_client_id());
-- El cliente NO escribe directo: solo con submit_report().

create function public.can_report() returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() = 'client'
    and exists (select 1 from clients c where c.id = public.my_client_id() and c.status = 'active')
    and public.client_has_feature('daily_report') $$;

-- El servidor la llama justo después de crear el vídeo en Bunny. Máx. 5 por día y cliente.
create function public.register_video_upload(p_video_id text) returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id();
begin
  if not public.can_report() then raise exception 'not_allowed'; end if;
  if (select count(*) from video_uploads where client_id = cid and created_at > now() - interval '1 day') >= 5 then raise exception 'too_many'; end if;
  insert into video_uploads (video_id, workspace_id, client_id) values (p_video_id, public.my_workspace(), cid);
end $$;

create function public.submit_report(p_date date, p_comment text, p_video_id text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_client_id(); rid uuid; seen timestamptz;
begin
  if not public.can_report() then raise exception 'not_allowed'; end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 1 then raise exception 'bad_date'; end if;
  if p_comment is not null and length(p_comment) > 1000 then raise exception 'comment_too_long'; end if;
  if p_video_id is not null and not exists (select 1 from video_uploads u where u.video_id = p_video_id and u.client_id = cid) then raise exception 'unknown_video'; end if;
  select r.coach_seen_at into seen from daily_reports r where r.client_id = cid and r.report_date = p_date;
  if seen is not null then raise exception 'already_reviewed'; end if;
  insert into daily_reports (workspace_id, client_id, report_date, comment, video_id, video_state, delete_after)
  values (public.my_workspace(), cid, p_date, nullif(trim(p_comment), ''), p_video_id, case when p_video_id is null then 'none' else 'uploaded' end,
          case when p_video_id is null then null else now() + interval '7 days' end)
  on conflict (client_id, report_date) do update set
    comment = excluded.comment,
    video_id = coalesce(excluded.video_id, daily_reports.video_id),
    video_state = case when coalesce(excluded.video_id, daily_reports.video_id) is null then 'none' else 'uploaded' end,
    delete_after = case when coalesce(excluded.video_id, daily_reports.video_id) is null then null else now() + interval '7 days' end
  returning id into rid;
  return rid;
end $$;

-- Jeff marca el reporte como visto: el vídeo se borra 24 h después (o antes si ya vencía).
create function public.review_report(p_id uuid) returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update daily_reports set coach_seen_at = coalesce(coach_seen_at, now()),
    delete_after = case when video_state = 'uploaded' then least(coalesce(delete_after, now() + interval '24 hours'), now() + interval '24 hours') else delete_after end
  where id = p_id and workspace_id = public.my_workspace();
  if not found then raise exception 'not_found'; end if;
end $$;

-- Para el borrado automático (lo ejecuta el servidor con la sesión del coach al abrir "Reportes").
create function public.due_report_videos() returns table (id uuid, video_id text) language sql stable security definer set search_path = public as $$
  select r.id, r.video_id from daily_reports r
  where public.my_role() = 'coach' and r.workspace_id = public.my_workspace() and r.video_state = 'uploaded' and r.delete_after <= now() $$;
create function public.mark_video_deleted(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update daily_reports set video_state = 'deleted' where id = p_id and workspace_id = public.my_workspace() and video_state = 'uploaded';
end $$;
