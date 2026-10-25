# CHANGELOG
Formato: fecha · título · qué y por qué · archivos/SQL · **cómo revertir**. Lo más reciente arriba.

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
