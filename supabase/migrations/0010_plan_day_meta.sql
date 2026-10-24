-- "Mi plan" del cliente muestra duración y tipo de cada día ("5 ejercicios · 45 min · Tren superior").
-- Esos datos viven en la plantilla (solo coach puede leerla), así que se COPIAN al día del plan, igual que los ejercicios.
alter table public.plan_days add column est_minutes int check (est_minutes > 0), add column category text;

update public.plan_days d set est_minutes = t.est_minutes, category = t.category
from public.routine_templates t where t.id = d.source_template_id and d.est_minutes is null and d.category is null;

create or replace function public.assign_day(p_plan uuid, p_weekday int, p_template uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; did uuid; t record;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  select client_id into cid from training_plans where id = p_plan and workspace_id = ws and status = 'active';
  if cid is null then raise exception 'plan not found'; end if;
  select name, est_minutes, category into t from routine_templates where id = p_template and workspace_id = ws;
  if t.name is null then raise exception 'template not found'; end if;
  delete from plan_days where plan_id = p_plan and weekday = p_weekday;
  insert into plan_days (workspace_id, client_id, plan_id, weekday, name, source_template_id, est_minutes, category)
    values (ws, cid, p_plan, p_weekday, t.name, p_template, t.est_minutes, t.category) returning id into did;
  insert into plan_items (workspace_id, client_id, plan_day_id, exercise_id, position, sets, reps, rest_seconds)
    select ws, cid, did, exercise_id, position, sets, reps, rest_seconds from template_items where template_id = p_template;
  return did;
end $$;
