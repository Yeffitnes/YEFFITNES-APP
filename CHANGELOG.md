# CHANGELOG
Formato: fecha · título · qué y por qué · archivos/SQL · **cómo revertir**. Lo más reciente arriba.

## 2026-10-25 · Clases grupales, "De tu coach", pestañas Mensajes/Agenda en la ficha y landing (migración 0024; en la rama `bloque-grande`)
- **Clases grupales (0024):** `availability_slots.capacity` (1 = individual). Jeff elige "Cupos" al publicar; en su agenda el hueco muestra "3/4 cupos" con los inscritos (se puede quitar a uno) y en Dashboard "Clase grupal: …". El cliente ve "N cupos" y no puede reservar si está lleno. El límite se valida en la base con el hueco bloqueado (dos reservas a la vez no superan los cupos). Suite `rls_groups.sql`.
- **Hoy:** tarjeta "De tu coach" con su último mensaje (del blueprint, "De Daniel"). **Ficha del cliente:** pestañas **Mensajes** (escribirle desde ahí) y **Agenda** (sus sesiones). **Landing pública** en `/` (textos PROPUESTA, sin precios: no están definidos).
- **Revertir:** `git revert` y en Supabase: restaurar `book_slot`/`coach_book_slot`/`list_open_slots` de 0012, `drop index one_confirmed_booking_per_client_slot; create unique index one_confirmed_booking_per_slot on public.bookings (slot_id) where status = 'confirmed'; alter table public.availability_slots drop column capacity;` (si ya hay clases con varios inscritos, primero cancelar las reservas sobrantes).

