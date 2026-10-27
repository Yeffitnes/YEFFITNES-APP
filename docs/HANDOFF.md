# HANDOFF: léelo primero, antes de tocar nada

Estado al **26-oct-2026, noche**. Escrito para que un asistente nuevo (o una persona) siga trabajando sin cometer errores. Complementa a `AGENTS.md`, `docs/CONTEXT.md`, `docs/AGENT_PLAYBOOK.md` y `docs/PASO_A_PRODUCCION.md`. El detalle de cada cambio, con cómo revertirlo, está en `CHANGELOG.md` (las primeras entradas son las más recientes). Aquí no hay claves; no pegues ninguna en el repo ni en el chat.

## 1. Con quién trabajas
- **Cristian Santiago Gómez Romero**: líder de producto y desarrollo freelance. **No usa la terminal.** Escribe en **español, dictando por voz**: puede haber frases cortadas o palabras mal transcritas; interpreta la intención y, si algo es ambiguo y barato de rehacer, elige lo más razonable y dilo.
- **Cliente final: Jefferson González ("Jeff")**, coach. Marca **YEFFITNES TRAINING**. Cristian quiere que Jeff quede feliz y trabaje rápido; todo se mide contra eso.
- Repositorio: `Yeffitnes/YEFFITNES-APP`. Ruta de trabajo del asistente: `/home/claude/yeffitnes`.
- Responde corto, claro y sin tecnicismos. Di **qué cambió, qué verificaste y qué NO pudiste verificar**. Cristian prueba en su iPhone y en escritorio con Safari y te dice cómo se ve: confía en eso para lo visual.

## 1b. Dónde está el "plano" del proyecto (blueprint, diseño y contexto)
- **Diseño visual:** `design/mockups/*.html` es la fuente visual (hay mockups del dashboard, clientes, catálogo, agenda y material del coach, y de Hoy, Mi plan, Progreso, Agenda y Material del cliente) y `design/README.md` explica cómo usarlos. Regla del proyecto: copiar estructura, clases, textos y flujo; mejorar sí, improvisar no. **Ojo:** desde el 26-oct se cambiaron a propósito el verde (fuera) y los acentos negros con brillo rojo; los mockups viejos aún tienen verde.
- **Qué es el producto, prioridades P0 a P3, reglas de oro:** `docs/CONTEXT.md` y `docs/ARCHITECTURE.md`. Cómo trabajar un agente: `docs/AGENT_PLAYBOOK.md`.
- **Product Blueprint v1 y propuesta comercial a Jeff:** se publicaron como documentos de Claude y **no están dentro del repo**; el `CHANGELOG.md` solo los menciona. De ahí salen los planes de la landing (Esencial y Completo, sin precios: son PROPUESTA y hay que validarlos con Jeff). **Cristian: pega aquí el enlace de esos documentos para que el próximo asistente los pueda leer:** `ENLACE_DEL_BLUEPRINT: pendiente`.
- **Antigüedad:** `docs/CONTEXT.md` (24-oct) y `docs/PROJECT_STATE.md` (25-oct) quedaron **desactualizados**; lo que pasó después está en `CHANGELOG.md` y en este archivo. Si algo se contradice, mandan este archivo y el `CHANGELOG.md`.

