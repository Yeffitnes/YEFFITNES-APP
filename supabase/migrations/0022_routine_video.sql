-- Vídeo de la rutina: (1) de catálogo (YouTube, lo ven todos los clientes con esa rutina) y (2) personalizado (Bunny, solo ese cliente; reemplaza al de catálogo).
-- Como los ejercicios, el vídeo de catálogo se COPIA al día del plan al asignarlo (el cliente no lee las plantillas).
alter table public.routine_templates add column video_ref text check (video_ref is null or video_ref ~ '^[A-Za-z0-9_-]{11}$');
alter table public.plan_days add column video_ref text check (video_ref is null or video_ref ~ '^[A-Za-z0-9_-]{11}$');
alter table public.plan_days add column video_id text references public.video_uploads(video_id) on delete set null;

drop function public.save_routine(uuid, text, text, int, jsonb);
create function public.save_routine(p_id uuid, p_name text, p_category text, p_minutes int, p_items jsonb, p_video text default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare rid uuid; ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_id is null then
    insert into routine_templates (workspace_id, name, category, est_minutes, video_ref) values (ws, p_name, p_category, p_minutes, p_video) returning id into rid;
  else
    update routine_templates set name = p_name, category = p_category, est_minutes = p_minutes, video_ref = p_video where id = p_id and workspace_id = ws returning id into rid;
    if rid is null then raise exception 'not found'; end if;
    delete from template_items where template_id = rid;
  end if;
  insert into template_items (workspace_id, template_id, exercise_id, position, sets, reps, rest_seconds)
  select ws, rid, x.id, (t.ord - 1)::int, (t.e->>'sets')::int, t.e->>'reps', nullif(t.e->>'rest_seconds','')::int
  from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  join exercises x on x.id = (t.e->>'exercise_id')::uuid and x.workspace_id = ws;
  return rid;
end $$;

create or replace function public.assign_day(p_plan uuid, p_weekday int, p_template uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; did uuid; t record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  select client_id into cid from training_plans where id = p_plan and workspace_id = ws and status = 'active';
  if cid is null then raise exception 'plan not found'; end if;
  select name, est_minutes, category, video_ref into t from routine_templates where id = p_template and workspace_id = ws;
  if t.name is null then raise exception 'template not found'; end if;
  delete from plan_days where plan_id = p_plan and weekday = p_weekday;
  insert into plan_days (workspace_id, client_id, plan_id, weekday, name, source_template_id, est_minutes, category, video_ref)
    values (ws, cid, p_plan, p_weekday, t.name, p_template, t.est_minutes, t.category, t.video_ref) returning id into did;
  insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds)
    select ws, cid, did, exercise_id, position, sets, reps, rest_seconds from template_items where template_id = p_template;
  return did;
end $$;

-- Vídeo personalizado de un día (Bunny). Null lo quita. Solo el coach, y el vídeo debe haberse subido para ESE cliente.
create function public.set_day_video(p_day uuid, p_video text) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select client_id into cid from plan_days where id = p_day and workspace_id = ws;
  if cid is null then raise exception 'not_found'; end if;
  if p_video is not null and not exists (select 1 from video_uploads u where u.video_id = p_video and u.client_id = cid and u.workspace_id = ws) then raise exception 'unknown_video'; end if;
  update plan_days set video_id = p_video where id = p_day;
end $$;
