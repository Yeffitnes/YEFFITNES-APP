-- Endurece Progreso (0008) con el mismo criterio que 0009. Hallazgo (24-oct, supabase/tests/rls_progress.sql):
-- un cliente podía (a) crear/mover una medición o foto con el workspace_id de OTRO coach,
-- (b) registrar una foto cuyo archivo apunta a la carpeta de otro cliente. La API de Supabase es pública.
drop policy me_client_ins on public.measurements;
drop policy me_client_upd on public.measurements;
drop policy ph_client_ins on public.progress_photos;
create policy me_client_ins on public.measurements for insert with check (
  client_id = (select public.my_client_id()) and workspace_id = (select public.my_workspace())
  and recorded_by = 'client' and (select public.client_has_feature('progress')));
create policy me_client_upd on public.measurements for update
  using (client_id = (select public.my_client_id()) and (select public.client_has_feature('progress')))
  with check (client_id = (select public.my_client_id()) and workspace_id = (select public.my_workspace()) and recorded_by = 'client');
-- La ruta del archivo debe ser <workspace>/<cliente>/<archivo>: ni de otro cliente ni de otro espacio.
create policy ph_client_ins on public.progress_photos for insert with check (
  client_id = (select public.my_client_id()) and workspace_id = (select public.my_workspace())
  and storage_path like workspace_id::text || '/' || client_id::text || '/%'
  and (select public.client_has_feature('progress')) and (select public.client_has_consent()));
