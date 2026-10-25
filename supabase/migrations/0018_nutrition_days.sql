-- Nutrición por días: calorías y macros son FIJOS del plan; las comidas pueden ser de un día concreto (1=lunes … 7=domingo) o de "todos los días" (nulo).
alter table public.nutrition_meals add column weekday smallint check (weekday is null or weekday between 1 and 7);

create or replace function public.save_nutrition(p_id uuid, p_client uuid, p_name text, p_kcal int, p_protein int, p_carbs int, p_fat int, p_notes text, p_meals jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pid uuid := p_id; m jsonb; i int := 0; wd smallint;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_meals) is distinct from 'array' or jsonb_array_length(p_meals) = 0 then raise exception 'no_meals'; end if;
  if jsonb_array_length(p_meals) > 100 then raise exception 'too_many_meals'; end if;   -- hasta 12 comidas x 7 días + generales
  if pid is null then
    if p_client is not null then update nutrition_plans set active = false where client_id = p_client and active and workspace_id = ws; end if;
    insert into nutrition_plans (workspace_id, client_id, name, kcal, protein_g, carbs_g, fat_g, notes)
    values (ws, p_client, p_name, p_kcal, p_protein, p_carbs, p_fat, nullif(trim(p_notes), '')) returning id into pid;
  else
    update nutrition_plans set name = p_name, kcal = p_kcal, protein_g = p_protein, carbs_g = p_carbs, fat_g = p_fat, notes = nullif(trim(p_notes), '')
    where id = pid and workspace_id = ws;
    if not found then raise exception 'not_found'; end if;
    delete from nutrition_meals where plan_id = pid;
  end if;
  for m in select * from jsonb_array_elements(p_meals) loop
    i := i + 1;
    wd := nullif(m->>'weekday', '')::smallint;     -- fuera de 1..7 → falla por el check de la tabla
    insert into nutrition_meals (plan_id, workspace_id, position, name, content, weekday)
    values (pid, ws, i, coalesce(nullif(trim(m->>'name'), ''), 'Comida ' || i), coalesce(m->>'content', ''), wd);
  end loop;
  return pid;
end $$;

create or replace function public.assign_nutrition(p_template uuid, p_client uuid) returns uuid language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); t nutrition_plans; pid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select * into t from nutrition_plans where id = p_template and workspace_id = ws and client_id is null;
  if t.id is null then raise exception 'not_found'; end if;
  if not exists (select 1 from clients c where c.id = p_client and c.workspace_id = ws) then raise exception 'not_found'; end if;
  update nutrition_plans set active = false where client_id = p_client and active and workspace_id = ws;
  insert into nutrition_plans (workspace_id, client_id, name, kcal, protein_g, carbs_g, fat_g, notes) values (ws, p_client, t.name, t.kcal, t.protein_g, t.carbs_g, t.fat_g, t.notes) returning id into pid;
  insert into nutrition_meals (plan_id, workspace_id, position, name, content, weekday) select pid, ws, position, name, content, weekday from nutrition_meals where plan_id = t.id;
  return pid;
end $$;
