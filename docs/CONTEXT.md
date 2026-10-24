# CONTEXTO DEL PROYECTO — leer ANTES de tocar nada
Última actualización: 23-oct-2026. Si cambias algo importante, actualiza este archivo y `CHANGELOG.md`.

## 1. Qué es
App web instalable (PWA) para **YEFFITNES TRAINING**, coaching fitness casi 100 % online del coach **Jefferson González ("Jeff")**. Construye y lidera el producto **Cristian Santiago Gómez Romero** (freelance, no es desarrollador senior: explica decisiones y da pasos concretos, sin asumir conocimiento de terminal). Idioma: español.
Inicio 21-oct-2026. Plazo: **2 meses, ampliable a 3** (P0 y P1 primero; P2 puede usar el mes 3).
Dos entornos: **panel del coach** (`/coach`, escritorio primero) y **portal del cliente** (`/inicio`, móvil primero).

## 2. Reglas de oro
1. **Fidelidad al diseño.** `design/mockups/` es la fuente visual. Copiar, no reinterpretar. Ver `design/README.md`.
2. **No inventar** reglas, precios, planes, horarios ni datos del coach. Lo no decidido se marca `NO DEFINIDO`. Distinguir REQUISITO / PROPUESTA / INFERENCIA.
3. **Prioridades:** P0 crítico > P1 importante > P2 deseable > P3 futuro. P2/P3 nunca bloquean P0. Proteger el alcance.
4. **Simple por dentro, premium por fuera.** Nada de infraestructura que no haga falta.
5. **Definición de hecho:** funciona, es seguro (RLS), tiene estados loading/vacío/error, funciona en móvil y escritorio, no rompe otras áreas, documentado en CHANGELOG.
6. **No ser complaciente:** si una idea es mala o costosa, decirlo.

## 3. Requisitos del coach (nivel 1, dichos por Cristian/Jeff)
- Sin pagos en la app: la venta se cierra por WhatsApp desde una landing; el cliente instala la PWA y se registra solo. Sin plan = **todo bloqueado y borroso** (con botón a WhatsApp). Jeff activa al cliente y le asigna el plan manualmente; el plan decide qué ve.
- Onboarding interactivo con personaje guía (P2): tour, peso, medidas, fotos con consentimiento y agendar llamada de sábado o domingo con Jeff.
- Jeff arma nutrición y rutina **dentro de la app** (sin PDFs), desde plantillas que clona y ajusta por cliente.
- Rutina por días (lunes, martes…), cada día con enfoque, ejercicios, vídeo e imágenes, peso e intensidad.
- El cliente registra repeticiones, **peso real** (incluye aproximaciones; opcional pero algunas partes pueden ser obligatorias) y **esfuerzo 1–10**.
- **Reporte diario obligatorio:** vídeo muy corto de verificación ("aquí estoy cumpliendo") + comentario. Vídeos del cliente se borran solos (propuesta: 24 h tras revisados, tope 7 días).
- **Sin chat.** Jeff comenta a un cliente o publica anuncios a todos (visibles en el inicio). El cliente escribe una vez por noche, ligado a su reporte. Nada de "visto".
- Jeff solo revisa **por las noches entre semana**; fines de semana llamadas y sesiones. El panel debe ser una **cola de revisión priorizada**.
- Agenda: Jeff publica horarios y el cliente reserva manualmente. Sin sesiones presenciales por ahora.
- Vídeos: material educativo de Jeff en **YouTube embebido**; privados en **Bunny Stream** (subidos desde la app; costo aceptado por Jeff).
- Fotos de progreso del cliente y de Jeff (privadas, comprimidas).
- Base para **multi-coach** (cada coach con su entorno, logo y colores). El cobro a coaches, dominios propios y similares son P3.
- Planes: propuesta inicial Esencial / Completo (precios y contenido **NO DEFINIDO**, los decide Jeff).

