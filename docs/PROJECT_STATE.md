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
