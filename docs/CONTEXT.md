# CONTEXTO DEL PROYECTO — leer ANTES de tocar nada
Última actualización: 24-oct-2026. Si cambias algo importante, actualiza este archivo, `PROJECT_STATE.md` y `CHANGELOG.md`. Cómo trabajar: `docs/AGENT_PLAYBOOK.md`.

## 1. Qué es
App web instalable (PWA) para **YEFFITNES TRAINING**, coaching fitness casi 100 % online del coach **Jefferson González ("Jeff")**. Lidera producto y desarrollo **Cristian Santiago Gómez Romero** (freelance, no usa terminal: explica y da pasos concretos, en español).
Inicio 21-oct-2026. Plazo: **2 meses, ampliable a 3** (P0 y P1 primero; P2 puede usar el mes 3). Dos entornos: **panel del coach** (`/coach`, escritorio primero) y **portal del cliente** (`/inicio`, móvil primero). Repo: `Yeffitnes/YEFFITNES-APP` (rama `main` → Netlify). Producción de pruebas: `yeffitnes.netlify.app`.

## 2. Reglas de oro
1. **Fidelidad al diseño.** `design/mockups/` es la fuente visual (colores rojo `#F7254B`, negro, dorado). Copiar estructura, clases, textos **y flujo**; mejorar sí, improvisar no.
2. **No inventar** reglas, precios, planes, horarios ni datos del coach. Lo no decidido = `NO DEFINIDO`; lo que sugiere el agente = `PROPUESTA`; lo deducido = `INFERENCIA`.
3. **Prioridades** P0 crítico > P1 importante > P2 deseable > P3 futuro. P2/P3 nunca bloquean P0.
4. **Simple por dentro, premium por fuera.** Nada de infraestructura que no haga falta.
5. **Definición de hecho:** funciona, es seguro (RLS + pruebas de ataque), tiene estados cargando/vacío/error, sirve en móvil y escritorio, no rompe nada, está documentado en CHANGELOG.
6. **Honestidad:** decir qué se verificó y qué no.

## 3. Requisitos del coach (nivel 1, dichos por Cristian/Jeff)
- Sin pagos en la app: la venta se cierra fuera de la app (Jeff habla con el cliente); el cliente instala la PWA y se registra solo. **WhatsApp ya no existe dentro de la app**: todo contacto es por Mensajes. Jeff lo activa y le asigna el plan (el plan decide qué ve).
- Onboarding interactivo con personaje guía (P2): tour, peso, medidas, fotos con consentimiento y agendar llamada de sábado o domingo con Jeff.
- Jeff arma nutrición y rutina **dentro de la app** (sin PDFs), desde plantillas que clona y ajusta por cliente.
- Rutina por días con enfoque, ejercicios, vídeo/imágenes, peso e intensidad.
- El cliente registra repeticiones y **peso real** (aproximaciones incluidas; opcional pero algunas partes pueden ser obligatorias) y **esfuerzo 1–10**.
- **Reporte diario obligatorio:** vídeo muy corto de verificación + comentario. Vídeos de clientes se borran solos (propuesta: 24 h tras revisados, tope 7 días).
- **Sin chat.** Jeff comenta a un cliente o publica anuncios a todos (visibles en el inicio). El cliente escribe una vez por noche, ligado a su reporte. Sin "visto".
- Jeff solo revisa **por las noches entre semana**; fines de semana, llamadas y sesiones. El panel es una **cola de revisión priorizada**.
- Agenda: Jeff publica horarios y el cliente reserva. Sin sesiones presenciales por ahora.
- Vídeos: material educativo de Jeff en **YouTube embebido**; privados en **Bunny Stream** subidos desde la app (costo aceptado por Jeff).
- Fotos de progreso del cliente y de Jeff (privadas, comprimidas).
- Base **multi-coach** (cada coach con su entorno, logo y colores); cobro a coaches, dominios propios, etc. = P3.

