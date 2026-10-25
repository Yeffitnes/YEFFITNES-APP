# PROJECT_STATE — YEFFITNES TRAINING
Actualizado: 21-oct-2026

## Qué funciona (Fase 1A, sin probar contra Supabase real)
- Next.js 14 + TypeScript + Tailwind con tokens de marca (rojo/oro/negro) y fuentes de la propuesta.
- Login/registro, cierre de sesión, rutas protegidas por middleware, redirección por rol y estado.
- Cliente nuevo queda PENDIENTE y ve la pantalla "Tu coach activará tu plan".
- PWA: manifest e iconos.
- Esquema 0001: workspaces, profiles, plans, clients con RLS.

## Añadido en 1B
- FeatureGate (bloqueo borroso + WhatsApp), planes iniciales (0002), panel del coach con lista de clientes y asignación de plan.

## Qué falta
- Landing pública (P2). Pruebas reales contra Supabase.
- Fase 2 resto: ejercicios, plantillas de rutina, cola de revisión.

## Decisiones
- Multi-coach desde la base: todo dato lleva workspace_id.
- El rol nunca se toma del navegador; el coach se asigna manualmente por SQL.
- Solo se crean las tablas que la fase necesita.

## Siguiente paso
Crear proyecto Supabase, ejecutar la migración, configurar .env y probar el flujo.

## Fase 2A (21-oct-2026)
- Shell del coach y pantallas Clientes, Ejercicios y Rutinas copiadas del diseño (coach.css viene de los mockups).
- Migración 0003: exercises, routine_templates, template_items + RLS, y trigger que quita la ficha de cliente a un coach.
- Pendiente de la Fase 2: asignar rutinas a clientes (clonado por cliente), dashboard con cola de revisión.

## Rework de rendimiento (23-oct-2026)
- Diagnóstico: sesión y perfil repetidos por pantalla, filtros por servidor, sin cargas visibles. Supabase en us-east-1; Netlify en Ohio (cercanos).
- Cambio: lectura/escritura desde el navegador con RLS, caché (TanStack Query), precarga, modales del diseño, 0004 save_routine.
- Pendiente de verificar en producción: tiempos reales tras redeploy.

## Estado al 23-oct-2026 (cierre de sesión 1)
- Funciona (a validar tras redeploy): login/registro, estado pendiente, bloqueo por plan, panel del coach (clientes, ficha con Resumen y Entrenamiento, ejercicios, rutinas).
- Migraciones: 0001–0005. Ejecutar en orden en Supabase.
- Siguiente: portal del cliente "Hoy" (rutina del día + registro de series + esfuerzo) → reporte diario con vídeo → dashboard con cola de revisión (necesita esos datos) → nutrición → progreso → agenda → material.
- Pendientes de seguridad: revocar token de GitHub, repo privado, Supabase Pro y confirmación de correo antes de lanzar.

## Actualización 24-oct-2026
- Portal del cliente "Hoy" hecho (migración 0006). Migraciones vigentes: 0001–0006.
- Siguiente: reporte diario con vídeo (Bunny: firma de subida en servidor + borrado automático) → dashboard con cola de revisión (ya hay datos de series y esfuerzo) → nutrición → progreso → agenda → material → onboarding.
- Por validar tras redeploy: flujo completo cliente (asignar plan y rutina desde el coach, registrar series, terminar entrenamiento, ver el resultado).

## Actualización 24-oct-2026 (2)
- Dashboard + ciclo de revisión hechos (migración 0007). Migraciones vigentes: 0001–0007.
- Siguiente: reporte diario con vídeo (Bunny) → nutrición → progreso → agenda → material → onboarding → confirmación de correo y Supabase Pro antes de lanzar.

## Actualización 24-oct-2026 (3)
- Progreso hecho (migración 0008): mediciones, gráfica y fotos privadas con consentimiento. Migraciones vigentes: 0001–0008.
- Siguiente: reporte diario con vídeo (necesita cuenta Bunny) → nutrición con plantillas → agenda (coach publica horarios, cliente reserva) → material educativo (YouTube) → onboarding (tour, medidas iniciales, agendar llamada) → confirmación de correo, Supabase Pro y repo privado antes de lanzar.
- Verificar en producción: que el bucket `progress-photos` se creó y que subir una foto funciona desde un celular real (cámara).
- Mi plan hecho (`/inicio/plan`), endurecimiento RLS (0009) y metadatos de día (0010). Migraciones vigentes: 0001–0011 (0011 endurece Progreso). Pruebas RLS en `supabase/tests/`. Siguiente: reporte diario/vídeo, nutrición, progreso, agenda, material, onboarding.
