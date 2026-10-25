# ARCHITECTURE — YEFFITNES TRAINING (v3, 24-oct-2026)

## Principios
Simple por dentro, premium por fuera. Pocos viajes, datos cerca del usuario. La seguridad vive en la base de datos (RLS), no en la pantalla. Multi-coach desde la base (`workspace_id` en todo).

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind (+ CSS de los mockups por zona) · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · Netlify · GitHub. PWA (manifest + iconos; sin modo sin conexión).

## Flujo de datos
1. **Servidor (una vez por visita):** `middleware.ts` y los `layout.tsx` de `/coach` y `/inicio` validan la sesión con `getClaims()` (token verificado localmente) y el rol; `lib/session.ts` cachea por petición. El layout del portal lee al cliente y su plan y los entrega a la caché (`Providers me=`).
2. **Navegador:** `lib/supabase/browser.ts` lee y escribe directo en Supabase. `lib/queries.ts` contiene **todos** los fetchers, hooks y mutaciones. `components/Providers.tsx` crea la caché, el aviso (toast), el contexto (espacio, perfil) y precarga datos.
3. **Funciones SQL** (`SECURITY INVOKER` salvo las de agenda/consentimiento): operaciones compuestas en un solo viaje y atómicas (`save_routine`, `create_training_plan`, `assign_day`, `log_set`, `finish_workout`, `review_workout`) o con reglas de negocio (`book_slot`, `cancel_booking`, `coach_book_slot`, `list_open_slots`).
4. **Páginas:** `page.tsx` delgadas que montan una vista cliente (`components/coach/*`, `components/portal/*`).
5. **Lo que necesita secretos o procesos** (firmar subidas de vídeo a Bunny, borrado automático, avisos): servidor/Edge/tarea programada. Aún no existe.

## Mapa de carpetas
`app/` rutas (coach, inicio, login, pendiente, sin-perfil) · `components/` (`coach`, `portal`, `ui`, `Providers`, `FeatureGate`) · `lib/` (`queries`, `session`, `attention` reglas del dashboard, `dates`, `week`, `format`, `features`, `image`, `supabase/`) · `supabase/migrations` (0001–0012) · `supabase/tests` (pruebas de ataque + `run_local.sh`) · `design/` (mockups + `port_css.py`) · `docs/` · `public/brand` (logos) · `CHANGELOG.md`, `AGENTS.md`.

## Modelo de datos (resumen; detalle en las migraciones)
- **Espacio y usuarios:** `workspaces`, `profiles` (rol coach|client), `clients` (estado pending|active|paused, plan, consentimiento de imagen), `plans` (funciones habilitadas).
- **Entrenamiento:** `exercises`, `routine_templates`, `template_items` → (al asignar se COPIA) `training_plans` → `plan_days` (lun–dom) → `plan_items` (con peso objetivo).
- **Ejecución y revisión:** `workout_logs` (esfuerzo, nota, comentario del coach) → `set_logs` (reps y peso reales por serie).
- **Progreso:** `measurements`, `progress_photos` + bucket privado `progress-photos`.
- **Agenda:** `availability_slots`, `bookings` (índice único: una reserva confirmada por hueco).
- Funciones de plan hoy aplicadas en la base: `training`, `progress`. Definidas en los planes pero **sin pantalla aún**: `daily_report`, `announcements`, `nutrition`, `education_basic`, `education_full`.

## Reglas para agregar cosas
Ver `docs/AGENT_PLAYBOOK.md` §4 (pantalla nueva) y `docs/CONTEXT.md` §6 (tabla nueva). Toda tabla con datos del cliente: RLS con todas las referencias validadas + caso en `supabase/tests/`.

## Decisiones técnicas registradas
- Next.js desde el día 1 (no migrar después). Netlify gratis (permite uso comercial; Vercel Hobby no). Supabase gratis para desarrollar, **Pro antes de clientes reales** (se pausa por inactividad y sin copias).
- Rutinas se COPIAN al asignar (editar a un cliente no toca la plantilla).
- Mensajería sin chat: comentario del coach sobre el entrenamiento + anuncios (pendiente).
- Vídeos: YouTube embebido (público) y Bunny Stream (privado, con borrado automático). Pendiente de construir.