## 2026-10-25 · BLOQUE GRANDE (rama `bloque-grande`, sin subir a main): mensajes en la app, avisos push, recordatorios, vídeo de rutina, PWA/enlace con imagen y panel (migraciones 0020–0023)
- **WhatsApp eliminado de la app.** Se quitaron `NEXT_PUBLIC_COACH_WHATSAPP`, el botón de Mi plan, el FAB, los enlaces de la agenda, el bloqueo (FeatureGate) y `/pendiente`. Todo se habla dentro de la app: los botones abren **Mensajes** con el texto ya escrito (`/inicio/mensajes?m=…`). `workspaces.whatsapp` queda en la base sin uso.
- **Mensajes (0020):** NO es chat en vivo: bandeja cliente↔coach. Texto + foto (bucket privado `message-images`) + vídeo (Bunny) y, solo el coach, enlace de YouTube. El cliente en "Mensajes" (`/inicio/mensajes`) y el cliente sin plan en `/pendiente` (solo texto). Jeff: `/coach/mensajes` (bandeja con no leídos, buscador, cualquier cliente), badge en el menú, tarjeta en el Dashboard. "Visto", tiempo real (Supabase Realtime) y respaldo cada 60 s. Nadie escribe directo en la tabla: solo `send_message` (máx. 40/hora por cliente, 2000 caracteres, rutas de imagen y vídeos validados por cliente). Seguridad: suite `rls_messages.sql`.
- **Avisos push (0021):** campana en la barra superior (mensajes sin leer, reporte de hoy pendiente, sesión próxima; para Jeff: reportes por revisar, clientes sin plan). Botón para activar avisos en el teléfono (service worker `public/sw.js`, `web-push`, rutas `/api/push/*`). Sin claves VAPID la app funciona y el botón dice "aún no configurados". Solo quien envió un mensaje obtiene los dispositivos del destinatario, una vez (`push_targets`).
- **Recordatorios automáticos (0023, PROPUESTA de horarios):** reporte diario 8 p. m., "hoy toca entrenar" 7–12 h, sesión 1 h antes (cliente y coach). Los dispara un cron de Supabase que llama a `/api/cron/reminders` con una clave; la clave se valida en la base (`due_reminders`) y cada aviso se marca para no repetirse. **Hasta que se configure el cron (ver CONTEXT §6) no se envían.** Suite `rls_reminders.sql`.
- **Alarma de calendario:** cada sesión reservada tiene "🔔 Alarma": descarga un .ics con 2 alarmas (1 día y 1 hora antes) que funciona sin servidor.
- **Vídeo de la rutina (0022):** el de catálogo (YouTube, campo nuevo en la rutina) se copia al día del plan; Jeff puede subir uno **personalizado** por cliente/día (Bunny) que lo reemplaza. En Hoy aparece el teaser "Ver vídeo de la rutina · Grabado para ti" del diseño y el enlace "Ver rutina completa". Suite `rls_dayvideo.sql`.
- **Hoy:** los días de la semana tienen estado y color (hecho con ✓, hoy, perdido, por hacer, descanso) y leyenda; la tarjeta muestra duración y tipo.
- **Panel del coach:** buscador rápido de clientes (⌘K / Ctrl+K) en todas las pantallas, "Sesiones de hoy", aviso si no hay horarios para la próxima semana, mensajes sin leer. **Cliente:** página "Objetivos" (objetivo + peso desde la primera medida).
- **PWA / Android:** manifest completo (id, scope, iconos *maskable*, atajos a Mensajes/Plan/Agenda), botón "Instalar la app" (Android) o instrucciones (iPhone), insignia con el número de mensajes sin leer. **Enlace compartido:** imagen de marca `public/og.png` (1200×630) + metadatos Open Graph/Twitter (`NEXT_PUBLIC_SITE_URL` o la variable `URL` de Netlify definen el dominio).
- **Fluidez:** el hilo de mensajes se precarga, envío optimista del texto (aparece al instante), fotos reducidas en el teléfono, vídeos directos a Bunny por tramos, `sw.js` sin caché (nunca queda una versión vieja), middleware sin pasar por `sw.js`/iconos.
- Verificación: `tsc`, `lint`, `next build`, 13 suites de ataque en base limpia (TODO OK); revisión visual del hilo con datos de ejemplo en 390 px y 1280 px. **NO probado:** Supabase real (Realtime, Storage), Bunny real, push real en un teléfono, cron.
- Archivos: migraciones 0020–0023; tests `rls_messages|dayvideo|reminders.sql`; `lib/{messages,push,push-client,install,ics}.ts`; `components/{ActionsBar}.tsx`, `components/ui/{ThreadView,BunnyModal}.tsx`, `components/coach/{InboxView,QuickSearch}.tsx`, `components/portal/{MessagesClientView,PendingThread,ObjectiveView}.tsx`, `app/api/{push,cron}/*`, `app/messages.css`, `public/{sw.js,og.png,icon-maskable-*.png}`.
- **Cómo revertir:** `git revert` de los commits del bloque y, en Supabase (orden): `drop function if exists public.due_reminders; drop table if exists public.reminder_log, public.app_secrets;` · `drop function if exists public.set_day_video; alter table public.plan_days drop column if exists video_id, drop column if exists video_ref; alter table public.routine_templates drop column if exists video_ref;` (y volver a crear `save_routine` de 5 parámetros y `assign_day` de 0010) · `drop function if exists public.prune_push, public.push_targets, public.save_push_subscription; drop table if exists public.push_subscriptions;` · `drop function if exists public.mark_thread_read, public.unread_messages, public.list_threads, public.register_message_video, public.send_message; drop table if exists public.messages;` (borra los mensajes).

## 2026-10-25 · Nutrición por días, "Hoy" completo, objetivo y pantalla fija en móvil (migraciones 0018–0019)
- **Nutrición por días (0018):** calorías/proteína/carbos/grasas son fijos del plan; las comidas se arman por día (Lun–Dom) o "Todos los días" (se suman). El formulario del coach tiene pestañas por día y **"Copiar este día a…"**. El cliente elige el día en Mi plan → Nutrición. Revertir: `alter table public.nutrition_meals drop column weekday;` y volver a ejecutar las funciones `save_nutrition`/`assign_nutrition` de `0016_nutrition.sql`.
- **Hoy completo (0019):** se agregaron las tarjetas del diseño que faltaban: **vídeo de la semana**, **próxima sesión**, **objetivo actual**, **nutrición de hoy** y **progreso reciente** (peso/cintura con variación y mini gráfica). El coach escribe el objetivo en el Resumen de la ficha. Suite `rls_objective.sql`: ninguno. Revertir: `alter table public.clients drop column objective, drop column objective_at;`.
- **Arreglo oculto:** la tarjeta "Vídeo de la semana" nacía con `opacity:0` (animación del diseño que la app no usa) y no se veía ni en Material ni en Hoy; ahora es visible.
- **Móvil:** el zoom al entrar se debía a campos con letra menor a 16 px (iOS amplía al enfocar) y a que se permitía el pellizco. Ahora: viewport fijo (`maximum-scale=1`, `user-scalable=no`), bloqueo del pellizco en iOS (`NoZoom`), campos a 16 px en táctil, `touch-action: manipulation`, sin scroll horizontal y ventanas con scroll interno y altura máxima 92 dvh (las del portal no tenían). Comprobado en un móvil simulado de 375 px: sin desbordes y campos a 16 px. **Sin probar en un iPhone/Android reales.**
- Nota de accesibilidad: bloquear el zoom impide ampliar el texto con pellizco; se hizo a petición expresa. Revertir: quitar `maximumScale`/`userScalable` de `app/layout.tsx` y `NoZoom`.
- Archivos: `0018_nutrition_days.sql`, `0019_objective.sql`, `rls_objective.sql`, `components/portal/HoySide.tsx`, `NutritionForm|Tab|View`, `MiPlanView`, `HoyView`, `ClientFicha`, `app/layout.tsx`, `components/NoZoom.tsx`, `app/globals.css`, `portal.css`.

