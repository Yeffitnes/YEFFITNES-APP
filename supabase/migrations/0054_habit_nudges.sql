-- 0054 (14-nov, pedido de Cristian): los hábitos como llamada a la acción.
-- 1) "Recordarle" de Jeff también para hábitos (aviso rápido nuevo, kind 'habits').
-- 2) Noche (tarea yeffitnes-noche): al cliente que no anotó todos sus hábitos de hoy, un recordatorio con lo que le falta.
--    La ruta lo junta con el del reporte si también le falta, para no mandar dos avisos.
-- 3) Mañana (tarea yeffitnes-buenosdias): a Jeff, quién quedó por debajo de su meta ayer o no anotó nada.
-- Cada aviso sale una sola vez (reminder_log). Sin tareas programadas nuevas. Necesita la 0052. Compatible con `main` (solo agrega;
-- la ruta de `main` no llama estas funciones).
-- Revertir: drop function public.due_habit_reminders_cron(text); drop function public.due_habit_digest_cron(text); drop function public._habit_status(date);
--   alter table public.nudges drop constraint nudges_kind_check, add constraint nudges_kind_check check (kind in ('nothing','train','meals','report'));
--   (antes: delete from public.nudges where kind = 'habits';) y volver a crear send_nudge con el texto de la 0037.
alter table public.nudges drop constraint nudges_kind_check;
alter table public.nudges add constraint nudges_kind_check check (kind in ('nothing','train','meals','report','habits'));

create or replace function public.send_nudge(p_client uuid, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); today date := (now() at time zone 'America/Bogota')::date; nid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_kind not in ('nothing','train','meals','report','habits') then raise exception 'bad_kind'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws and status = 'active') then raise exception 'not_found'; end if;
  insert into nudges (workspace_id, client_id, kind, day) values (ws, p_client, p_kind, today) on conflict do nothing returning id into nid;
  if nid is null then raise exception 'already_sent'; end if;
  return nid;
end $$;

-- Cómo va cada cliente activo con plan en cada hábito activo, un día. Interna: solo la usan las tareas de abajo.
create function public._habit_status(p_day date) returns table (client_id uuid, workspace_id uuid, profile_id uuid, full_name text, name text, key text, kind text, goal numeric, v numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.workspace_id, c.profile_id, coalesce(nullif(p.full_name, ''), 'Cliente'), d.name, d.key, d.kind, coalesce(g.goal, d.goal),
    case d.key when 'water' then h.water::numeric when 'steps' then h.steps::numeric when 'sleep' then h.sleep::numeric else (h.extra ->> d.id::text)::numeric end
  from clients c join profiles p on p.id = c.profile_id
  join habit_defs d on d.workspace_id = c.workspace_id and d.active
  left join client_habit_goals g on g.client_id = c.id and g.habit_id = d.id
  left join habit_logs h on h.client_id = c.id and h.day = p_day
  where c.status = 'active' and c.plan_id is not null and not coalesce(g.off, false)
    and exists (select 1 from training_plans tp where tp.client_id = c.id and tp.status = 'active');
$$;
revoke all on function public._habit_status(date) from public, anon, authenticated;

-- Noche: lo que le falta anotar hoy a cada cliente (con avisos activos).
create function public.due_habit_reminders_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, missing text)
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Bogota')::date; r record;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  for r in select s.client_id, s.profile_id, string_agg(lower(s.name), ', ' order by s.name) as miss
           from public._habit_status(today) s where s.v is null group by s.client_id, s.profile_id loop
    insert into reminder_log (kind, ref) values ('habits', r.client_id || ':' || today) on conflict do nothing;
    if found then return query select ps.endpoint, ps.p256dh, ps.auth, r.miss from push_subscriptions ps where ps.profile_id = r.profile_id; end if;
  end loop;
end $$;
revoke all on function public.due_habit_reminders_cron(text) from public;
grant execute on function public.due_habit_reminders_cron(text) to anon, authenticated;

-- Mañana: a Jeff, cómo les fue AYER. Por cliente: los hábitos de número por debajo de su meta, o "no anotó". n = clientes en la lista.
create function public.due_habit_digest_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, n int, body text)
language plpgsql security definer set search_path = public as $$
declare yday date := (now() at time zone 'America/Bogota')::date - 1; w record;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  for w in
    with st as (select * from public._habit_status(yday)),
    per as (
      select s.workspace_id, s.full_name,
        case when bool_and(s.v is null) then 'no anotó'
             else string_agg(lower(s.name), ', ' order by s.name) filter (where s.kind = 'number' and s.v is not null and s.goal is not null and s.v < s.goal) end as what
      from st s group by s.workspace_id, s.client_id, s.full_name)
    select p.workspace_id, count(*)::int as cnt, string_agg(p.full_name || ': ' || p.what, ' · ' order by p.what = 'no anotó', p.full_name) as txt
    from per p where p.what is not null group by p.workspace_id
  loop
    insert into reminder_log (kind, ref) values ('habits-coach', w.workspace_id || ':' || yday) on conflict do nothing;
    if found then return query select ps.endpoint, ps.p256dh, ps.auth, w.cnt, w.txt
      from push_subscriptions ps join profiles pc on pc.id = ps.profile_id and pc.role = 'coach' where ps.workspace_id = w.workspace_id; end if;
  end loop;
end $$;
revoke all on function public.due_habit_digest_cron(text) from public;
grant execute on function public.due_habit_digest_cron(text) to anon, authenticated;
