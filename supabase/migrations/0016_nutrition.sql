-- Nutrición en la app (sin PDF): plantillas del coach (client_id nulo) que se CLONAN por cliente (client_id = cliente).
-- Cada plan tiene comidas con texto libre (una línea por alimento). El cliente solo ve su plan activo y solo si su plan tiene 'nutrition'.
create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid references public.clients on delete cascade,      -- nulo = plantilla
  name text not null check (length(trim(name)) > 0 and length(name) <= 120),
  kcal int check (kcal is null or kcal between 500 and 10000),
  protein_g int check (protein_g is null or protein_g between 0 and 1000),
  carbs_g int check (carbs_g is null or carbs_g between 0 and 1500),
  fat_g int check (fat_g is null or fat_g between 0 and 600),
  notes text check (notes is null or length(notes) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_active_nutrition_per_client on public.nutrition_plans (client_id) where client_id is not null and active;
create index on public.nutrition_plans (workspace_id, client_id);
create table public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans on delete cascade,
  workspace_id uuid not null references public.workspaces,
  position int not null,
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  content text not null default '' check (length(content) <= 2000)
);
create index on public.nutrition_meals (plan_id, position);
alter table public.nutrition_plans enable row level security;
alter table public.nutrition_meals enable row level security;
create policy np_coach on public.nutrition_plans for all
  using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach'
    and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.workspace_id = public.my_workspace())));
create policy np_client on public.nutrition_plans for select
  using (client_id is not null and client_id = public.my_client_id() and active and public.client_has_feature('nutrition'));
create policy nm_coach on public.nutrition_meals for all
  using (workspace_id = public.my_workspace() and public.my_role() = 'coach')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'coach'
    and exists (select 1 from public.nutrition_plans p where p.id = plan_id and p.workspace_id = public.my_workspace()));
create policy nm_client on public.nutrition_meals for select
  using (exists (select 1 from public.nutrition_plans p where p.id = plan_id and p.client_id = public.my_client_id() and p.active and public.client_has_feature('nutrition')));
-- El cliente no escribe nada.

-- Guarda (crea o edita) una plantilla o el plan de un cliente, reemplazando sus comidas. p_meals = [{name, content}, ...]
create function public.save_nutrition(p_id uuid, p_client uuid, p_name text, p_kcal int, p_protein int, p_carbs int, p_fat int, p_notes text, p_meals jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); pid uuid := p_id; m jsonb; i int := 0;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_meals) is distinct from 'array' or jsonb_array_length(p_meals) = 0 then raise exception 'no_meals'; end if;
  if jsonb_array_length(p_meals) > 12 then raise exception 'too_many_meals'; end if;
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
    insert into nutrition_meals (plan_id, workspace_id, position, name, content) values (pid, ws, i, coalesce(nullif(trim(m->>'name'), ''), 'Comida ' || i), coalesce(m->>'content', ''));
  end loop;
  return pid;
end $$;

-- Clona una plantilla para un cliente (queda como su plan activo; el anterior se desactiva).
create function public.assign_nutrition(p_template uuid, p_client uuid) returns uuid language plpgsql security invoker set search_path = public as $$
declare ws uuid := public.my_workspace(); t nutrition_plans; pid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  select * into t from nutrition_plans where id = p_template and workspace_id = ws and client_id is null;
  if t.id is null then raise exception 'not_found'; end if;
  if not exists (select 1 from clients c where c.id = p_client and c.workspace_id = ws) then raise exception 'not_found'; end if;
  update nutrition_plans set active = false where client_id = p_client and active and workspace_id = ws;
  insert into nutrition_plans (workspace_id, client_id, name, kcal, protein_g, carbs_g, fat_g, notes) values (ws, p_client, t.name, t.kcal, t.protein_g, t.carbs_g, t.fat_g, t.notes) returning id into pid;
  insert into nutrition_meals (plan_id, workspace_id, position, name, content) select pid, ws, position, name, content from nutrition_meals where plan_id = t.id;
  return pid;
end $$;