## 2026-10-25 · Reporte diario con vídeo, nutrición y onboarding (migraciones 0015–0017)
Un solo lote para gastar un solo despliegue (ver regla de créditos).
- **Reporte diario (0015):** el cliente (con `daily_report` en su plan) ve en "Hoy" una tarjeta para grabar un vídeo corto (cámara nativa del teléfono) y escribir un comentario; el vídeo sube directo del teléfono a Bunny Stream con subida firmada (TUS, reanudable) por `/api/video/upload-url`. Coach: nueva pantalla **Reportes diarios** (cola "sin revisar", reproductor protegido por token, "marcar visto") y aviso en el Dashboard. El vídeo se borra 24 h tras verlo (máx. 7 días); el borrado lo dispara el coach al abrir la pantalla (`/api/video/purge`). Endpoints: `config`, `upload-url`, `play`, `purge`; claves solo en servidor (`lib/bunny.ts`).
- **Seguridad:** el cliente no escribe `daily_reports` directo (solo `submit_report`); solo puede usar vídeos que el servidor registró a su nombre (`video_uploads`, máx. 5/día); no puede editar un reporte ya revisado; el coach solo ve los de su espacio. Suite `rls_reports.sql`: ninguno.
- **Sin Bunny configurado** la app funciona: el reporte se envía solo con comentario y `/api/video/config` responde `enabled:false`. **Nunca se ha probado una subida real.**
- **Nutrición (0016):** plantillas en Catálogo → Nutrición (comidas con texto libre + calorías/macros opcionales). En la ficha del cliente, pestaña Nutrición: asignar plantilla (se **clona**), editar solo para ese cliente, quitar. El cliente lo ve en Mi plan → Nutrición (diseño del mockup) y bloqueado si su plan no la incluye. Suite `rls_nutrition.sql`: ninguno. Además `plans.features` ahora se lee en el coach.
- **Onboarding (0017):** bienvenida de 3 pasos la primera vez (qué hay en la app, peso/cintura iniciales, ir a reservar la llamada); se puede saltar. Los textos son PROPUESTA y el personaje guía es un avatar provisional "J". Suite `rls_onboarding.sql`: ninguno.
- Verificación: tsc, lint, `next build` completo y 9 suites de ataque en base limpia (todo OK); endpoints probados con curl (sin sesión → 401). **No** probado: Supabase real, Bunny real, render en pantalla.
- Archivos: migraciones 0015–0017, tests `rls_reports|nutrition|onboarding.sql`, `lib/bunny.ts`, `lib/upload-video.ts`, `app/api/video/*`, `components/coach/{ReportsView,NutritionView,NutritionTab,NutritionForm}.tsx`, `components/portal/{ReportCard,Onboarding}.tsx`, `MiPlanView`, `HoyView`, `CoachNav`, `CatalogTop`, `lib/queries.ts`, dependencia `tus-js-client`.
- **Cómo revertir:** `git revert` del commit y, en Supabase, en este orden: `alter table public.clients drop column if exists onboarded_at; drop function if exists public.complete_onboarding;` · `drop function if exists public.assign_nutrition, public.save_nutrition; drop table if exists public.nutrition_meals, public.nutrition_plans;` · `drop function if exists public.mark_video_deleted, public.due_report_videos, public.review_report, public.submit_report, public.register_video_upload, public.can_report; drop table if exists public.daily_reports, public.video_uploads;` (borra reportes, nutrición y su historial).

