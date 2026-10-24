-- Guardar una rutina completa en UN solo viaje y de forma atómica. SECURITY INVOKER: respeta RLS.
create function public.save_routine(p_id uuid, p_name text, p_category text, p_minutes int, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare rid uuid; ws uuid := public.my_workspace();
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  if p_id is null then
    insert into routine_templates (workspace_id, name, category, est_minutes) values (ws, p_name, p_category, p_minutes) returning id into rid;
  else
    update routine_templates set name = p_name, category = p_category, est_minutes = p_minutes where id = p_id and workspace_id = ws returning id into rid;
    if rid is null then raise exception 'not found'; end if;
    delete from template_items where template_id = rid;
  end if;
  insert into template_items (workspace_id, template_id, exercise_id, position, sets, reps, rest_seconds)
  select ws, rid, x.id, (t.ord - 1)::int, (t.e->>'sets')::int, t.e->>'reps', nullif(t.e->>'rest_seconds','')::int
  from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  join exercises x on x.id = (t.e->>'exercise_id')::uuid and x.workspace_id = ws;  -- solo ejercicios del propio coach
  return rid;
end $$;