## 2. Reglas fijas (Cristian las repitió varias veces; no las olvides)
1. **Sin emojis ni símbolos genéricos.** Usa los iconos de marca (`components/ui/Icon.tsx`). Si falta uno, se agrega ahí.
2. **Sin verde.** No le gustan los chulos ni las letras verdes. Lo completado va en la marca: rojo (`--neon` a `--rose`) y negro (`--ink` #0A0910). Ya se quitó el verde en panel del coach y del cliente; si ves uno nuevo, quítalo. Excepciones deliberadas: el color de una línea de la gráfica de progreso y la flecha de mejora en métricas.
3. **Acentos negros con brillo rojo suave** (`radial-gradient(120% 220% at 0% 0%, rgba(247,37,75,.5), transparent 62%), var(--ink)`) en lo activo y en lo que pide acción. Es el lenguaje del panel del cliente y a Jeff le gusta. **No mezcles** el mismo estilo en fondo e icono a la vez (icono claro sobre tarjeta oscura). No saturar: ya se le dijo "te pasaste" una vez.
4. **No preguntes si algo se puede mejorar: mejóralo**, pero **no cambies lo que no te piden.** Si algo ya estaba bien y él dice "déjalo como estaba", revierte exactamente eso.
5. **No inventes datos del coach**: escribe `NO DEFINIDO`.
6. Cada cambio lleva **entrada en `CHANGELOG.md` con cómo revertirlo**. Cambios de claves, dominios, variables, crons o migraciones: actualiza también `docs/PASO_A_PRODUCCION.md`.
7. Antes de subir, **siempre** (en `/home/claude/yeffitnes`):
   - `npx tsc --noEmit`
   - `npx next lint` (los errores de lint **rompen el build**; los avisos viejos de `<img>` son normales)
   - `NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next build`
   - `bash supabase/tests/run_local.sh` (debe terminar en `TODO OK`; ejecuta las pruebas de ataque a RLS)
8. Mensajes de commit en español, con las líneas de atribución que pida el entorno.

## 3. Entornos y cómo se sube (muy importante)
| Entorno | Dirección | Rama | Para qué |
|---|---|---|---|
| **Producción** | `https://yeffitnes.netlify.app` (Netlify, plan de pago) | `main` | Clientes reales de Jeff |
| **Pruebas** | `https://yeffitnes.vercel.app` (Vercel Hobby) | `bloque-hoy` | Solo pruebas; nunca clientes reales |

- **Los dos usan la MISMA base de datos Supabase.** Lo que se haga en Vercel es dato real. Probar solo con el cliente de prueba.
- **Flujo normal:** los cambios se suben **directo a `bloque-hoy`** (`git push origin bloque-hoy`); Vercel despliega solo. **No se toca `main` ni Netlify** hasta que Cristian diga la palabra **"fusiona"**. Entonces se fusiona **todo en un solo bloque** (cada deploy de producción en Netlify cuesta 15 de 1.000 créditos al mes).
- Antes de fusionar: que estén corridas **todas las migraciones** que usa el código (sección 4), pasar los 4 chequeos de arriba y repasar `docs/PASO_A_PRODUCCION.md`.
- Todas las tareas programadas (pg_cron) y avisos apuntan a **Netlify**. Las suscripciones push y la app instalada son **por dirección**: los clientes y Jeff deben instalar y activar avisos desde Netlify; lo hecho en Vercel no vale.
- Las variables `NEXT_PUBLIC_*` se incrustan al construir: **tras cambiarlas hay que volver a desplegar.**
- Variables (mismas en ambos sitios, ver `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID`, (`BUNNY_TOKEN_KEY` aún no), `NEXT_PUBLIC_REQUIRE_INSTALL` (1 = obliga a instalar la app en móvil/tablet), `NEXT_PUBLIC_APP_NAME` (solo en Vercel: `YEFFITNES Test`, cambia el nombre y la imagen al compartir). Mantén **las mismas claves VAPID** en los dos.

## 4. Base de datos (Supabase)
- Migraciones en `supabase/migrations/` (hoy hasta **0031**). **Se corren a mano en el SQL Editor de Supabase, ANTES de subir el código que las usa.** Si el código de `bloque-hoy` pide una columna que no existe, las pantallas fallan en Vercel.
- Estado conocido (según Cristian): **0028** corrida; **0029** corrida (el audio funciona en Mensajes); **0030** corrida el 26-oct; **0031 (audio en el comentario del entrenamiento): SIN CONFIRMAR. Pídele que la corra y confírmalo antes de seguir.** Sin ella fallan las pantallas de entrenamiento en Vercel.
- **Compatibilidad con `main`:** mientras Netlify tenga código viejo, las migraciones deben seguir funcionando con él (columnas nuevas opcionales, funciones con parámetros por defecto). La 0031 recrea `review_workout(p_log, p_comment, p_audio default null)`: el código viejo, que llama con dos argumentos, debería seguir funcionando, pero **no se probó contra `main`**.
- Seguridad: todo cuelga de `workspace_id` con RLS. Los clientes escriben solo por funciones `SECURITY DEFINER` (RPC). Cada migración nueva con tablas, funciones o columnas del coach **necesita su prueba de ataque** en `supabase/tests/` (y entrar a la lista de `run_local.sh`). La prueba de la 0031 encontró un hueco real: un cliente podía escribir una columna del coach porque el disparador `protect_coach_columns` no la conocía. **Si agregas columnas que solo el coach escribe, amplía ese disparador.**
- Buckets de Storage privados: `message-images`, `message-audio` (audios de Jeff, en `<espacio>/<cliente>/<archivo>`), `progress-photos`.
- **Antes de lanzar:** cambiar la clave del cron (`update public.app_secrets set value='NUEVA' where name='cron';` y reprogramar las 4 tareas), pasar a **Supabase Pro**, Site URL = Netlify, decidir si se restringe el registro en `/login` (hoy cualquiera puede crear cuenta; Cristian preguntó y quedó sin responder).

## 5. Vídeos (Bunny Stream)
- Subida directa del teléfono a Bunny por TUS, firmada por el servidor (`lib/bunny.ts`, `app/api/video/*`, `lib/upload-video.ts`). La clave de Bunny nunca llega al navegador.
- **Límites actuales:** clientes envían máx. **20 s** (reporte y mensaje); pueden elegir de la galería hasta **60 s** (más se rechaza; entre 20 y 60 abre el recortador); el recorte es en tiempo real (`lib/trim-video.ts`, tarda lo que dura el tramo). Jeff: hasta **15 min y 1,5 GB, sin recortar ni recomprimir**. Cupos: 5 vídeos de reporte por cliente al día, 12 en mensajes.
- El vídeo del reporte **se sube al tocar Enviar**, no al elegirlo. Cancelar o cambiar de vídeo borra el anterior en Bunny (`/api/video/discard`); los huérfanos de más de 30 min se limpian cuando Jeff abre Reportes (`/api/video/purge`). Vídeos de reporte: se borran 24 h después de verlos (7 días máx.).
- La subida de Jeff para el vídeo de un día vive en la raíz de la app (`lib/upload-manager.tsx`): sigue aunque cambie de sección, mantiene la pantalla encendida y avisa antes de cerrar. **No sobrevive a cerrar la app** (límite de la web).
- **Pendiente:** poner `BUNNY_LIBRARY_ID` y `BUNNY_API_KEY` también en **Netlify** y redesplegar (en Vercel ya funciona). **La clave de Bunny salió en capturas: regenérala tras las pruebas.** No activar protección por token o dominio todavía (si se activa: `BUNNY_TOKEN_KEY` y añadir las direcciones de Netlify y Vercel).

## 6. Mapa rápido del código
- Datos y hooks del panel: `lib/queries.ts` (clientes, planes, entrenos, reportes, nutrición, actividad). Mensajes: `lib/messages.ts` (no es un chat: cliente máx. 600 caracteres, 3 sin leer, 12 por día; se borran 24 h después de leídos o a los 30 días).
- Dashboard del coach: `components/coach/DashboardView.tsx`, `DashKpis.tsx` (tarjetas que se abren), `FollowUp.tsx` + `lib/followup.ts` ("Hoy: a quién escribirle", con filtros). Ficha del cliente: `ClientFicha.tsx`; pestaña **Hoy** = `TodayCard.tsx` (entreno, nutrición, reporte, mensajes de hoy, pendientes anteriores). Resumen se dejó **como estaba** a propósito.
- Portal del cliente: `app/inicio/*`, `components/portal/*`. Estilos por zona: `app/coach/coach.css`, `app/inicio/portal.css`, y globales en `app/globals.css`, `app/messages.css`. Perfil en celular: `components/ProfileMenu.tsx` (círculo con iniciales que abre "Cerrar sesión").
- Puerta de instalación: `components/InstallGate.tsx` (bloqueo suave, no es seguridad; no aplica en escritorio).

## 7. Trampas que ya nos mordieron (no las repitas)
- **Hooks de React después de un `return` temprano** = error de lint = el build falla. Pon los hooks arriba.
- **CSS:** `overflow-x:hidden` en `body` rompe `position:sticky` (usa `overflow-x:clip`). Una tarjeta con overflow o transform recorta un modal con `position:fixed`: renderízalo con `createPortal` a `document.body`. Una fila con scroll horizontal dentro de una cuadrícula ensancha la columna y saca todo por la derecha: usa `minmax(0,1fr)` y `min-width:0` (hoy hay una regla `:where(.main *){min-width:0}` en móvil). **Escribe la unidad en los media queries** (`max-width:1080px`, no `1080`: se ignora en silencio). Un `style={{background:...}}` en línea gana a la clase: para cambiarlo hace falta `!important`.
- `Set` no se itera con `[...]` en este `tsconfig`: usa `Array.from`.
- iPhone instalado con barra de estado translúcida: el contenido queda bajo la hora y la batería. Se resolvió con margen de zona segura (`env(safe-area-inset-top)`); una cabecera negra de pantalla completa se probó y **se descartó**. La hora y la batería van en blanco: pueden costar leer sobre fondo claro (sin confirmar en su teléfono).
- `Permissions-Policy` controla el micrófono (`next.config.mjs`: `microphone=(self)`).
- Blob URLs de vídeo: créalas en `useEffect`, no en `useMemo` (se revocaban en modo estricto y el vídeo salía negro).
- La reproducción del recortador y la grabación de audio solo se probaron en Chromium simulado.
- Las capturas de comprobación se pueden hacer con Playwright sobre una página estática que cargue el CSS compilado de `.next/static/css`; no hay Supabase local completo, así que **no se pueden abrir las pantallas con datos reales**.

## 8. NO verificado en dispositivos reales (diselo a Cristian cuando toque)
Selector de galería sin conversión en iPhone (`accept` con tipos concretos, experimento en `ReportCard`: ¿entra rápido? ¿el recorte aguanta vídeos 4K?); recortador en Safari/iPhone y Android; grabación de audio; subida en segundo plano y pantalla encendida (Wake Lock); cabecera y zona segura del iPhone; vídeo largo de Jeff (10 min) de punta a punta; `:where(.main *){min-width:0}` en Plan, Nutrición y Agenda con datos reales; todo en Android.
Lo lento al elegir un vídeo de cámara en iPhone es la **conversión del propio iPhone** antes de que la app reciba el archivo; la app no puede acelerarlo. Recomendación para clientes: "Grabar ahora" dentro de la app, o ajustes de cámara 1080p/30 y formato "Más compatible".

## 9. Pendientes (orden sugerido)
1. Confirmar que **0031** está corrida; probar en Vercel con el cliente de prueba: pestaña Hoy, audio en el comentario, Seguimiento de hoy, reporte de punta a punta.
2. Reportar cómo se ve en el iPhone: cabecera, pestañas, tarjetas sin desbordes, selector de galería.
3. Bunny en Netlify + regenerar la clave. Cambiar la clave del cron. Supabase Pro. Repositorio privado y revocar el token de GitHub que se usó.
4. Antes de lanzar: WhatsApp de Jeff (`COACH_PHONE` y `wa.me/57XXXXXXXXXX` en `public/landing/index.html`), foto, planes y precios con Jeff, limpiar datos de prueba, restringir el registro en `/login`, mover la landing a su propia dirección.
5. Ideas aprobadas en conversación pero **no construidas**: botón "escribir a todos los de este filtro" en el seguimiento, racha por cliente, avisos de fin de plan, PDFs en Material, modo sin conexión, apps de tienda. Para el panel del cliente, cruzar "sin entrenar hoy" con el día de descanso del plan (hoy un día libre cuenta como "falta").
6. Aparte (fuera de este repo): la landing de **Carlos Coaching** se entregó y está en `carloscoach.vercel.app`; a Carlos le faltan WhatsApp, foto, logo, planes y precios.

## 9b. Qué está construido y qué falta (inventario al 26-oct)
Armado con `docs/CONTEXT.md`, `docs/PROJECT_STATE.md` y lo trabajado en esta etapa. **No es una auditoría contra el Product Blueprint** (no está en el repo): la primera tarea útil del próximo chat, cuando Cristian pase el enlace, es cruzar el blueprint con la app y dejar una tabla de huecos.

**Construido (existe en el código; la mayoría sin validar con usuarios reales):**
- *Coach:* dashboard (tarjetas que se abren, "Hoy: a quién escribirle", mensajes, agenda de hoy, tiempo real, anuncios); clientes y ficha (Hoy, Resumen, Entrenamiento, Nutrición, Progreso, Mensajes, Agenda, Notas privadas); catálogo (ejercicios, rutinas, plantillas de nutrición); revisión de entrenos con comentario de texto o audio; reportes diarios con vídeo; mensajes (texto, foto, vídeo, YouTube, audio de Jeff); agenda con horarios y clases grupales; material educativo; buscador rápido; avisos push.
- *Cliente:* Hoy, Mi plan, Progreso (mediciones y fotos), Agenda, Material, Mensajes, Objetivos, onboarding básico de 3 pasos, reporte diario, recordatorios automáticos, instalación como app (con puerta de instalación opcional).
- *Otros:* landing de venta en `/landing`, recortador de vídeo, subida de vídeo en segundo plano para Jeff.

**Falta o está a medias (según los documentos del repo):**
- Onboarding con **personaje guía** y el contenido que defina Jeff (P2).
- **PDFs** en Material y el **vídeo de la semana** en Hoy.
- **Modo sin conexión** (P2). Apps de tienda y moverlo a **dominio propio**.
- **Decisiones de Jeff sin tomar** (`docs/CONTEXT.md` §11): nombres, precios y contenido de los planes; reglas de agenda (hoy PROPUESTA: 1 reserva futura, cancelar hasta 24 h antes); duración y obligatoriedad del vídeo diario y plazo de borrado; qué partes del registro son obligatorias; horarios de los recordatorios.
- **Deuda técnica conocida** (`docs/CONTEXT.md` §12): textos "Jeff" fijos y el registro asigna siempre el primer espacio (solo sirve con un coach); zona horaria única (Bogotá); `ex_client_read` expone el catálogo completo de ejercicios al cliente con plan; ítems de menú sin pantalla (apagados); los diálogos no atrapan el foco del teclado.
- **Pre-lanzamiento:** quitar la insignia "Powered by Netlify", confirmación de correo, revisión final de RLS, prueba con 2 o 3 clientes reales, dominio, Supabase Pro, repositorio privado.
- **Futuro (P3):** multi-coach con logo y colores propios, cobro a coaches.
- **Plazo del proyecto:** hasta el 21-dic-2026, ampliable a 3 meses (21-ene-2027).
- **Lo que Cristian pidió y no está hecho:** ver sección 9, punto 5.

## 10. Cómo arrancar un chat nuevo
Pega: *"Lee `AGENTS.md`, `docs/HANDOFF.md`, `docs/PASO_A_PRODUCCION.md` y las 10 primeras entradas de `CHANGELOG.md` del repo `Yeffitnes/YEFFITNES-APP`, rama `bloque-hoy`. Confírmame qué entendiste y qué falta verificar antes de tocar código. Después, con el enlace del blueprint, cruza el blueprint con la app y dame una tabla de qué falta."*