## 2026-10-25 · Regla de despliegues por créditos de Netlify
- Netlify avisó "más del 75 % de créditos". Cada despliegue a producción cuesta 15 de 300 créditos/mes (tope duro: al agotarse el sitio se pausa). Se agregó la sección "Créditos de Netlify" al playbook: un push por función, `[skip ci]` en commits de solo documentación. Revertir: borrar esa sección.

## 2026-10-25 · Anuncios a todos y notas privadas (migración 0014)
- **Anuncios:** tarjeta "Anuncios" en el Dashboard del coach (nuevo, fijar arriba, fecha de vencimiento opcional, quitar). Los clientes activos con `announcements` en su plan los ven al inicio de "Hoy" (máx. 5, fijados primero). **No había mockup:** se usó el estilo de las tarjetas existentes; confirmar con Jeff.
- **Notas privadas:** pestaña de la ficha del cliente (copiada de `coach-clientes`): lista, guardar (Ctrl/⌘+Enter), borrar. El cliente no tiene ningún permiso sobre esa tabla.
- Seguridad: el cliente lee anuncios solo por `list_announcements()` (cuenta activa + plan + vigencia + su espacio); la nota debe apuntar a un cliente del mismo espacio. Suite `rls_notes.sql`: ninguno.
- **Reproductor de vídeo:** enlace "¿No carga? Ábrelo en YouTube" y aviso al coach: los vídeos con música con derechos (p. ej. UMPG) bloquean la inserción; no es un fallo de la app. Usar vídeos propios o que permitan insertar.
- Archivos: `0014_announcements_notes.sql`, `rls_notes.sql`, `run_local.sh`, `lib/queries.ts`, `components/coach/{NotesTab,AnnouncementsCard,ClientFicha,DashboardView}.tsx`, `components/portal/{HoyView,VideoModal}.tsx`.
- **Revertir:** `git revert` del commit y en Supabase: `drop function if exists public.list_announcements; drop table if exists public.announcements, public.client_notes;` (borra anuncios y notas).

## 2026-10-25 · Arreglo: logo invisible en el panel del coach y lista de clientes que no se refrescaba
- **Causa del logo:** al integrar Progreso se copió a `app/coach/coach.css` el CSS completo de un mockup del *portal* (sección `/* progreso */`), con reglas de barra lateral clara que pisaron la oscura del coach; el logo es blanco y quedó invisible. Se quitaron 33 reglas de estructura duplicadas de esa sección (`.sidebar`, `.side-*`, `.main`, `.topbar`, `.card`, `.fab-wa`…). Los estilos propios del tab de progreso del coach se conservan.
- **Prevención:** `design/port_css.py` ya no añade reglas de estructura (`.shell`, `.sidebar`, `.side-*`, `.main`, `.topbar`, `.card`…) si el destino ya las tiene. Regla nueva: nunca portar un mockup del portal al CSS del coach ni al revés sin revisar.
- **Clientes que "no aparecen":** la lista se cacheaba 30 s y no se refrescaba sola; ahora se actualiza cada 45 s y al volver a la pestaña. (El número junto a "Clientes" del menú lo calcula el servidor al cargar la página: se actualiza al recargar.)
- Revertir: `git revert` del commit (sin SQL).

## 2026-10-25 · Material educativo (migración 0013)
- **Coach `/coach/material`** (copiado de `coach-material.html`): rejilla de contenidos, búsqueda y filtros, crear/editar/eliminar, borrador o publicado, "quién lo ve" (todos los planes con material o solo plan completo), estrella de **vídeo de la semana** (solo uno; debe ser vídeo publicado de acceso básico) y "Visto por N".
- **Cliente `/inicio/material`** (copiado de `portal-material.html`): vídeo de la semana, búsqueda, filtros, etiqueta "Nuevo" (14 días sin abrir), lectura de artículos y reproductor de vídeo. Lo que el plan no incluye se ve **bloqueado con título** y lleva a WhatsApp; su contenido nunca sale de la base (se abre solo con `open_material`).
- Seguridad: el cliente NO tiene permisos sobre las tablas; lista y abre solo por funciones que validan cuenta activa, espacio y plan. Suite `rls_material.sql` (otro coach, lectura directa, contenido premium con plan Esencial, cliente pendiente, destacado, vistas): ninguno.
- **Pendiente:** documentos PDF (necesitan almacenamiento) y mostrar el vídeo de la semana en "Hoy".
- Archivos: `supabase/migrations/0013_material.sql`, `supabase/tests/rls_material.sql`, `run_local.sh`, `lib/queries.ts`, `components/coach/MaterialView.tsx`, `components/portal/MaterialClientView.tsx`, rutas `app/coach/material` y `app/inicio/material`, menús, CSS.
- **Cómo revertir:** `git revert` del commit y en Supabase: `drop function if exists public.set_featured_material, public.open_material, public.list_materials, public.material_unlocked; drop table if exists public.material_views, public.materials;` (borra el contenido publicado).
- Sin ver renderizado: probar en el navegador tras el deploy.

