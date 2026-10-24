-- Endurece lo que un cliente puede ESCRIBIR. Hallazgo (24-oct, prueba de ataques contra la API directa):
-- con las políticas de 0006 un cliente podía (a) crear/mover un registro con el workspace_id de OTRO coach,
-- (b) colgar series en el registro de otro cliente, (c) usar ejercicios o días del plan de otro cliente.
-- No pasaba por la app (las funciones log_set/finish_workout usan datos propios), pero la API de Supabase es pública.
-- Ahora cada fila escrita por un cliente debe ser suya EN TODAS sus referencias. Las funciones existentes siguen funcionando.

drop policy wl_client_ins on public.workout_logs;
drop policy wl_client_upd on public.workout_logs;
drop policy sl_client_ins on public.set_logs;
drop policy sl_client_upd on public.set_logs;

create policy wl_client_ins on public.workout_logs for insert with check (
  client_id = (select public.my_client_id()) and (select public.client_has_feature('training'))
  and workspace_id = (select public.my_workspace())
  and (plan_day_id is null or exists (select 1 from public.plan_days d where d.id = plan_day_id and d.client_id = (select public.my_client_id())))
);
create policy wl_client_upd on public.workout_logs for update
  using (client_id = (select public.my_client_id()) and (select public.client_has_feature('training')))
  with check (
    client_id = (select public.my_client_id()) and (select public.client_has_feature('training'))
    and workspace_id = (select public.my_workspace())
    and (plan_day_id is null or exists (select 1 from public.plan_days d where d.id = plan_day_id and d.client_id = (select public.my_client_id())))
  );
create policy sl_client_ins on public.set_logs for insert with check (
  client_id = (select public.my_client_id()) and (select public.client_has_feature('training'))
  and workspace_id = (select public.my_workspace())
  and exists (select 1 from public.workout_logs w where w.id = workout_log_id and w.client_id = (select public.my_client_id()))
  and (plan_item_id is null or exists (select 1 from public.plan_items i where i.id = plan_item_id and i.client_id = (select public.my_client_id())))
);
create policy sl_client_upd on public.set_logs for update
  using (client_id = (select public.my_client_id()) and (select public.client_has_feature('training')))
  with check (
    client_id = (select public.my_client_id()) and (select public.client_has_feature('training'))
    and workspace_id = (select public.my_workspace())
    and exists (select 1 from public.workout_logs w where w.id = workout_log_id and w.client_id = (select public.my_client_id()))
    and (plan_item_id is null or exists (select 1 from public.plan_items i where i.id = plan_item_id and i.client_id = (select public.my_client_id())))
  );

-- El plan de entrenamiento solo se lee si el plan comercial del cliente incluye "training" (regla del Blueprint: el bloqueo vive en la base).
drop policy tp_client on public.training_plans;
drop policy pd_client on public.plan_days;
drop policy pi_client on public.plan_items;
create policy tp_client on public.training_plans for select using (client_id = (select public.my_client_id()) and (select public.client_has_feature('training')));
create policy pd_client on public.plan_days for select using (client_id = (select public.my_client_id()) and (select public.client_has_feature('training')));
create policy pi_client on public.plan_items for select using (client_id = (select public.my_client_id()) and (select public.client_has_feature('training')));
