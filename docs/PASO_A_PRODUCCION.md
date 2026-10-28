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
- [ ] `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID` (y `BUNNY_TOKEN_KEY` si se usa) — la cuenta ya existe y funciona en Vercel; **falta ponerlas en Netlify** y regenerar la clave (salió en capturas)
- [ ] `NEXT_PUBLIC_SITE_URL` solo con dominio propio (en Netlify, si no existe, se usa `URL`, que Netlify define sola; ver `app/layout.tsx`)
- [ ] `NEXT_PUBLIC_REQUIRE_INSTALL=1` para obligar a usar la app instalada en celulares (apagada si está vacía). `NEXT_PUBLIC_APP_NAME=YEFFITNES Test` solo en Vercel.
- [ ] Tras cambiar variables `NEXT_PUBLIC_*`, volver a desplegar (se incrustan al construir).

## 2. Supabase
- [ ] **Authentication → URL Configuration:** **Site URL = dirección de Netlify**; en **Redirect URLs** poner la de Netlify y la de Vercel (ambas con `/**` y sin `/**`).
- [ ] **Tareas programadas (pg_cron):** las cuatro (`yeffitnes-buenosdias`, `-mediodia`, `-noche`, `-sesiones`) deben llamar a la **dirección de Netlify** (SQL en `docs/CONTEXT.md` §13). Si se crearon con otra dirección: `select cron.unschedule('nombre');` y volver a programarlas.
- [ ] **Quinta tarea, borrado de vídeos (0033), programarla justo DESPUÉS de fusionar a `main`** (antes Netlify no tiene la ruta): cada hora, borra en Bunny los vídeos de reporte vencidos (32 h sin ver, 12 h tras verlos) y los huérfanos.
  `select cron.schedule('yeffitnes-videos', '7 * * * *', $$ select net.http_post(url:='https://yeffitnes.netlify.app/api/cron/purge-videos', headers:=jsonb_build_object('x-cron-secret','LA-MISMA-CLAVE-DEL-CRON')) $$);`
  Detener: `select cron.unschedule('yeffitnes-videos');`. Si cambias la clave del cron, reprograma también esta.
- [ ] **§3c Mantener despierto el servidor (primera apertura rápida):** DESPUÉS de fusionar (la ruta `/api/ping` debe existir en `main`). Cada 5 min, de 5 a. m. a medianoche hora Colombia (las horas del cron van en UTC). Costo en Netlify: unos 3 créditos/mes.
  `select cron.schedule('yeffitnes-despierta', '*/5 0-4,10-23 * * *', $$ select net.http_get(url:='https://yeffitnes.netlify.app/api/ping') $$);`
  Detener: `select cron.unschedule('yeffitnes-despierta');`. Si existe la de pruebas (`yeffitnes-despierta-vercel`), se puede dejar o detener igual.
- [ ] **Clave del cron:** cambiarla por una nueva antes de lanzar (`update public.app_secrets set value='NUEVA' where name='cron';`) y reprogramar las tareas; la actual circuló en capturas.
- [ ] Confirmación de correo: decidir si queda activa.
- [ ] Plan de Supabase: pasar a **Pro** antes de lanzar.
- [ ] Restringir el registro si Jeff solo quiere clientes invitados (hoy `/login` permite crear cuenta).

## 3. Notificaciones y app instalada
- [ ] Desde el 27-oct el cliente **no puede usar la app sin activar las notificaciones** (si el teléfono las admite). Sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY` esa pantalla no aparece: confirma que esté en Netlify antes de fusionar.
- [ ] Las suscripciones push y la app instalada son **por dirección**: los clientes y Jeff deben activar avisos e instalar la app **desde la dirección de Netlify**. Lo hecho en Vercel no vale.
- [ ] Mantener las **mismas claves VAPID** en los dos sitios; si se cambian, todos deben reactivar avisos.
- [ ] iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o superior).

## 3b. Migraciones pendientes antes de fusionar a `main`
- [x] `0028` a `0031`: corridas (Cristian confirmó la 0031 el 27-oct).
- [x] **`0032` a `0035`, en orden** (corridas) (27-oct). El código de `bloque-hoy` las necesita: sin la 0034 fallan Clientes y el portal del cliente (leen `access_requested_at`); sin la 0035, Material. Las cuatro son compatibles con el código viejo de `main`.
  - `0032_client_message_quota.sql`: cliente 3 textos, 1 foto, 1 vídeo al día.
  - `0033_report_video_expiry.sql`: vídeos de reporte 32 h / 12 h y funciones de la tarea programada.
  - `0034_access_request.sql`: "Solicitar acceso" y aviso "Tu plan está activo".
  - `0035_material_private_video.sql`: vídeo privado en Material y vídeo del día o de la semana.
- [x] **`0036_nudges_activity_objective_video.sql`** (corrida) (27-oct, noche): botón "Avisar", actividad solo de hoy, vídeo del objetivo. El código de `bloque-hoy` la necesita (Clientes y portal leen `objective_video_id`).
- [ ] **`0037_nudges_in_app.sql`** (27-oct, noche): "Avisar" guarda el aviso aunque falle el push y el cliente lo ve en Hoy. El código de `bloque-hoy` la necesita para "Avisar".

## 4. Bunny Stream
- [ ] Crear cuenta y biblioteca; poner las variables en Netlify (y Vercel).
- [ ] Si se activa protección por dominio o token en Bunny, **añadir la dirección de Netlify** (y la de Vercel si se prueba allí).
- [ ] Probar: vídeo de rutina (coach sube, cliente ve), vídeo del reporte (máx. **20 s**; de la galería hasta 60 s con recorte) y vídeo privado de Material (Jeff sube, cliente con el plan lo ve; sin el plan, no).
- [ ] Borrado de vídeos de reporte: 32 h sin verlos, 12 h tras verlos. Lo garantiza la tarea `yeffitnes-videos` (§2); abrir Reportes lo hace también como respaldo.

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

## 10. Próxima salida a `main` (preparada el 27-oct; NO fusionar hasta que Cristian diga "fusiona")
Orden:
1. Correr `0032` a `0037` en Supabase (§3b) y probar en Vercel con el cliente de prueba.
2. En Vercel, de punta a punta: registro nuevo → app con candados → "Solicitar acceso" (a Jeff le llega el aviso) → Jeff asigna plan (al cliente le llega "Tu plan está activo") → activar notificaciones → bienvenida con el personaje → mensajes (3 textos, 1 foto, 1 vídeo; el cuarto texto se rechaza) → reporte con vídeo → Jeff lo marca visto (dice "se borrará en 12 h") → Material: vídeo privado y vídeo del día.
3. Revisar en Netlify: `BUNNY_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
4. Los 4 chequeos (`tsc`, `lint`, build y `run_local.sh` en `TODO OK`).
5. Fusionar `bloque-hoy` → `main` en un solo bloque (15 créditos).
6. Justo después: programar `yeffitnes-videos` (§2) y probar en Netlify lo de §9.
