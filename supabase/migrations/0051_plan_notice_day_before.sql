-- 0051 (12-nov, pedido de Cristian): un aviso más del plan mensual, 1 día antes de vencer.
-- Quedan 4: 7 días antes, 2 días antes, 1 día antes ("vence mañana") y el día que vence. Cada uno sale una sola vez.
-- Necesita la 0048. Compatible con `main` (solo cambia la tarea de la mañana, que en `main` no se usa).
-- Revertir: volver a crear due_plan_notices_cron con el texto de la 0048 y
--   alter table public.plan_expiry_log drop constraint plan_expiry_log_stage_check, add constraint plan_expiry_log_stage_check check (stage in ('d7','d2','d0'));
--   (antes: delete from public.plan_expiry_log where stage = 'd1';)
alter table public.plan_expiry_log drop constraint plan_expiry_log_stage_check;
alter table public.plan_expiry_log add constraint plan_expiry_log_stage_check check (stage in ('d7','d2','d1','d0'));

create or replace function public.due_plan_notices_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, stage text, n int, names text)
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Bogota')::date;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  return query
  with cand as (
    select c.id, c.workspace_id, c.profile_id, c.plan_since + 30 as ends_on, c.plan_since + 30 - today as lft, c.plan_expiry_notified_on as old_notice
    from clients c
    where c.plan_id is not null and c.status = 'active' and c.plan_since is not null and c.plan_since + 30 - today <= 7
  ), staged as (
    select x.*, case when x.lft <= 0 then 'd0' when x.lft = 1 then 'd1' when x.lft <= 2 then 'd2' else 'd7' end as st from cand x
  ), logged as (
    insert into plan_expiry_log (client_id, ends_on, stage)
    select s.id, s.ends_on, s.st from staged s
    where not (s.st = 'd0' and s.old_notice is not null and s.old_notice >= s.ends_on)   -- ya avisado por la tarea anterior
    on conflict do nothing
    returning plan_expiry_log.client_id, plan_expiry_log.stage
  ), marked as (
    update clients c set plan_expiry_notified_on = today from logged l where l.client_id = c.id and l.stage = 'd0' returning c.id
  ), per_ws as (
    select s.workspace_id, l.stage as st, count(*)::int as cnt,
      string_agg(coalesce(nullif(p.full_name, ''), 'Cliente') || case when l.stage = 'd0' then '' when s.lft = 1 then ' (vence mañana)' else ' (vence en ' || s.lft || ' días)' end, ', ' order by s.lft, p.full_name) as nm
    from logged l join staged s on s.id = l.client_id left join profiles p on p.id = s.profile_id
    group by s.workspace_id, l.stage
  )
  select sub.endpoint, sub.p256dh, sub.auth, w.st, w.cnt, w.nm
  from per_ws w join push_subscriptions sub on sub.workspace_id = w.workspace_id join profiles pc on pc.id = sub.profile_id and pc.role = 'coach';
end $$;
