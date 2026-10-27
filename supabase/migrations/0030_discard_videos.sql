-- 0030 · Vídeos huérfanos: un vídeo subido que nunca llegó a un reporte, mensaje o rutina se borra (Bunny + registro) y libera el cupo diario.
-- discard_video_upload: lo pide quien lo subió (o su coach) cuando la subida falla o se cambia de vídeo.
-- due_orphan_videos: lista (solo coach) los huérfanos de más de 30 min; el servidor los borra al abrir Reportes.
-- Revertir: drop function public.discard_video_upload(text); drop function public.due_orphan_videos();

create function public._video_in_use(p_video text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_reports where video_id = p_video)
      or exists (select 1 from messages where video_id = p_video)
      or exists (select 1 from plan_days where video_id = p_video) $$;
revoke all on function public._video_in_use(text) from public, anon, authenticated;

create function public.discard_video_upload(p_video text) returns boolean language plpgsql security definer set search_path = public as $$
declare u record; r text := public.my_role();
begin
  select * into u from video_uploads where video_id = p_video;
  if not found then return false; end if;
  if not ((r = 'client' and u.client_id = public.my_client_id())
       or (r = 'coach' and u.workspace_id = public.my_workspace())) then return false; end if;
  if public._video_in_use(p_video) then return false; end if;
  delete from video_uploads where video_id = p_video;
  return true;
end $$;

create function public.due_orphan_videos() returns table (video_id text) language sql stable security definer set search_path = public as $$
  select u.video_id from video_uploads u
  where public.my_role() = 'coach' and u.workspace_id = public.my_workspace()
    and u.created_at < now() - interval '30 minutes' and not public._video_in_use(u.video_id)
  order by u.created_at limit 100 $$;

grant execute on function public.discard_video_upload(text), public.due_orphan_videos() to authenticated;
