-- 0050 (12-nov, aprobado por Cristian): en ejercicios sin peso (flexiones, dominadas...) la sugerencia es cambiar las repeticiones.
-- Jeff acepta las repeticiones sugeridas (o las que escriba) y se cambian en el plan del cliente en un solo paso.
-- Compatible con `main` y con el código de la 0049: solo agrega una columna y una función, y la 0049 sigue igual salvo que
-- descartar o aceptar un peso ahora limpia las repeticiones de una decisión anterior.
-- Revertir: drop function public.decide_reps_advice(uuid, uuid, text); alter table public.weight_advice_decisions drop column reps;
--           y volver a crear decide_weight_advice con el texto de la 0049.
alter table public.weight_advice_decisions add column reps text;

create function public.decide_reps_advice(p_log uuid, p_item uuid, p_reps text) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; r text := btrim(coalesce(p_reps, ''));
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  -- "12", "10-12" o con lo que ya decía el plan ("12 por lado"). Nunca 0.
  if length(r) > 30 or r !~ '^[0-9]{1,3}( ?- ?[0-9]{1,3})?( [^0-9]{1,24})?$' or r ~ '^0+( |-|$)' then raise exception 'bad_reps'; end if;
  select client_id into cid from workout_logs where id = p_log and workspace_id = ws;
  if cid is null then raise exception 'not_found'; end if;
  if not exists (select 1 from plan_items where id = p_item and client_id = cid and workspace_id = ws) then raise exception 'not_found'; end if;
  update plan_items set reps = r where id = p_item;
  insert into weight_advice_decisions (workspace_id, log_id, plan_item_id, weight, reps) values (ws, p_log, p_item, null, r)
    on conflict (log_id, plan_item_id) do update set weight = null, reps = excluded.reps, decided_at = now();
end $$;
revoke all on function public.decide_reps_advice(uuid, uuid, text) from public;
grant execute on function public.decide_reps_advice(uuid, uuid, text) to authenticated;

create or replace function public.decide_weight_advice(p_log uuid, p_item uuid, p_weight numeric default null) returns void
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
    on conflict (log_id, plan_item_id) do update set weight = excluded.weight, reps = null, decided_at = now();
end $$;
