# SQL para cuentas de prueba (Supabase → SQL Editor)

Probados en una base local el 27-oct. Ninguno toca la cuenta del coach (si le pones el correo de Jeff, se detiene). Cambia solo el correo y ejecuta el bloque completo.

## 1. Reiniciar una cuenta como nueva (recomendado para probar)
Misma cuenta y contraseña; borra todo lo demás y la deja pendiente, sin plan y sin bienvenida vista.

```sql
-- REINICIAR UNA CUENTA COMO SI ACABARA DE REGISTRARSE (misma cuenta y misma contraseña; se borra todo lo demás).
-- Queda PENDIENTE, sin plan, sin bienvenida vista, sin permiso de fotos, sin llamada ni datos.
-- 1) Cambia el correo de la línea "correo". 2) Ejecuta TODO el bloque en Supabase → SQL Editor.
do $$
declare
  correo text := 'cliente@ejemplo.com';   -- <<< CAMBIA ESTO
  uid uuid; cid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(correo));
  if uid is null then raise exception 'No hay ninguna cuenta con el correo %', correo; end if;
  if exists (select 1 from public.profiles where id = uid and role = 'coach') then raise exception 'Esa cuenta es de un COACH: este script no la toca.'; end if;
  select id into cid from public.clients where profile_id = uid;
  if cid is null then raise exception 'La cuenta existe pero no tiene ficha de cliente.'; end if;
  insert into public.message_trash (workspace_id, kind, ref)
    select workspace_id, 'video', video_id from public.video_uploads where client_id = cid;   -- vídeos: se borran de Bunny al abrir Jeff Mensajes
  delete from public.messages        where client_id = cid;
  delete from public.daily_reports   where client_id = cid;
  delete from public.workout_logs    where client_id = cid;   -- y sus series
  delete from public.meal_logs       where client_id = cid;
  delete from public.activity_events where client_id = cid;
  delete from public.bookings        where client_id = cid;
  delete from public.measurements    where client_id = cid;
  delete from public.progress_photos where client_id = cid;   -- el archivo queda en Storage → progress-photos
  delete from public.material_views  where client_id = cid;
  delete from public.client_notes    where client_id = cid;
  delete from public.training_plans  where client_id = cid;   -- y sus días y ejercicios
  delete from public.nutrition_plans where client_id = cid;   -- y sus comidas
  delete from public.video_uploads   where client_id = cid;
  delete from public.push_subscriptions where profile_id = uid;
  update public.clients set status = 'pending', plan_id = null, onboarded_at = null, image_consent_at = null,
    objective = null, objective_at = null, access_requested_at = null, activated_at = null, activation_notified_at = null
  where id = cid;
  raise notice 'Cuenta % reiniciada: quedó como recién registrada.', correo;
end $$;
```

## 2. Borrar una cuenta por completo
No se puede deshacer. Después puedes registrarte otra vez con el mismo correo.

```sql
-- BORRAR UNA CUENTA DE CLIENTE POR COMPLETO (no se puede deshacer).
-- 1) Cambia el correo de la línea "correo". 2) Ejecuta TODO el bloque en Supabase → SQL Editor.
do $$
declare
  correo text := 'cliente@ejemplo.com';   -- <<< CAMBIA ESTO
  uid uuid; cid uuid; n int;
begin
  select id into uid from auth.users where lower(email) = lower(trim(correo));
  if uid is null then raise exception 'No hay ninguna cuenta con el correo %', correo; end if;
  if exists (select 1 from public.profiles where id = uid and role = 'coach') then raise exception 'Esa cuenta es de un COACH: este script no la borra.'; end if;
  select id into cid from public.clients where profile_id = uid;
  -- Sus vídeos privados quedan anotados para que se borren de Bunny la próxima vez que Jeff abra Mensajes.
  insert into public.message_trash (workspace_id, kind, ref)
    select workspace_id, 'video', video_id from public.video_uploads where client_id = cid;
  get diagnostics n = row_count;
  -- Borra la cuenta: en cadena se borran su perfil, su ficha y todo lo suyo (entrenos, reportes, mensajes, medidas, reservas, avisos…).
  delete from auth.users where id = uid;
  raise notice 'Cuenta % borrada. Vídeos enviados a la basura de Bunny: %. Si tenía fotos de progreso, bórralas en Storage → progress-photos (carpeta %).', correo, n, cid;
end $$;
```

## Qué NO borran
- **Fotos de progreso**: el archivo queda en Storage → `progress-photos` (carpeta con el id del cliente que muestra el mensaje). Bórralo a mano si quieres.
- **Vídeos en Bunny**: quedan anotados y se borran solos la próxima vez que Jeff abra Mensajes.
- **El permiso de avisos del teléfono**: para volver a ver la pantalla "Activa las notificaciones", desactiva las notificaciones de YEFFITNES en los ajustes del teléfono (o borra y vuelve a instalar la app).
