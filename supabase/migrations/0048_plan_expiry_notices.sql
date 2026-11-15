-- 0048 (4-nov, pedido de Cristian): avisos a Jeff antes de que venza un plan mensual: 7 días antes, 2 días antes y el día que vence.
-- Cada aviso sale una sola vez por vencimiento; al renovar o cambiar el plan cambia la fecha y vuelven a contar.
-- Nada se quita solo: el día que vence, Jeff decide en su panel si renueva o cancela. El plan sigue activo hasta que él decida.
-- Si por algo no corrió la tarea un día, sale el aviso más reciente que corresponda (no los atrasados).
-- Compatible con `main`: el código viejo sigue usando due_plan_expiry_cron, que no se toca. Esta migración solo agrega.
-- Revertir: drop function public.due_plan_notices_cron(text); drop table public.plan_expiry_log;
create table public.plan_expiry_log (
  client_id uuid not null references public.clients(id) on delete cascade,
  ends_on date not null,
  stage text not null check (stage in ('d7','d2','d0')),
  sent_at timestamptz not null default now(),
  primary key (client_id, ends_on, stage)
);
alter table public.plan_expiry_log enable row level security;   -- sin políticas: solo la función de abajo la toca
revoke all on public.plan_expiry_log from anon, authenticated;

create function public.due_plan_notices_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, stage text, n int, names text)
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
    select x.*, case when x.lft <= 0 then 'd0' when x.lft <= 2 then 'd2' else 'd7' end as st from cand x
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
revoke all on function public.due_plan_notices_cron(text) from public;
grant execute on function public.due_plan_notices_cron(text) to anon, authenticated;
