# ARCHITECTURE — YEFFITNES TRAINING (v2, 23-oct-2026)

## Principio: pocos viajes, datos cerca del usuario
Medido por diagnóstico: la v1 repetía verificación de sesión y consultas en cadena en el servidor (Netlify) por cada pantalla.

### Flujo actual
1. **Entrada (servidor, una vez):** `middleware` y `app/coach/layout.tsx` validan sesión con `getClaims()` (verificación local del token) y el rol. `requireUser()` está cacheado por petición.
2. **Panel (navegador):** los datos se leen y se escriben **directo a Supabase desde el navegador** con `lib/supabase/browser.ts`. La seguridad no depende del servidor de la app: la imponen las políticas **RLS** de la base.
3. **Caché:** TanStack Query. Al entrar al panel se precargan clientes, planes, ejercicios y rutinas; cada pantalla abre al instante. Los cambios usan actualización optimista cuando aplica (asignar plan, archivar).
4. **Escrituras compuestas:** una función de base de datos (`save_routine`, SECURITY INVOKER) guarda una rutina completa en un solo viaje y de forma atómica.
5. **Páginas servidor:** solo finas (`page.tsx` renderiza una vista cliente). La lógica vive en `components/coach/*` y `lib/queries.ts`.

### Reglas para lo que viene
- Lectura y escritura simples: navegador + RLS + TanStack Query.
- Lo que necesita secreto o proceso (firmar subidas de vídeo a Bunny, borrado automático, avisos): función de servidor o tarea programada en Supabase. Nunca la clave `service_role` en el navegador.
- Consultas de varias tablas para pantallas (p. ej. cola de revisión): una vista o función SQL, un solo viaje.
- Toda tabla nueva: `workspace_id` + RLS en la misma migración.

### Mapa de pantallas del coach (según mockups)
Dashboard (cola de revisión) · Clientes → Ficha (Resumen, Entrenamiento, Nutrición, Progreso, Notas) · Catálogo (Ejercicios, Rutinas) · Agenda · Material educativo.