## 4. Stack e infraestructura
Ver `ARCHITECTURE.md`. Supabase en **us-east-1**; Netlify (Ohio por defecto). Variables de entorno (Netlify y `.env.local`, jamás en el repo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BUNNY_API_KEY`/`BUNNY_LIBRARY_ID`/`BUNNY_TOKEN_KEY` (vídeo), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (avisos push; generar con `npx web-push generate-vapid-keys`; la pública se incrusta al construir), opcional `NEXT_PUBLIC_SITE_URL` (dominio propio para el enlace con imagen).
Costos estimados al lanzar (oct-2026): Supabase Pro ~US$25/mes + Bunny ~US$1–3/mes + dominio ≈ US$26–30/mes. Bunny aún no está integrado.

## 5. Estado funcional (qué existe)
- **Coach:** Dashboard con cola de revisión · Clientes (lista, ficha con Resumen/Entrenamiento/Progreso; asignar plan) · Catálogo (ejercicios, rutinas en modal) · Entrenamiento por días (crear plan, asignar rutina a uno o varios días, peso objetivo) · Revisar entrenamientos y comentar · Agenda (publicar, agendar, cancelar) · Reportes diarios (cola de revisión con vídeo y "marcar visto") · Nutrición (plantillas en Catálogo; calorías y macros fijos + comidas por día o "todos los días", con "copiar día a…"; asignar/editar por cliente en su ficha) · Objetivo actual por cliente (Resumen de la ficha) · Anuncios a todos (tarjeta en el Dashboard; fijar, vencimiento) · Notas privadas por cliente (pestaña de la ficha) · Material educativo (artículos y vídeos de YouTube, borrador/publicado, plan básico o completo, "vídeo de la semana", conteo de vistas).
- **Cliente:** Hoy (rutina del día, series con repeticiones y peso, esfuerzo, comentario del coach, racha) · Mi plan (semana y técnica en vídeo) · Progreso (mediciones, gráfica, fotos antes/después, borrar fotos) · Agenda (reservar/cancelar) · Reporte diario en Hoy (vídeo corto + comentario; sin Bunny configurado se envía solo el comentario) · Nutrición en Mi plan (con selector de día) · "Hoy" completo según el diseño: vídeo de la semana, próxima sesión, objetivo, nutrición de hoy y progreso reciente · Bienvenida de 3 pasos la primera vez (medidas iniciales, agendar llamada) · Anuncios del coach en Hoy · Material (artículos y vídeos; lo del plan completo sale bloqueado con enlace a WhatsApp) · pantallas bloqueadas por plan.
- **Aún no existe:** documentos PDF dentro del material (pendiente de almacenamiento),  personaje guía y contenido definitivo del onboarding, modo sin conexión, documentos PDF.
- **Vídeo (Bunny):** el código existe y se probó la lógica y que sin sesión se rechaza, pero **nunca se ha subido un vídeo real**: faltan las variables `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID` (y `BUNNY_TOKEN_KEY` si la biblioteca tiene "token authentication") en Netlify. Sin ellas el reporte diario se envía solo con comentario. Reglas PROPUESTA (confirmar con Jeff): vídeo ≤ 90 s y ≤ 200 MB, borrado 24 h después de verlo y máx. 7 días, 5 subidas/día por cliente. El borrado en Bunny se ejecuta cuando el coach abre "Reportes diarios" (no requiere cron).
- **Lo que NADIE ha probado de punta a punta contra el Supabase real** (a 24-oct): el flujo completo coach→cliente→revisión, subir foto desde celular, agenda con dos usuarios. Se verificó por tipos, lint y pruebas de ataque en Postgres de prueba.

### Móvil (regla de Cristian)
La mayoría de clientes y Jeff usan el celular. La pantalla debe ser **estática: sin zoom** (viewport con `maximum-scale=1` + `components/NoZoom.tsx` para el pellizco de iOS + campos a 16 px en táctil + `touch-action: manipulation`) y adaptarse a cualquier tamaño (sin scroll horizontal; ventanas con scroll interno y `92dvh`). Todo esto vive en `app/globals.css` y `app/layout.tsx`. Al agregar pantallas: probar a 360–430 px de ancho y no usar letra < 16 px en campos.

## 6. Checklist para agregar una tabla o pantalla
Ver `AGENT_PLAYBOOK.md` §4. Resumen: migración nueva numerada con `workspace_id` + RLS (validando TODAS las referencias) + caso en `supabase/tests/` → consultas en `lib/queries.ts` → `page.tsx` delgada + vista en `components/` copiando el mockup (`design/port_css.py`) → estados cargando/vacío/error → `tsc`, `lint`, `run_local.sh` → CHANGELOG.

## 7. Seguridad
RLS en todas las tablas; el cliente solo ve lo suyo; el coach solo su espacio; nadie cambia su rol (el coach se asigna por SQL); un cliente no escribe campos del coach (trigger). Las reglas de reserva viven en funciones SQL. Fotos en bucket privado con URL firmada y consentimiento. Cabeceras de seguridad en `next.config.mjs` (**ojo:** `microphone=()` hay que cambiarlo a `(self)` al construir el vídeo diario). **Lección del 24-oct:** las políticas "el cliente solo toca lo suyo" no bastan si no validan workspace, cliente, plan y ruta de archivo; se hallaron y corrigieron huecos (0009, 0011).
Pendientes de seguridad antes de lanzar: revocar el token de GitHub usado en desarrollo · apagar la insignia "Powered by Netlify" (se muestra a todos los visitantes; se apaga en el panel de Netlify, no en el código) · hacer el repo **privado** (hoy es público) · Supabase **Pro** · activar la **confirmación de correo** (hoy desactivada para pruebas; el código ya avisa al usuario si se activa) · revisar RLS otra vez.

## 8. Diseño y copy
Tokens en `tailwind.config.ts` y los CSS por zona (`app/coach/coach.css`, `app/inicio/portal.css`, portados de los mockups): neon `#F7254B`, rose `#F2406B`, oro `#CDB170`/`#8D6526`, ink `#0A0910`, surface `#F5F6FA`. Fuentes: Instrument Sans (títulos), Manrope (texto), IBM Plex Mono (etiquetas). Modales: clases `modal-*`. Textos en español, tono cercano, errores humanos sin códigos, "Tu coach/Jeff".

## 9. Puesta en marcha desde cero
1. Supabase: crear proyecto (región us-east-1); Auth → desactivar "Confirm email" (solo pruebas).
2. SQL Editor: ejecutar **en orden** `supabase/migrations/0001…0024`. Después de 0001, crear el espacio: `insert into public.workspaces (slug,name,whatsapp) values ('yeffitnes','YEFFITNES TRAINING','57…');` y recién entonces `0002` (planes). **El espacio debe existir antes del primer registro.**
3. Netlify: importar el repo, cargar las 3 variables, desplegar.
4. Registrar el correo de Jeff y: `update public.profiles set role='coach' where id=(select id from auth.users where email='…');`
5. Probar con otro correo (cliente) en una ventana de incógnito: queda pendiente → Jeff le asigna plan → ve su contenido.

## 10. Mapa de migraciones (no editar las ya ejecutadas)
| # | Contenido |
|---|---|
| 0001 | espacios, perfiles, planes, clientes, alta automática, RLS |
| 0002 | planes iniciales Esencial/Completo (PROPUESTA) |
| 0003 | ejercicios, rutinas plantilla, ítems; coach no es cliente |
| 0004 | `save_routine` atómica |
| 0005 | planes de entrenamiento, días, ítems; `create_training_plan`, `assign_day` |
| 0006 | registros de entrenamiento y series; `log_set`, `finish_workout`; el plan se valida en la base |
| 0007 | revisión del coach (comentario, visto) y su trigger de protección |
| 0008 | mediciones y fotos privadas (bucket) |
| 0009 | endurecimiento de escrituras del cliente (entrenamientos) |
| 0010 | metadatos de día (minutos, tipo) y `assign_day` actualizada |
| 0011 | endurecimiento de Progreso |
| 0012 | agenda: huecos, reservas y sus funciones |
| 0013 | material educativo: `materials`, `material_views`, `list_materials`, `open_material`, `set_featured_material` |
| 0014 | anuncios a todos (`announcements`, `list_announcements`) y notas privadas (`client_notes`) |
| 0015 | reporte diario: `daily_reports`, `video_uploads`, `can_report`, `register_video_upload`, `submit_report`, `review_report`, `due_report_videos`, `mark_video_deleted` |
| 0016 | nutrición: `nutrition_plans` (client_id nulo = plantilla), `nutrition_meals`, `save_nutrition`, `assign_nutrition` |
| 0017 | onboarding: `clients.onboarded_at`, `complete_onboarding` |
| 0018 | nutrición por días: `nutrition_meals.weekday` (nulo = todos los días); `save_nutrition`/`assign_nutrition` actualizadas |
| 0019 | objetivo actual del cliente: `clients.objective`, `objective_at` (lo escribe el coach) |
| 0020 | mensajes cliente↔coach: `messages`, `send_message`, `list_threads`, `unread_messages`, `mark_thread_read`, `register_message_video`, bucket `message-images`, Realtime |
| 0021 | avisos push: `push_subscriptions`, `save_push_subscription`, `push_targets`, `prune_push` |
| 0022 | vídeo de rutina: `routine_templates.video_ref`, `plan_days.video_ref/video_id`, `save_routine(…, p_video)`, `assign_day` copia el vídeo, `set_day_video` |
| 0024 | clases grupales: `availability_slots.capacity`, reservas con cupos |
| 0023 | recordatorios: `app_secrets`, `reminder_log`, `due_reminders(secret, now)` |

## 11. Decisiones pendientes con Jeff (no inventar)
Planes: nombres, precios y qué incluye cada uno (hoy PROPUESTA Esencial/Completo) · reglas de agenda (hoy PROPUESTA: 1 reserva futura, cancelar hasta 24 h antes, tipos "Llamada inicial"/"Seguimiento") · duración y obligatoriedad del vídeo diario y plazo de borrado · qué partes del registro de series son obligatorias · contenido del onboarding y estilo del personaje · plantillas de rutina y nutrición de Jeff · nombre público (la marca dibujada en el logo es YEFFITNES TRAINING; Cristian lo llama "Jeff Fitness") · dominio propio · inversión/costos con Jeff · propiedad intelectual de lo heredado de DaniFit.

## 12. Deuda técnica conocida
Textos "Jeff" fijos y `handle_new_user` asigna siempre el primer espacio (solo sirve con un coach) · zona horaria asumida única (Bogotá) · `ex_client_read` expone el catálogo completo de ejercicios al cliente con plan · menú con ítems sin pantalla (apagados) · los modales no atrapan el foco del teclado · PWA sin modo sin conexión · tablas de la cola de revisión calculadas en el navegador (suficiente hasta ~50 clientes; luego, una vista SQL).


## 13. Activar los recordatorios automáticos y los avisos push (pendiente del lado de Cristian)
1. Generar claves: `npx web-push generate-vapid-keys`. En Netlify → Environment variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (pública), `VAPID_PRIVATE_KEY` (privada, sin NEXT_PUBLIC_), `VAPID_SUBJECT=mailto:tu-correo`. Volver a desplegar (la pública se incrusta al construir).
2. Recordatorios automáticos (a horas fijas, migración 0027): en Supabase → Database → Extensions activar `pg_cron` y `pg_net`; en SQL Editor: `insert into public.app_secrets values ('cron','UNA-CLAVE-LARGA');` y programar 4 tareas (pg_cron usa UTC; Bogotá = UTC-5): buenos días 7:00 (`0 12 * * *`, `?kind=morning`), mediodía 12:30 (`30 17 * * *`, `?kind=midday`), noche 20:00 (`0 1 * * *`, `?kind=night`, reporte) y sesiones (`*/15 * * * *`, `?kind=session`, que llama a la app solo si hay una reserva en la próxima hora). Cada una: `select cron.schedule('nombre','cron', $$ select net.http_post(url:='https://TU-SITIO/api/cron/reminders?kind=...', headers:=jsonb_build_object('x-cron-secret','UNA-CLAVE-LARGA')) $$);`. Detener: `select cron.unschedule('nombre');`. Textos y horas = PROPUESTA (confirmar con Jeff).
3. iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4+).