## 2026-10-24 · Documentación para continuidad y herramientas de agente
- Reescritos `docs/CONTEXT.md`, `docs/ARCHITECTURE.md` (v3) y `docs/PROJECT_STATE.md` como foto actual (el historial vive aquí). Nuevo `docs/AGENT_PLAYBOOK.md` (cómo trabajar, verificar, entregar, integrar parches, errores ya cometidos). `AGENTS.md` y READMEs actualizados.
- Nuevas herramientas: `supabase/tests/run_local.sh` (todas las migraciones + suites de ataque; devuelve error si algo falla) y `design/port_css.py` (portar CSS de un mockup sin duplicar). Ambas probadas: `TODO OK`; el portador no añade reglas al repetirse.
- Revertir: borrar esos archivos; no afecta a la app.

## 2026-10-24 · Revisión del parche "Auditoría 2": ajustes al integrarlo
- Se integró tal cual el parche de velocidad y flujo, con tres ajustes: (1) el "✓ de un toque" ya no guarda en silencio lo planeado: las casillas de repeticiones y peso **muestran** los valores planeados (editables) y se guarda lo que se ve, porque Jeff revisa datos "reales"; (2) borrar una foto elimina **primero el archivo** y luego la fila (antes podía quedar un archivo huérfano al que el coach aún tendría acceso); (3) asignar una rutina a varios días refresca la pantalla aunque falle uno (puede haber quedado guardado en otros).
- **Aviso para la fase de vídeo:** `next.config.mjs` fija `Permissions-Policy: microphone=()`; al construir el reporte diario con vídeo hay que cambiarlo a `microphone=(self)` o la grabación saldrá sin sonido.
- Sin SQL nuevo (siguen 0001–0012). Revertir: `git revert`.

## 2026-10-24 · Auditoría 2: velocidad y flujo (sin SQL nuevo)
- **Auditoría de seguridad:** las 11 migraciones + `rls.sql` + `rls_progress.sql` pasan en una base limpia ("ataques: ninguno"). No se encontraron agujeros nuevos.
- **Velocidad (portal):** el layout ya lee al cliente y su plan en el servidor y los pasa a la caché: "Hoy" ya no espera ese viaje y plan+registros cargan en paralelo. Se precargan Mi plan y Progreso mientras se ve Hoy. En el coach se precargan también revisiones recientes y clientes con plan (el dashboard abre sin esperas).
- **Velocidad (series):** guardar una serie ya no vuelve a leer 90 días de registros; es instantáneo (optimista) y solo se relee si falla.
- **Flujo del cliente:** Hoy abre solo el primer ejercicio pendiente; ✓ guarda lo planeado (reps y peso objetivo) sin escribir nada; Enter guarda; al terminar las series de un ejercicio pasa al siguiente; Espacio abre/cierra un ejercicio.
- **Flujo del coach:** asignar una rutina a VARIOS días a la vez (semana fija en un paso).
- **Progreso:** se puede eliminar una foto (el texto de consentimiento lo prometía y no había botón); puntos de la gráfica ya no se deforman; aviso si la imagen no se puede procesar.
- **Acceso:** el login lleva directo al panel según rol; si el registro exige confirmar correo, se avisa en vez de rebotar al login. El aviso (toast) ya no se corta antes de tiempo.
- **Seguridad web:** cabeceras (nosniff, no-iframe, HSTS, referrer, permisos: solo cámara propia) en `next.config.mjs`.
- Código: `lib/queries.ts` (fetchers exportados), `components/Providers.tsx`, `app/inicio/layout.tsx`, `HoyView`, `TrainingTab`, `ProgressPanels`, `app/login/*`, `next.config.mjs`.
- Revertir: `git revert` del commit (no hay SQL).
- Sin verificar en pantalla: el entorno de pruebas no puede compilar con las fuentes de Google; se comprobó con `tsc` y lint. Probar en el celular tras el deploy.

