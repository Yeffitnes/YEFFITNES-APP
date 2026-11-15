-- 0049 (4-nov, pedido de Cristian): sugerencias de peso que Jeff resuelve de una vez.
-- Lo que Jeff decide (aceptar con un peso, o descartar) queda en la base: ya no vuelve a salir, ni en otro teléfono o computador
-- (antes "Descartar" se guardaba solo en ese navegador). Aceptar cambia el peso del plan y anota la decisión en un solo paso.
-- Una sugerencia es por entrenamiento y ejercicio: si el cliente vuelve a entrenar y se sale otra vez, sale una nueva.
-- Compatible con `main`: solo agrega; el código viejo no usa nada de esto.
-- Revertir: drop function public.decide_weight_advice(uuid, uuid, numeric); drop table public.weight_advice_decisions;
create table public.weight_advice_decisions (
  workspace_id uuid not null references public.workspaces,
  log_id uuid not null references public.workout_logs on delete cascade,
  plan_item_id uuid not null references public.plan_items on delete cascade,
  weight numeric(6,2),   -- nulo = descartada
  decided_at timestamptz not null default now(),
  primary key (log_id, plan_item_id)
);
alter table public.weight_advice_decisions enable row level security;
create policy wad_coach_read on public.weight_advice_decisions for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
revoke insert, update, delete on public.weight_advice_decisions from anon, authenticated;

create function public.decide_weight_advice(p_log uuid, p_item uuid, p_weight numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if p_weight is not null and (p_weight <= 0 or p_weight > 1000) then raise exception 'bad_weight'; end if;
  select client_id into cid from workout_logs where id = p_log and workspace_id = ws;
  if cid is null then raise exception 'not_found'; end if;
  if not exists (select 1 from plan_items where id = p_item and client_id = cid and workspace_id = ws) then raise exception 'not_found'; end if;
  if p_weight is not null then update plan_items set target_weight = p_weight where id = p_item; end if;
  insert into weight_advice_decisions (workspace_id, log_id, plan_item_id, weight) values (ws, p_log, p_item, p_weight)
    on conflict (log_id, plan_item_id) do update set weight = excluded.weight, decided_at = now();
end $$;
revoke all on function public.decide_weight_advice(uuid, uuid, numeric) from public;
grant execute on function public.decide_weight_advice(uuid, uuid, numeric) to authenticated;
