-- 0039 · Imagen de cada ejercicio (pedido de Cristian, 28-oct): miniatura con el personaje en el catálogo, Mi plan y Hoy.
-- exercises.image:
--   'preset:<archivo>' → imagen que viene dentro de la app (public/ex/<archivo>.webp): no ocupa espacio en Supabase.
--   'storage:<espacio>/<archivo>' → imagen que sube Jeff para sus propios ejercicios (bucket público exercise-images, máx. 300 KB;
--   la app la reduce a 360 px antes de subirla). Solo el coach del espacio sube o borra en su carpeta.
-- exercises.sugg_sets / sugg_reps: series y repeticiones sugeridas; se usan para rellenar la fila al armar una rutina.
-- Compatible con main: columnas nuevas opcionales.
-- Revertir: alter table public.exercises drop column image, drop column sugg_sets, drop column sugg_reps;
--   drop policy "eximg: el coach sube a su carpeta" on storage.objects; drop policy "eximg: el coach cambia las de su carpeta" on storage.objects;
--   drop policy "eximg: el coach borra las de su carpeta" on storage.objects; delete from storage.buckets where id = 'exercise-images';

alter table public.exercises
  add column image text check (image is null or image ~ '^(preset:[a-z0-9-]{3,80}|storage:[0-9a-f-]{36}/[A-Za-z0-9._-]{3,120})$'),
  add column sugg_sets smallint check (sugg_sets between 1 and 10),
  add column sugg_reps text check (sugg_reps is null or length(sugg_reps) between 1 and 24);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('exercise-images', 'exercise-images', true, 307200, array['image/webp','image/jpeg','image/png']) on conflict (id) do nothing;
create policy "eximg: el coach sube a su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-images' and public.my_role() = 'coach' and (storage.foldername(name))[1] = public.my_workspace()::text);
create policy "eximg: el coach cambia las de su carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'exercise-images' and public.my_role() = 'coach' and (storage.foldername(name))[1] = public.my_workspace()::text);
create policy "eximg: el coach borra las de su carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-images' and public.my_role() = 'coach' and (storage.foldername(name))[1] = public.my_workspace()::text);