## 2026-10-24 · 4348e14 · Progreso: mediciones y fotos privadas
- Portal `/inicio/progreso` copiado de `design/mockups/portal-progreso.html`: resumen por métrica con variación, gráfica con líneas activables, historial (Tú / Coach), comparador Antes/Después y galería. Registro de medición en modal (peso, cintura, caderas, pecho, brazo, pierna; si ya registraste hoy, se actualiza).
- Fotos: se comprimen en el teléfono (máx. 1600 px), se guardan en un bucket **privado** y se muestran con enlaces que vencen. Antes de la primera foto el cliente acepta un consentimiento (`clients.image_consent_at`).
- La ficha del coach tiene la pestaña **Progreso** (solo lectura) con lo mismo.
- SQL: `0008_progress.sql` (`measurements`, `progress_photos`, `client_has_consent`, `give_image_consent`, bucket `progress-photos` y sus políticas; el plan debe incluir `progress`).
- Código: `components/portal/ProgressPanels.tsx`, `ProgressView.tsx`, `lib/image.ts`, `lib/queries.ts`, `PortalNav.tsx`, `ClientFicha.tsx`.
- Revertir código: `git revert`. Revertir SQL: `drop table progress_photos, measurements; drop function give_image_consent, client_has_consent;` y borrar las políticas `fotos: …` de `storage.objects` y el bucket (esto borra mediciones y fotos).
## 2026-10-24 · Agenda: Jeff publica horarios, el cliente reserva
- Coach `/coach/agenda` (mockup `coach-agenda`): semana LUN–DOM, huecos libres y sesiones confirmadas, publicar disponibilidad en bloques (desde–hasta con duración de 30/45/60 min), agendar a un cliente, cancelar una sesión y quitar un hueco. Cliente `/inicio/agenda` (mockup `portal-agenda`): calendario semanal, filtro por tipo, "Tu selección", "Tus próximas sesiones", cancelar y aviso opcional por WhatsApp.
- **Reglas en la base de datos (no en la pantalla):** un hueco confirmado solo admite una reserva aunque dos personas pulsen a la vez; el cliente no ve datos de otros clientes; sin escritura directa del cliente (solo funciones).
- **Reglas PROPUESTAS, no definidas por Jeff (confirmar con él):** una reserva futura por cliente a la vez; el cliente cancela hasta 24 h antes (el coach siempre); tipos de hueco "Llamada inicial" y "Seguimiento"; sesiones individuales (sin clases grupales ni presenciales). Cambiarlas = editar las funciones `book_slot` y `cancel_booking`.
- SQL: `0012_agenda.sql` (`availability_slots`, `bookings`, `list_open_slots`, `book_slot`, `coach_book_slot`, `cancel_booking`, trigger que impide cancelar un hueco con reserva). Pruebas: `supabase/tests/rls_agenda.sql` (resultado: ninguno). Omitido por no tener datos: "agenda del día" en el dashboard y recordatorios.
- Zona horaria: se asume un solo huso (el de Jeff y sus clientes); los horarios se guardan en UTC y se muestran en la hora del dispositivo.
- Revertir código: `git revert`. Revertir SQL: `drop table bookings, availability_slots cascade; drop function list_open_slots, book_slot, coach_book_slot, cancel_booking, slot_cancel_guard;` (borra reservas).

## 2026-10-24 · Integración del parche "Mi plan" + endurecimiento de Progreso (0011)
- Se integró el parche de otra sesión de Claude (Mi plan, endurecimiento RLS, metadatos de día, logo). Choque de numeración: su `0008`/`0009` pasaron a **`0009_harden_client_writes`** y **`0010_plan_day_meta`** porque `0008` ya era Progreso.
- Se **ejecutaron** las pruebas de ataque en un Postgres 16 desechable con las 11 migraciones desde cero: `RESULTADO ATAQUES: ninguno`. Sin la 0009 la prueba falla (detecta el hueco).
- Hallazgo propio: las políticas de mi `0008_progress` tenían los mismos huecos (medición o foto con el espacio de OTRO coach, moverla de espacio, foto apuntando a la carpeta de otro cliente). Corregido en **`0011_harden_progress.sql`**; nuevas pruebas `supabase/tests/rls_progress.sql`; `stub_auth.sql` ahora simula `storage`.
- Orden de SQL en Supabase: `0009`, `0010`, `0011`. **El código nuevo pide columnas de 0010: ejecutar el SQL antes de probar.**
- Revertir: `git revert` de los commits; SQL 0011: restaurar las políticas `me_client_ins`, `me_client_upd`, `ph_client_ins` de 0008 (reabre los huecos).

