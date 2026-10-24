# CHANGELOG
Formato: fecha · título · qué y por qué · archivos/SQL · **cómo revertir**. Lo más reciente arriba.

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
