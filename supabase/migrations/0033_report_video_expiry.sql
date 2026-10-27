-- 0033 · Borrado GARANTIZADO de los vídeos del reporte diario (decisión de Cristian, 27-oct).
-- Reglas nuevas: si Jeff no lo ve, el vídeo se borra 32 h después de enviado; si lo ve, 12 h después de marcarlo visto (lo que pase primero).
-- Antes: 7 días sin ver y 24 h tras verlo, y solo se borraba cuando Jeff abría "Reportes".
-- Ahora además lo borra una tarea programada (pg_cron, cada hora) que llama a /api/cron/purge-videos con la clave del cron (app_secrets 'cron').
-- Esa ruta también limpia los vídeos huérfanos (subidos y nunca usados). Ver docs/PASO_A_PRODUCCION.md para programar la tarea.
-- Compatible con el código viejo de main: mismas firmas de submit_report y review_report.
-- Revertir: volver a ejecutar submit_report y review_report de 0015_daily_reports.sql y
--   drop function public.due_report_videos_cron(text), public.mark_video_deleted_cron(text, uuid), public.due_orphan_videos_cron(text), public.discard_orphan_cron(text, text);

create or replace function public.submit_report(p_date date, p_comment text, p_video_id text default null) returns uuid
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
          case when p_video_id is null then null else now() + interval '32 hours' end)
  on conflict (client_id, report_date) do update set
    comment = excluded.comment,
    video_id = coalesce(excluded.video_id, daily_reports.video_id),
    video_state = case when coalesce(excluded.video_id, daily_reports.video_id) is null then 'none' else 'uploaded' end,
    delete_after = case when coalesce(excluded.video_id, daily_reports.video_id) is null then null
                        when excluded.video_id is not null then now() + interval '32 hours' else daily_reports.delete_after end
  returning id into rid;
  return rid;
end $$;

create or replace function public.review_report(p_id uuid) returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  update daily_reports set coach_seen_at = coalesce(coach_seen_at, now()),
    delete_after = case when video_state = 'uploaded' then least(coalesce(delete_after, now() + interval '12 hours'), now() + interval '12 hours') else delete_after end
  where id = p_id and workspace_id = public.my_workspace();
  if not found then raise exception 'not_found'; end if;
end $$;

-- Los vídeos que ya estaban subidos pasan a las reglas nuevas.
update public.daily_reports set delete_after = least(delete_after, created_at + interval '32 hours')
  where video_state = 'uploaded' and coach_seen_at is null and delete_after is not null;
update public.daily_reports set delete_after = least(delete_after, coach_seen_at + interval '12 hours')
  where video_state = 'uploaded' and coach_seen_at is not null and delete_after is not null;

-- ---- Para la tarea programada (sin sesión de usuario: la clave del cron se valida aquí dentro) ----
create function public._cron_ok(p_secret text) returns boolean language sql stable security definer set search_path = public as $$
  select p_secret is not null and exists (select 1 from app_secrets where name = 'cron' and value = p_secret) $$;
revoke all on function public._cron_ok(text) from public, anon, authenticated;

create function public.due_report_videos_cron(p_secret text) returns table (id uuid, video_id text) language sql stable security definer set search_path = public as $$
  select r.id, r.video_id from daily_reports r
  where public._cron_ok(p_secret) and r.video_state = 'uploaded' and r.delete_after <= now()
  order by r.delete_after limit 200 $$;

create function public.mark_video_deleted_cron(p_secret text, p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  update daily_reports set video_state = 'deleted' where id = p_id and video_state = 'uploaded';
end $$;

create function public.due_orphan_videos_cron(p_secret text) returns table (video_id text) language sql stable security definer set search_path = public as $$
  select u.video_id from video_uploads u
  where public._cron_ok(p_secret) and u.created_at < now() - interval '30 minutes' and not public._video_in_use(u.video_id)
  order by u.created_at limit 200 $$;

create function public.discard_orphan_cron(p_secret text, p_video text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  if public._video_in_use(p_video) then return false; end if;
  delete from video_uploads where video_id = p_video;
  return found;
end $$;

grant execute on function public.due_report_videos_cron(text), public.mark_video_deleted_cron(text, uuid),
  public.due_orphan_videos_cron(text), public.discard_orphan_cron(text, text) to anon, authenticated;