## 2026-10-24 · Mi plan (portal), endurecimiento de seguridad y logo
- **Seguridad (0009):** las políticas de escritura del cliente permitían, vía API pública, registrar series en planes/clientes ajenos o sin plan de entrenamiento. Ahora exigen `client_id = my_client_id()`, feature `training`, mismo workspace y pertenencia de `plan_day`/`workout_log`/`plan_item`. Pruebas de ataque reproducibles en `supabase/tests/` (resultado esperado: "ninguno").
- **Mi plan** en `/inicio/plan` según `design/mockups/portal-mi-plan.html`: semana LUN–DOM, detalle del día, pestaña Nutrición bloqueable, estados carga/vacío/error. Omitido por no tener datos aún: vídeo de rutina, próxima revisión, nivel, nota del coach.
- **0010:** `plan_days.est_minutes` y `category` (copiados de la plantilla al asignar, porque el cliente no lee plantillas). En Hoy: botón "Ver técnica" con vídeo de YouTube si el ejercicio lo tiene.
- Logo: texto invisible en el menú del coach corregido (`/brand/logo.svg`; portal usa `logo-claro.svg`). Fix de desbordamiento horizontal en móvil.
- Código: `components/portal/{MiPlanView,VideoModal}.tsx`, `lib/week.ts`, `app/inicio/plan/`, `lib/queries.ts`, `portal.css`.
- Ejecutar en Supabase SQL Editor, en orden: `0009` y luego `0010` (la numeración original del parche era 0008/0009; se renumeró porque 0008 ya era Progreso).
- Revertir código: `git revert`. Revertir SQL 0010: `alter table plan_days drop column est_minutes, drop column category;` y restaurar `assign_day` de 0005. 0009: restaurar las políticas `wl_client_*`/`sl_client_*` de 0006 (solo si es imprescindible: reabre la brecha).

## 2026-10-24 · 29d6daa · Dashboard con cola de revisión y ciclo de revisión
- `/coach` ahora es el dashboard del mockup: 4 indicadores (clientes activos, entrenaron hoy, revisiones pendientes, clientes por revisar), lista "Clientes por revisar" ordenada por urgencia y "Actividad" reciente. Solo datos reales.
- Reglas de atención (`lib/attention.ts`, sin IA): entrenamientos sin revisar (urgente si esfuerzo ≥ 9), cliente activo sin plan de entrenamiento, y días sin entrenar (≥ 3; urgente desde 5).
- En la ficha del cliente (Resumen): "Entrenamientos recientes" con series, peso, esfuerzo y comentario del cliente; Jeff escribe su comentario y marca revisado. El cliente lo ve en Hoy ("Comentario de tu coach").
- SQL: `0007_review_loop.sql` (columnas `coach_seen_at`, `coach_comment`; trigger que impide que un cliente las escriba; función `review_workout`; política de UPDATE del coach).
- Revertir código: `git revert` del commit. Revertir SQL: `drop function review_workout; drop trigger wl_protect on workout_logs; drop function protect_coach_columns; drop policy wl_coach_upd on workout_logs; alter table workout_logs drop column coach_seen_at, drop column coach_comment;`.

