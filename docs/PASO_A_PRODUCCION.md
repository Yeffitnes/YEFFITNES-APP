# Entornos: producción en Netlify, pruebas en Vercel

**Decisión (2026-10-25):** la **producción** es **Netlify** (plan de pago Personal, 1.000 créditos/mes; cada deploy de producción cuesta 15). Netlify solo despliega `main`. **Vercel (plan Hobby)** se usa **solo para probar** cambios importantes de funcionalidad, desplegando la rama `bloque-hoy` (o la rama de trabajo). Vercel Hobby no permite uso comercial: nunca debe tener clientes reales.

Quien cambie claves, dominios, variables o tareas programadas debe **actualizar esta lista**.

## Reglas del día a día
- Todo lo de **producción** apunta a Netlify: tareas programadas (cron) de Supabase, **Site URL** de Supabase, Bunny, avisos y la app que instalan los clientes.
- Vercel es un **entorno de pruebas con la misma base de datos** que producción: lo que se haga allí es dato real. Probar con el cliente de prueba.
- Un deploy a Netlify = mezclar a `main`. Juntar cambios en bloques (15 créditos cada uno).
- Las migraciones de `supabase/migrations/` se corren a mano en el SQL Editor **antes** de mezclar el código que las usa.
- **Importante:** el código de `main` debe incluir la ruta `/api/cron/reminders?kind=...` y la migración `0027` antes de programar los avisos en Netlify (si no, el cron falla).

## 1. Variables de entorno (en Netlify y en Vercel, iguales)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID` (y `BUNNY_TOKEN_KEY` si se usa) — pendiente de crear la cuenta
- [ ] `NEXT_PUBLIC_SITE_URL` solo con dominio propio (en Netlify, si no existe, se usa `URL`, que Netlify define sola; ver `app/layout.tsx`)
- [ ] `NEXT_PUBLIC_REQUIRE_INSTALL=1` para obligar a usar la app instalada en celulares (apagada si está vacía). `NEXT_PUBLIC_APP_NAME=YEFFITNES Test` solo en Vercel.
- [ ] Tras cambiar variables `NEXT_PUBLIC_*`, volver a desplegar (se incrustan al construir).

## 2. Supabase
- [ ] **Authentication → URL Configuration:** **Site URL = dirección de Netlify**; en **Redirect URLs** poner la de Netlify y la de Vercel (ambas con `/**` y sin `/**`).
- [ ] **Tareas programadas (pg_cron):** las cuatro (`yeffitnes-buenosdias`, `-mediodia`, `-noche`, `-sesiones`) deben llamar a la **dirección de Netlify** (SQL en `docs/CONTEXT.md` §13). Si se crearon con otra dirección: `select cron.unschedule('nombre');` y volver a programarlas.
- [ ] **Clave del cron:** cambiarla por una nueva antes de lanzar (`update public.app_secrets set value='NUEVA' where name='cron';`) y reprogramar las tareas; la actual circuló en capturas.
- [ ] Confirmación de correo: decidir si queda activa.
- [ ] Plan de Supabase: pasar a **Pro** antes de lanzar.
- [ ] Restringir el registro si Jeff solo quiere clientes invitados (hoy `/login` permite crear cuenta).

## 3. Notificaciones y app instalada
- [ ] Las suscripciones push y la app instalada son **por dirección**: los clientes y Jeff deben activar avisos e instalar la app **desde la dirección de Netlify**. Lo hecho en Vercel no vale.
- [ ] Mantener las **mismas claves VAPID** en los dos sitios; si se cambian, todos deben reactivar avisos.
- [ ] iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o superior).

## 3b. Migraciones pendientes antes de fusionar a `main`
- [ ] `0028_messages_board.sql`, `0029_audio_messages.sql` y `0030_discard_videos.sql` y `0031_workout_comment_audio.sql` en el SQL editor de Supabase (la 0029 es necesaria para el código de `bloque-hoy`: lee `audio_path`; la 0031, porque ese código lee `coach_comment_audio` y sin ella las pantallas de entrenamiento fallan).

## 4. Bunny Stream
- [ ] Crear cuenta y biblioteca; poner las variables en Netlify (y Vercel).
- [ ] Si se activa protección por dominio o token en Bunny, **añadir la dirección de Netlify** (y la de Vercel si se prueba allí).
- [ ] Probar: vídeo de rutina (coach sube, cliente ve) y vídeo del reporte (máx. 30 s). Borrado automático de reportes: ya implementado (se ejecuta al abrir Reportes). Probar también el cortador con un vídeo de más de 30 s.

## 5. Dominio propio (opcional)
- [ ] Configurarlo en Netlify, poner `NEXT_PUBLIC_SITE_URL`, actualizar Supabase (punto 2) y las tareas programadas, y volver a desplegar.
- [ ] Reinstalar la app en los teléfonos (cambia la dirección).

## 6. Landing de venta (`public/landing/`, ruta `/landing`)
- [ ] **Hoy vive dentro del sitio de la app, en `/landing`** (temporal). Se publica con cada deploy a Netlify. Cualquiera que escriba `/login` puede ver el acceso; es aceptado de forma temporal.
- [ ] **Pendiente a futuro:** moverla a su propia dirección (pasos en `public/landing/README.md`).
- [ ] WhatsApp real de Jeff (`COACH_PHONE` y los `wa.me/57XXXXXXXXXX` en `public/landing/index.html`) y su foto `public/landing/assets/jeff.jpg`.
- [ ] Confirmar planes y precios con Jeff (hoy son propuesta, sin precios).
- [ ] La imagen para compartir (`og:image`) usa ruta relativa; al tener dirección definitiva, poner la URL completa.

## 7. Limpieza antes de entregar
- [ ] Borrar clientes, mensajes, reportes, actividad, suscripciones push y reservas **de prueba**.

## 8. Seguridad y repositorio
- [ ] Pasar el repositorio a **privado** y volver a autorizar la integración de GitHub en Netlify y Vercel.
- [ ] Revocar el token de GitHub usado en el desarrollo.
- [ ] Decidir si Vercel se mantiene como pruebas (sin clientes reales) o se desconecta.

## 9. Tras cada salida a producción
- [ ] Probar en Netlify: login, Hoy, series (marcar y destachar), nutrición, mensaje, reporte con vídeo, agenda y avisos.
- [ ] Anotar la fecha en `CHANGELOG.md`.
