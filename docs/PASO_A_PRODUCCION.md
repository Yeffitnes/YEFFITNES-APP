# Paso de pruebas (Vercel) a producción (Netlify) — lista de cambios

**Por qué existe este archivo:** durante el desarrollo (unos 2 meses) la app se prueba en **Vercel (plan Hobby, solo pruebas)**, desplegando la rama `bloque-hoy`. La **producción** será **Netlify**, que solo despliega `main`. Antes de entregar a Jeff hay que recorrer esta lista completa. Marca cada casilla al hacerlo. (Vercel Hobby no permite uso comercial: nunca debe ser producción con clientes reales.)

Última actualización: 2026-10-25. Quien cambie cualquier cosa de entorno, dominio, claves o tareas programadas debe **actualizar esta lista**.

## 0. Estado actual (para ubicarse)
- Netlify (app): sitio original, despliega `main`, congelado a propósito (créditos gratis limitados; 15 créditos por deploy de producción).
- Vercel: proyecto `yeffitnes` (`https://yeffitnes.vercel.app`), rama de producción = `bloque-hoy`.
- Supabase: **un solo proyecto compartido** por Vercel y Netlify (los datos de prueba son los datos reales).
- Landing de venta: carpeta `landing/` (HTML estático, aparte de la app). El sitio de la landing en Netlify se borró.

## 1. Antes de mezclar a `main`
- [ ] Probar todo en Vercel con un teléfono real (Hoy, Mi plan, nutrición, push, vídeo, agenda).
- [ ] `npx tsc --noEmit`, `npx next lint` y `bash supabase/tests/run_local.sh` (debe decir `TODO OK`).
- [ ] Todas las migraciones (`supabase/migrations/`, hasta la última) corridas en Supabase.
- [ ] Revisar créditos/plan de Netlify: un deploy de producción cuesta 15. Si el plan gratis está pausado, esperar el reinicio del ciclo o pasar a un plan de pago.
- [ ] Mezclar `bloque-hoy` (y las demás ramas pendientes) a `main` en **un solo** deploy.

## 2. Variables de entorno en Netlify (Site configuration → Environment variables)
Deben ser las mismas que en Vercel:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID` (y `BUNNY_TOKEN_KEY` si se usa)
- [ ] `NEXT_PUBLIC_SITE_URL` solo si hay dominio propio (en Netlify, si no existe, se usa la variable `URL` que Netlify define sola; ver `app/layout.tsx`).
- [ ] Volver a desplegar después de cambiar variables `NEXT_PUBLIC_*` (se incrustan al construir).

## 3. Supabase
- [ ] **Authentication → URL Configuration:** poner como **Site URL** la dirección de producción y agregarla en **Redirect URLs** (con `/**`). Quitar la de Vercel al terminar las pruebas (o dejarla solo si se mantiene como entorno de pruebas).
- [ ] **Tareas programadas (pg_cron):** apuntan a la dirección que se usó al crearlas. Para pasar a producción, borrar y recrear las cuatro con la dirección de producción:
  `select cron.unschedule('yeffitnes-buenosdias'); … ('yeffitnes-mediodia'); … ('yeffitnes-noche'); … ('yeffitnes-sesiones');` y volver a programarlas (SQL en `docs/CONTEXT.md` §13).
- [ ] **Clave del cron:** cambiar por una nueva (`update public.app_secrets set value='NUEVA' where name='cron';`) y reprogramar las tareas con ella (la actual circuló en capturas de pantalla).
- [ ] Confirmación de correo (Authentication → Providers → Email): decidir si queda activa.
- [ ] Plan de Supabase: pasar a **Pro** antes de lanzar (copias de seguridad, límites).
- [ ] Restringir el registro si Jeff solo quiere clientes invitados (hoy `/login` permite crear cuenta).

## 4. Notificaciones y app instalada
- [ ] Las suscripciones push y la app instalada (pantalla de inicio) **son por dirección**: lo hecho en Vercel no pasa a Netlify. Cada persona debe volver a activar avisos e instalar la app desde la dirección de producción.
- [ ] Mantener las **mismas claves VAPID** en los dos sitios mientras se prueba; si se cambian, todos deben reactivar avisos.
- [ ] iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o superior).

## 5. Bunny Stream
- [ ] Crear la cuenta y la biblioteca; poner las variables en Netlify (y Vercel).
- [ ] Si se activa protección por dominio o token en Bunny, **añadir el dominio de producción**.
- [ ] Probar: vídeo de rutina (coach sube, cliente ve), vídeo del reporte (máx. 30 s), borrado automático (pendiente de implementar).

## 6. Dominio propio (opcional)
- [ ] Comprar/configurar dominio, apuntarlo a Netlify, poner `NEXT_PUBLIC_SITE_URL`, actualizar Supabase (punto 3) y volver a desplegar.
- [ ] Reinstalar la app en los teléfonos (cambia la dirección).

## 7. Landing de venta (`landing/`)
- [ ] Poner el WhatsApp real de Jeff (`COACH_PHONE` y los enlaces `wa.me/57XXXXXXXXXX` en `landing/index.html`) y su foto `landing/assets/jeff.jpg`.
- [ ] Confirmar con Jeff los planes y precios (hoy son propuesta, sin precios).
- [ ] Publicar en un hosting estático aparte (la landing no debe enlazar a la app ni al login).

## 8. Limpieza de datos antes de entregar
- [ ] Borrar clientes, mensajes, reportes, actividad, suscripciones push y reservas **de prueba** (Vercel y Netlify comparten base).
- [ ] Revisar que el cliente real de Jeff no reciba avisos de pruebas.

## 9. Seguridad y repositorio
- [ ] Pasar el repositorio a **privado** y volver a autorizar la integración de GitHub en Netlify (y Vercel si se mantiene).
- [ ] Revocar el token de GitHub usado durante el desarrollo.
- [ ] Desconectar o borrar el proyecto de Vercel al entregar (o dejarlo como pruebas, sabiendo que Hobby no es para uso comercial).

## 10. Después de salir a producción
- [ ] Probar en producción: login, Hoy, series (marcar y destachar), nutrición, mensaje, reporte con vídeo, agenda, avisos del cron.
- [ ] Anotar en `CHANGELOG.md` la fecha del paso a producción.