## 2026-10-24 · 0a4bcdd · Portal del cliente: pantalla "Hoy" con registro de series
- Portal `/inicio` copiado de `design/mockups/portal-hoy.html` (menú lateral, barra inferior móvil, saludo, racha y semana, tarjeta "Rutina de hoy"). El cliente despliega un ejercicio, registra repeticiones y peso real por serie, y al final marca esfuerzo 1–10 y un comentario opcional para Jeff.
- Solo se muestran tarjetas con datos reales (sesión, objetivo, nutrición y progreso se agregarán cuando existan sus datos). Sin plan "training": bloqueo borroso. Sin rutina asignada: estado vacío.
- SQL: `0006_workout_logs.sql` (`workout_logs`, `set_logs`, `client_has_feature`, `log_set`, `finish_workout`, lectura de `exercises` para el cliente con plan; RLS: el plan se valida en la base).
- Código: `app/inicio/*`, `components/portal/*`, `lib/queries.ts` (useMe, useLogs, useLogSet, useFinish), `components/Providers.tsx` (perfil y precarga opcional).
- Revertir código: `git revert` del commit. Revertir SQL: `drop function finish_workout, log_set, client_has_feature; drop table set_logs, workout_logs; drop policy ex_client_read on public.exercises;` (borra los registros de entrenamiento).

## 2026-10-23 · 44bf02b · Entrenamiento por días en la ficha del cliente
- Pestaña **Entrenamiento** según mockup: plan activo, historial, días LUN–DOM, asignar rutina a un día (clona la plantilla para poder cambiar pesos solo en ese cliente), peso objetivo por ejercicio.
- SQL: `0005_training_plans.sql` (tablas `training_plans`, `plan_days`, `plan_items`; funciones `my_client_id`, `create_training_plan`, `assign_day`; RLS coach y lectura del cliente).
- Código: `components/coach/TrainingTab.tsx`, `lib/queries.ts`, `components/coach/ClientFicha.tsx`.
- Revertir código: `git revert` del commit. Revertir SQL: `drop function assign_day, create_training_plan, my_client_id; drop table plan_items, plan_days, training_plans;` (borra los planes asignados).

## 2026-10-23 · Contexto para asistentes y mockups en el repo
- Se agregan `docs/CONTEXT.md`, `AGENTS.md`, `design/` (10 mockups + guía de portado) y este CHANGELOG, para poder continuar con otro chat o asistente.
- Revertir: borrar esos archivos; no afecta a la app.

## 2026-10-23 · ab3d2c0 · Rework de rendimiento y flujo
- Qué: datos leídos/escritos desde el navegador con RLS, caché TanStack Query con precarga, modales del diseño (agenda), ficha con pestañas, `save_routine` atómico.
- Por qué: la app se sentía lenta (varios viajes en cadena al servidor por pantalla; sin estados de carga).
- SQL: `0004_save_routine_rpc.sql`. Código: `lib/queries.ts`, `components/Providers.tsx`, `components/coach/*`, páginas delgadas.
- Revertir: `git revert ab3d2c0`; SQL: `drop function public.save_routine(uuid,text,text,int,jsonb);`.

## 2026-10-23 · 2230303 · Rendimiento v1
- `getClaims()` en lugar de `getUser()`, sesión cacheada por petición, filtros en el cliente, esqueletos de carga. Revertir: `git revert 2230303`.

## 2026-10-23 · 0316371 · Fase 2A: panel del coach
- Shell del coach con CSS de los mockups, Clientes, Ejercicios, Rutinas; arreglo del texto borroso en `/pendiente`; página `/sin-perfil`.
- SQL: `0003_catalog.sql` (`exercises`, `routine_templates`, `template_items`, trigger `drop_client_on_coach`, limpieza de la ficha de cliente del coach).
- Revertir SQL: `drop trigger profile_became_coach on profiles; drop function drop_client_on_coach; drop table template_items, routine_templates, exercises;`.

## 2026-10-23 · bcc0dfb / 66eb697 · `.env.example`
- Se limpiaron los valores reales del archivo de plantilla (hechos por Cristian en GitHub). Los valores siguen en el historial de git; la clave anon es pública por diseño, pero el número de WhatsApp quedó expuesto en un repo público.

## 2026-10-21 · 723bb5e / f59ba64 · Fundación (Fases 1A y 1B)
- Next.js 14, marca, login/registro, rutas protegidas, estado "pendiente", PWA, FeatureGate (bloqueo borroso), panel de clientes inicial.
- SQL: `0001_foundation.sql` (`workspaces`, `profiles`, `plans`, `clients`, trigger `handle_new_user`, RLS), `0002_default_plans.sql` (planes Esencial y Completo, propuesta).

## 2026-10-21 · Documentos de producto (fuera del repo)
- Product Blueprint v1 y propuesta comercial para Jefferson González (versiones publicadas como documentos de Claude).