## 4. Stack e infraestructura
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · Netlify (hosting) · GitHub `Yeffitnes/YEFFITNES-APP` (rama `main` → despliegue automático).
- Supabase: proyecto en **us-east-1**. Plan gratis para desarrollar; **pasar a Pro (~US$25/mes) antes de clientes reales** (el gratis se pausa tras 7 días sin actividad y no tiene copias de seguridad).
- Netlify: plan gratis permite uso comercial (Vercel Hobby no). Vigilar créditos.
- Bunny Stream: no es gratis (mínimo ~US$1/mes). Aún no integrado.
- Costos estimados al lanzar: ~US$26–30/mes + dominio. Son estimaciones de oct-2026.
- Variables de entorno (Netlify y `.env.local`, nunca en el repo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_COACH_WHATSAPP` (solo dígitos con código de país, sin `+`).

## 5. Arquitectura (lo esencial; detalle en `ARCHITECTURE.md`)
- **Lectura y escritura del panel desde el navegador a Supabase**, protegidas por **RLS**; caché con TanStack Query (`lib/queries.ts`), precarga en `components/Providers.tsx`.
- La sesión se valida en servidor una vez (`middleware.ts`, `app/coach/layout.tsx`, `lib/session.ts` con `getClaims()`).
- Operaciones compuestas = **función SQL** (`SECURITY INVOKER`, un viaje, atómica), p. ej. `save_routine`, `create_training_plan`, `assign_day`.
- Lo que necesite secretos o procesos (firmar subidas Bunny, borrado automático, avisos) va en servidor/edge/tareas programadas. **Nunca** la clave `service_role` en el navegador ni en variables `NEXT_PUBLIC_`.
- Multi-coach: toda tabla de negocio lleva `workspace_id`.

## 6. Checklist para agregar una tabla o pantalla
1. Migración nueva numerada en `supabase/migrations/` (nunca editar una ya ejecutada). `workspace_id` + RLS en la misma migración. Si el cliente la lee, política explícita por cliente.
2. Consultas en `lib/queries.ts` con tipos y claves de caché; mutaciones con aviso de éxito/error (optimistas si es seguro).
3. Pantalla = `page.tsx` delgada + vista cliente en `components/<zona>/`. Copiar el mockup (ver `design/README.md`).
4. Estados obligatorios: cargando (esqueleto `.sk`), vacío (explica qué hacer), error (humano, con reintentar), éxito.
5. Acciones destructivas con confirmación. Botones con estado "Guardando…".
6. `npx tsc --noEmit` y `npx next lint` sin errores. Probar con un cliente y con el coach.
7. Actualizar `CHANGELOG.md`, `PROJECT_STATE.md` y, si cambia una regla, este archivo.

## 7. Seguridad
- RLS en todas las tablas. Cliente: solo lo suyo. Coach: solo su espacio. Nadie cambia su propio rol (no hay política de UPDATE en `profiles`); el rol coach se asigna por SQL.
- El rol y el alta salen del trigger `handle_new_user` (cliente pendiente). **El espacio de trabajo debe existir antes de que alguien se registre**, o el trigger no crea perfil (causó un bloqueo el 23-oct).
- Archivos privados (fotos, vídeos): bucket privado + URL firmada con vencimiento. Consentimiento antes de fotos corporales.
- Secretos: jamás en el repo ni en el chat. Los tokens de GitHub se crean por sesión y se **revocan** al terminar (uno se pegó en el chat el 23-oct: revocar).
- El repo es público hoy: pasarlo a **privado**.
- La confirmación de correo está **desactivada** para pruebas; antes de lanzar, activarla y construir la página que recibe el enlace.

## 8. Diseño y copy
Tokens (`tailwind.config.ts`, `coach.css`): neon `#F7254B`, rose `#F2406B`, oro `#CDB170`/`#8D6526`, ink `#0A0910`, surface `#F5F6FA`. Fuentes: Instrument Sans (títulos), Manrope (texto), IBM Plex Mono (etiquetas). Modales: clases `modal-*` del mockup de agenda. Errores humanos en español, sin códigos. Accesibilidad: labels, foco, contraste, `aria-label` en iconos.

## 9. Puesta en marcha desde cero
1. Supabase: crear proyecto; Auth → desactivar "Confirm email" (solo pruebas).
2. SQL Editor: ejecutar en orden `supabase/migrations/0001…` (todas las numeradas, hoy 0001–0006). Luego los DATOS INICIALES de 0001 (espacio de trabajo con el WhatsApp) y `0002` (planes) **después** de crear el espacio.
3. Netlify: importar el repo, cargar las 3 variables, desplegar.
4. Registrar el correo de Jeff y: `update public.profiles set role='coach' where id=(select id from auth.users where email='…');`
5. Probar con un segundo correo (cliente) en ventana de incógnito.

## 10. Lecciones aprendidas
- Hacer consultas de sesión/perfil en cadena en el servidor por pantalla la volvió lenta → ahora cacheado y datos desde el navegador.
- Copiar el CSS del mockup no basta: hay que copiar también **el flujo** (filtros instantáneos, modales, pestañas).
- Un `blur` accidental en una tarjeta volvió borroso un mensaje entero: el desenfoque es solo para contenido bloqueado.
- Los mockups no traen diseñados los formularios de crear ejercicio/rutina; se resolvieron con el modal de agenda.

## 11. Pendientes y riesgos vivos
Ver `PROJECT_STATE.md`. Resumen: revocar token · repo privado · Supabase Pro antes de lanzar · confirmación de correo · definir planes y precios con Jeff · plantillas de Jeff · plazo de borrado de vídeos · propiedad intelectual de lo heredado de DaniFit (confirmar que se puede reutilizar).

## 12. Cómo se trabaja
Cristian pide por chat; el asistente entrega cambios al repo (por token de sesión o por archivos), Netlify despliega solo desde `main`. Cada cambio se documenta en `CHANGELOG.md` con: qué cambió, por qué, archivos/SQL tocados y **cómo revertir**.
