-- 0057 (21-nov, pedido de Cristian): en rutinas y ejercicios del catálogo, Yeff puede poner un enlace de YouTube O subir el
-- vídeo desde el celular (Bunny, igual que Material).
--   - routine_templates.video_id / video_poster: el vídeo subido de la rutina y su portada difuminada. Con vídeo subido,
--     video_ref (YouTube) queda vacío: es uno u otro.
--   - exercises: usa las columnas que ya existían para esto: video_provider = 'bunny' y video_ref = id del vídeo en Bunny.
--   - Un vídeo solo se acepta si lo subió el coach de ese mismo espacio (video_uploads sin cliente): nadie puede pegar el
--     id de un vídeo ajeno.
--   - assign_day copia el vídeo subido de la rutina al día del cliente (plan_days.video_id, que ya sabe reproducirse).
--   - Si Yeff cambia o quita el vídeo de una rutina, el cambio llega también a los planes ACTIVOS que la tienen, salvo los
--     días donde grabó un vídeo personal para ese cliente (ese no se toca). Lo mismo con el enlace de YouTube.
--   - set_day_video(día, null): al quitar el vídeo personal de un cliente vuelve el vídeo subido de la rutina (si tiene).
--   - _video_in_use cuenta estos vídeos: la limpieza de huérfanos no los borra.
-- Revertir:
--   drop trigger rt_video on routine_templates; drop trigger ex_video on exercises; drop function _rt_video(); drop function _ex_video();
--   update exercises set video_provider = null, video_ref = null where video_provider = 'bunny';
--   alter table routine_templates drop column video_id, drop column video_poster;
--   y volver a correr assign_day (0056), set_day_video (0022) y _video_in_use (0041).

alter table public.routine_templates
  add column if not exists video_id text references public.video_uploads(video_id) on delete set null,
  add column if not exists video_poster text check (video_poster is null or (length(video_poster) <= 16000 and video_poster ~ '^data:image/(jpeg|webp);base64,[A-Za-z0-9+/]+=*$'));

-- Rutina: valida el vídeo subido y lleva el cambio a los planes activos que usan la rutina.
create or replace function public._rt_video() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.video_id is not null and new.video_id is distinct from (case when tg_op = 'UPDATE' then old.video_id end)
     and not exists (select 1 from video_uploads u where u.video_id = new.video_id and u.workspace_id = new.workspace_id and u.client_id is null) then
    raise exception 'unknown_video';
  end if;
  if new.video_id is not null then new.video_ref := null; end if;
  if tg_op = 'UPDATE' then
    if new.video_id is distinct from old.video_id or new.video_poster is distinct from old.video_poster then
      update plan_days d set video_id = new.video_id, video_poster = new.video_poster
        from training_plans p
        where d.plan_id = p.id and p.status = 'active' and d.source_template_id = new.id and d.workspace_id = new.workspace_id
          and (d.video_id is null or d.video_id = old.video_id);
    end if;
    if new.video_ref is distinct from old.video_ref then
      update plan_days d set video_ref = new.video_ref
        from training_plans p
        where d.plan_id = p.id and p.status = 'active' and d.source_template_id = new.id and d.workspace_id = new.workspace_id
          and d.video_ref is not distinct from old.video_ref;
    end if;
  end if;
  return new;
end $$;
revoke all on function public._rt_video() from public, anon, authenticated;
drop trigger if exists rt_video on public.routine_templates;
create trigger rt_video before insert or update of video_id, video_ref, video_poster on public.routine_templates for each row execute function public._rt_video();

-- Ejercicio: si el vídeo es de Bunny, tiene que ser uno subido por el coach de este espacio.
create or replace function public._ex_video() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.video_provider = 'bunny' and new.video_ref is not null
     and (tg_op = 'INSERT' or new.video_ref is distinct from old.video_ref or old.video_provider is distinct from 'bunny')
     and not exists (select 1 from video_uploads u where u.video_id = new.video_ref and u.workspace_id = new.workspace_id and u.client_id is null) then
    raise exception 'unknown_video';
  end if;
  return new;
end $$;
revoke all on function public._ex_video() from public, anon, authenticated;
drop trigger if exists ex_video on public.exercises;
create trigger ex_video before insert or update of video_provider, video_ref on public.exercises for each row execute function public._ex_video();

-- Asignar una rutina a un día: igual que 0056, y además copia el vídeo subido de la rutina.
create or replace function public.assign_day(p_plan uuid, p_weekday integer, p_template uuid, p_week integer default 1) returns uuid
language plpgsql set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; did uuid; t record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_week is null or p_week not between 1 and 16 then raise exception 'bad week'; end if;
  select client_id into cid from training_plans where id = p_plan and workspace_id = ws and status = 'active';
  if cid is null then raise exception 'plan not found'; end if;
  select name, est_minutes, category, video_ref, video_id, video_poster into t from routine_templates where id = p_template and workspace_id = ws;
  if t.name is null then raise exception 'template not found'; end if;
  delete from plan_days where plan_id = p_plan and weekday = p_weekday and week = p_week;
  insert into plan_days (workspace_id, client_id, plan_id, weekday, week, name, source_template_id, est_minutes, category, video_ref, video_id, video_poster)
    values (ws, cid, p_plan, p_weekday, p_week, t.name, p_template, t.est_minutes, t.category, t.video_ref, t.video_id, t.video_poster) returning id into did;
  insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds)
    select ws, cid, did, exercise_id, position, sets, reps, rest_seconds from template_items where template_id = p_template;
  if p_week > (select cycle_weeks from training_plans where id = p_plan) then update training_plans set cycle_weeks = p_week where id = p_plan; end if;
  return did;
end $$;

-- Vídeo personal de un día: igual que antes; al quitarlo (null) vuelve el de la rutina del catálogo, si tiene uno subido.
create or replace function public.set_day_video(p_day uuid, p_video text) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; tpl uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select client_id, source_template_id into cid, tpl from plan_days where id = p_day and workspace_id = ws;
  if cid is null then raise exception 'not_found'; end if;
  if p_video is not null and not exists (select 1 from video_uploads u where u.video_id = p_video and u.client_id = cid and u.workspace_id = ws) then raise exception 'unknown_video'; end if;
  if p_video is null then
    update plan_days d set video_id = t.video_id, video_poster = t.video_poster from routine_templates t where d.id = p_day and t.id = tpl and t.workspace_id = ws and t.video_id is not null;
    if found then return; end if;
  end if;
  update plan_days set video_id = p_video where id = p_day;
end $$;

create or replace function public._video_in_use(p_video text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_reports where video_id = p_video)
      or exists (select 1 from messages where video_id = p_video)
      or exists (select 1 from plan_days where video_id = p_video)
      or exists (select 1 from materials where video_id = p_video)
      or exists (select 1 from clients where objective_video_id = p_video)
      or exists (select 1 from workout_logs where coach_comment_video = p_video)
      or exists (select 1 from routine_templates where video_id = p_video)
      or exists (select 1 from exercises where video_provider = 'bunny' and video_ref = p_video) $$;
revoke all on function public._video_in_use(text) from public, anon, authenticated;
