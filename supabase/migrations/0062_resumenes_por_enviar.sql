-- 0062 (22-nov, pedido de Cristian): cuando un cliente completa su semana (bloques de 7 días desde que empezó, como en
-- lib/clientweek.ts), a Yeff le llega en la mañana una notificación con los resúmenes por enviar. En el panel salen además
-- como prioridad ("Resúmenes por enviar"); eso se calcula en la app con los datos que ya hay.
-- Revertir: drop function due_week_summary_cron(text);
create or replace function public.due_week_summary_cron(p_secret text) returns table (endpoint text, p256dh text, auth text, n int, body text)
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Bogota')::date; w record;
begin
  if not public._cron_ok(p_secret) then raise exception 'not_allowed'; end if;
  for w in
    with cl as (
      select c.id, c.workspace_id, p.full_name,
        coalesce((c.activated_at at time zone 'America/Bogota')::date, c.plan_since, (c.created_at at time zone 'America/Bogota')::date) as start
      from clients c join profiles p on p.id = c.profile_id where c.status = 'active'),
    due as (   -- hoy empieza una semana nueva: la anterior (de hoy-7 a ayer) acaba de terminar y aún no se envió
      select cl.*, ((today - cl.start) / 7)::int as wk from cl
      where today > cl.start and (today - cl.start) % 7 = 0
        and not exists (select 1 from week_summaries s where s.client_id = cl.id and s.from_day = today - 7))
    select d.workspace_id, count(*)::int as cnt, string_agg(d.full_name || ' (semana ' || d.wk || ')', ', ' order by d.full_name) as txt from due d group by d.workspace_id
  loop
    insert into reminder_log (kind, ref) values ('week-sum', w.workspace_id || ':' || today) on conflict do nothing;
    if found then return query select ps.endpoint, ps.p256dh, ps.auth, w.cnt, w.txt
      from push_subscriptions ps join profiles pc on pc.id = ps.profile_id and pc.role = 'coach' where ps.workspace_id = w.workspace_id; end if;
  end loop;
end $$;
revoke all on function public.due_week_summary_cron(text) from public;
grant execute on function public.due_week_summary_cron(text) to anon, authenticated;
