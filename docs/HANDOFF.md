# HANDOFF: léelo primero, antes de tocar nada

Estado al **29-oct-2026, noche** (última fusión a `main`: 28-oct, `37970c1`; lo construido después vive solo en `bloque-hoy`). Escrito para que un asistente nuevo (o una persona) siga trabajando sin cometer errores. Complementa a `AGENTS.md`, `docs/CONTEXT.md`, `docs/AGENT_PLAYBOOK.md` y `docs/PASO_A_PRODUCCION.md`. El detalle de cada cambio, con cómo revertirlo, está en `CHANGELOG.md` (las primeras entradas son las más recientes). Aquí no hay claves; no pegues ninguna en el repo ni en el chat.

## 1. Con quién trabajas
- **Cristian Santiago Gómez Romero**: líder de producto y desarrollo freelance. **No usa la terminal.** Escribe en **español, dictando por voz**: puede haber frases cortadas o palabras mal transcritas; interpreta la intención y, si algo es ambiguo y barato de rehacer, elige lo más razonable y dilo.
- **Cliente final: Jefferson González ("Jeff")**, coach. Marca **YEFFITNES TRAINING**. Cristian quiere que Jeff quede feliz y trabaje rápido; todo se mide contra eso.
- Repositorio: `Yeffitnes/YEFFITNES-APP`. Ruta de trabajo del asistente: la carpeta donde se clone el repo (en las últimas sesiones, `/home/claude/yeffitnes-app`; antes `/home/claude/yeffitnes`). Usa la que exista.
- Responde corto, claro y sin tecnicismos. Di **qué cambió, qué verificaste y qué NO pudiste verificar**. Cristian prueba en su iPhone y en escritorio con Safari y te dice cómo se ve: confía en eso para lo visual.

## 1b. Dónde está el "plano" del proyecto (blueprint, diseño y contexto)
- **Diseño visual:** `design/mockups/*.html` es la fuente visual (hay mockups del dashboard, clientes, catálogo, agenda y material del coach, y de Hoy, Mi plan, Progreso, Agenda y Material del cliente) y `design/README.md` explica cómo usarlos. Regla del proyecto: copiar estructura, clases, textos y flujo; mejorar sí, improvisar no. **Ojo:** desde el 26-oct se cambiaron a propósito el verde (fuera) y los acentos negros con brillo rojo; los mockups viejos aún tienen verde.
- **Qué es el producto, prioridades P0 a P3, reglas de oro:** `docs/CONTEXT.md` y `docs/ARCHITECTURE.md`. Cómo trabajar un agente: `docs/AGENT_PLAYBOOK.md`.
- **Product Blueprint v1:** copia en **`docs/PRODUCT_BLUEPRINT.md`** (27-oct). El cruce con la app y las decisiones de Cristian del 27-oct que lo corrigen están en **`docs/BLUEPRINT_GAPS.md`** (si chocan, manda BLUEPRINT_GAPS). De ahí salen los planes de la landing (Esencial y Completo, sin precios: PROPUESTA, validar con Jeff). La propuesta comercial a Jeff sigue fuera del repo (es confidencial y el repo aún es público).
- **Futuro multi-coach (marca por coach):** solo planeado, ver `docs/FUTURO_MULTICOACH.md`. No es para esta entrega.
- **Antigüedad:** `docs/CONTEXT.md` (24-oct) y `docs/PROJECT_STATE.md` (25-oct) quedaron **desactualizados**; lo que pasó después está en `CHANGELOG.md` y en este archivo. Si algo se contradice, mandan este archivo y el `CHANGELOG.md`.

## 2. Reglas fijas (Cristian las repitió varias veces; no las olvides)
1. **Sin emojis ni símbolos genéricos.** Usa los iconos de marca (`components/ui/Icon.tsx`). Si falta uno, se agrega ahí.
2. **Sin verde.** No le gustan los chulos ni las letras verdes. Lo completado va en la marca: rojo (`--neon` a `--rose`) y negro (`--ink` #0A0910). Ya se quitó el verde en panel del coach y del cliente; si ves uno nuevo, quítalo. Excepciones deliberadas: el color de una línea de la gráfica de progreso y la flecha de mejora en métricas.
3. **Acentos negros con brillo rojo suave** (`radial-gradient(120% 220% at 0% 0%, rgba(247,37,75,.5), transparent 62%), var(--ink)`) en lo activo y en lo que pide acción. Es el lenguaje del panel del cliente y a Jeff le gusta. **No mezcles** el mismo estilo en fondo e icono a la vez (icono claro sobre tarjeta oscura). No saturar: ya se le dijo "te pasaste" una vez.
4. **No preguntes si algo se puede mejorar: mejóralo**, pero **no cambies lo que no te piden.** Si algo ya estaba bien y él dice "déjalo como estaba", revierte exactamente eso.
5. **No inventes datos del coach**: escribe `NO DEFINIDO`.
6. Cada cambio lleva **entrada en `CHANGELOG.md` con cómo revertirlo**. Cambios de claves, dominios, variables, crons o migraciones: actualiza también `docs/PASO_A_PRODUCCION.md`.
7. Antes de subir, **siempre** (en la carpeta del repo):
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
- Rapidez al abrir (28-oct): "Hoy" se dibuja en el servidor (`app/inicio/layout.tsx` + `lib/fetchers.ts`), el service worker guarda solo archivos fijos, y `/api/ping` + tarea `yeffitnes-despierta` mantienen el servidor despierto (PASO_A_PRODUCCION §3c).
- **Producción (Netlify) al día desde el 28-oct** (`main` = `37970c1`). Tareas programadas activas: 4 recordatorios, `yeffitnes-videos`, `yeffitnes-despierta` (Netlify) y `yeffitnes-despierta-vercel`.
- Migraciones en `supabase/migrations/` (hoy hasta **0041**). **Se corren a mano en el SQL Editor de Supabase, ANTES de subir el código que las usa.** Si el código de `bloque-hoy` pide una columna que no existe, las pantallas fallan en Vercel.
- Estado conocido (según Cristian): **0028 a 0035 corridas** (0032-0035 confirmadas el 27-oct, noche). **0036 corrida** (27-oct, noche). **0037 corrida** (28-oct, según Cristian). **0038 corrida** (28-oct). **0039 y 0040 corridas** (28-oct, noche: imágenes de ejercicios y 54 ejercicios precargados). **0041 POR CORRER** (29-oct, noche: tiempo real, respuestas con foto/vídeo, agenda 10 min, vídeo día+semana, atención, arranque). Próxima migración: **0042**. Lección: si Vercel muestra "No pudimos cargar los clientes", casi siempre falta correr la última migración.
- **Compatibilidad con `main`:** mientras Netlify tenga código viejo, las migraciones deben seguir funcionando con él (columnas nuevas opcionales, funciones con parámetros por defecto). La 0031 recrea `review_workout(p_log, p_comment, p_audio default null)`: el código viejo, que llama con dos argumentos, debería seguir funcionando, pero **no se probó contra `main`**.
- Seguridad: todo cuelga de `workspace_id` con RLS. Los clientes escriben solo por funciones `SECURITY DEFINER` (RPC). Cada migración nueva con tablas, funciones o columnas del coach **necesita su prueba de ataque** en `supabase/tests/` (y entrar a la lista de `run_local.sh`). La prueba de la 0031 encontró un hueco real: un cliente podía escribir una columna del coach porque el disparador `protect_coach_columns` no la conocía. **Si agregas columnas que solo el coach escribe, amplía ese disparador.**
- Buckets de Storage privados: `message-images`, `message-audio` (audios de Jeff, en `<espacio>/<cliente>/<archivo>`), `progress-photos`. Público: `exercise-images` (imágenes que sube Jeff a sus ejercicios, `<espacio>/<archivo>`). Las 54 imágenes base viven en `public/ex/` (no en Supabase).
- **Antes de lanzar:** cambiar la clave del cron (`update public.app_secrets set value='NUEVA' where name='cron';` y reprogramar las 4 tareas), pasar a **Supabase Pro**, Site URL = Netlify, decidir si se restringe el registro en `/login` (hoy cualquiera puede crear cuenta; Cristian preguntó y quedó sin responder).

## 5. Vídeos (Bunny Stream)
- Subida directa del teléfono a Bunny por TUS, firmada por el servidor (`lib/bunny.ts`, `app/api/video/*`, `lib/upload-video.ts`). La clave de Bunny nunca llega al navegador.
- **Borrado de vídeos de reporte (27-oct, 0033):** 32 h después de enviados si Jeff no los ve; 12 h después de marcarlos vistos. Lo garantiza una tarea programada cada hora (`/api/cron/purge-videos`, se programa al fusionar; ver `PASO_A_PRODUCCION.md` §2). Huérfanos: a las 3 h (0035).
- **Material con vídeo privado (27-oct, 0035):** Jeff elige YouTube o Privado; el privado se sube en segundo plano y se publica solo al terminar. Destacar = vídeo del día (hasta medianoche) o de la semana (7 días), sale en Hoy.
- **Límites actuales:** clientes envían máx. **20 s** (reporte y mensaje); pueden elegir de la galería hasta **60 s** (más se rechaza; entre 20 y 60 abre el recortador); el recorte es en tiempo real (`lib/trim-video.ts`, tarda lo que dura el tramo). Jeff: hasta **15 min y 1,5 GB, sin recortar ni recomprimir**. Cupos: 5 vídeos de reporte por cliente al día, 12 en mensajes.
- El vídeo del reporte **se sube al tocar Enviar**, no al elegirlo. Cancelar o cambiar de vídeo borra el anterior en Bunny (`/api/video/discard`); los huérfanos de más de 30 min se limpian cuando Jeff abre Reportes (`/api/video/purge`). Vídeos de reporte: se borran 24 h después de verlos (7 días máx.).
- La subida de Jeff para el vídeo de un día vive en la raíz de la app (`lib/upload-manager.tsx`): sigue aunque cambie de sección, mantiene la pantalla encendida y avisa antes de cerrar. **No sobrevive a cerrar la app** (límite de la web).
- **Pendiente:** poner `BUNNY_LIBRARY_ID` y `BUNNY_API_KEY` también en **Netlify** y redesplegar (en Vercel ya funciona). **La clave de Bunny salió en capturas: regenérala tras las pruebas.** No activar protección por token o dominio todavía (si se activa: `BUNNY_TOKEN_KEY` y añadir las direcciones de Netlify y Vercel).

## 6. Mapa rápido del código
- Datos y hooks del panel: `lib/queries.ts` (clientes, planes, entrenos, reportes, nutrición, actividad). Mensajes: `lib/messages.ts` (no es un chat. **Desde el 27-oct, 0032:** el cliente envía al día máx. 3 textos, 1 foto y 1 vídeo, nunca audio, 600 caracteres; Jeff sin límite. Se borran 24 h después de leídos o a los 30 días).
- **Cliente sin plan (27-oct, 0034):** entra a la app con todo bloqueado (`components/portal/LockedPanel.tsx`, `FeatureGate.tsx`) y botón "Solicitar acceso a Jeff" (`/api/access/request`); al asignarle plan le llega "Tu plan está activo" (`/api/access/activated`). `/pendiente` queda solo para cuentas en pausa.
- **Primer llamada (27-oct):** el cliente activo sin rutina ve "Falta poco: Jeff creará tu rutina/nutrición para ti" (diseño del candado sin candado) y el aviso "Primer paso: agenda tu llamada" hasta agendarla (`useFirstCall`).
- **Primer arranque (27-oct):** `components/portal/FirstRun.tsx`: notificaciones obligatorias y luego la bienvenida (`Onboarding.tsx`) con el personaje guía (`Guide.tsx`, provisional) que ilumina cada panel del menú, punto de partida, consentimiento de fotos y llamada.
- Dashboard del coach: `components/coach/DashboardView.tsx`, `DashKpis.tsx` (tarjetas que se abren), `FollowUp.tsx` + `lib/followup.ts` ("Hoy: a quién escribirle", con filtros). Ficha del cliente: `ClientFicha.tsx`; pestaña **Hoy** = `TodayCard.tsx` (entreno, nutrición, reporte, mensajes de hoy, pendientes anteriores). Resumen se dejó **como estaba** a propósito.
- Portal del cliente: `app/inicio/*`, `components/portal/*`. Estilos por zona: `app/coach/coach.css`, `app/inicio/portal.css`, y globales en `app/globals.css`, `app/messages.css`. Perfil en celular: `components/ProfileMenu.tsx` (círculo con iniciales que abre "Cerrar sesión").
- Puerta de instalación: `components/InstallGate.tsx` (bloqueo suave, no es seguridad; no aplica en escritorio).

## 7. Trampas que ya nos mordieron (no las repitas)
- **Hooks de React después de un `return` temprano** = error de lint = el build falla. Pon los hooks arriba.
- **CSS:** `overflow-x:hidden` en `body` rompe `position:sticky` (usa `overflow-x:clip`). Una tarjeta con overflow o transform recorta un modal con `position:fixed`: renderízalo con `createPortal` a `document.body`. Una fila con scroll horizontal dentro de una cuadrícula ensancha la columna y saca todo por la derecha: usa `minmax(0,1fr)` y `min-width:0` (hoy hay una regla `:where(.main *){min-width:0}` en móvil). **Escribe la unidad en los media queries** (`max-width:1080px`, no `1080`: se ignora en silencio). Un `style={{background:...}}` en línea gana a la clase: para cambiarlo hace falta `!important`.
- `Set` no se itera con `[...]` en este `tsconfig`: usa `Array.from`.
- **Tiempo real (29-oct):** `lib/live.ts` escucha `nudges`, `workout_logs`, `bookings`, `daily_reports` y `activity_events`. Si agregas una tabla que deba verse al instante, súmala a la publicación `supabase_realtime` en una migración y al hook. Cada serie que registra el cliente actualiza `workout_logs`: no releas todo en cada evento (el hook compara lo del coach).
- **Avisos push y claves VAPID:** Netlify y Vercel tienen claves distintas y la MISMA tabla de suscripciones. Un envío desde Vercel a un teléfono instalado desde Netlify falla con 403 (no se borra). Por eso, para probar avisos, coach y cliente deben estar en el mismo sitio. Un mismo navegador = una sola cuenta para avisos (la última que abrió la app).
- iPhone instalado con barra de estado translúcida: el contenido queda bajo la hora y la batería. Se resolvió con margen de zona segura (`env(safe-area-inset-top)`); una cabecera negra de pantalla completa se probó y **se descartó**. La hora y la batería van en blanco: pueden costar leer sobre fondo claro (sin confirmar en su teléfono).
- `Permissions-Policy` controla el micrófono (`next.config.mjs`: `microphone=(self)`).
- Blob URLs de vídeo: créalas en `useEffect`, no en `useMemo` (se revocaban en modo estricto y el vídeo salía negro).
- La reproducción del recortador y la grabación de audio solo se probaron en Chromium simulado.
- **Desde el 29-oct SÍ se puede abrir la app con datos:** `tests/e2e/` levanta Postgres + PostgREST + un Supabase mínimo y la recorre con Playwright (ver su README). Sin Storage, Realtime, push ni Bunny. Después, recompila normal antes de los chequeos.
- **Hidratación:** NO pauses React Query con `onlineManager` (se probó el 29-oct y dejaba consultas y acciones en pausa). Las consultas del marco (campanita, precargas) esperan un momento (`useAfterBoot`). No leas `localStorage` ni la hora al dibujar por primera vez algo que también pinta el servidor, y muestra "cargando" (no "vacío") mientras una consulta está pendiente. Prueba con `LATENCY=150` en `tests/e2e`.

- Una regla genérica `.today{display:grid}` (tarjeta de Hoy del coach) pisaba la columna del día actual en la agenda: en el celular la agenda "se quedaba" en hoy. Cuidado con clases genéricas (`.today`, `.active`) que se repiten en otras pantallas; usa selectores con contexto (`.week-grid .day-col`).
- Al insertar texto en un archivo con `replace(..., 1)` la primera coincidencia puede estar en un **comentario de cabecera** (pasó en la 0038: un bloque quedó arriba). Revisa el resultado.
- Imágenes de ejercicios con IA (Gemini): pedir de a 9 en cuadrícula 3×3, sin números al inicio de cada línea ni frases "NOT ..." (las toma como ejercicios extra), y "side view" para todo lo acostado. Recorte con `/home/claude/scratch/ex` (detección de canaletas por brillo) a 360 px WebP.

## 8. NO verificado en dispositivos reales (diselo a Cristian cuando toque)
Selector de galería sin conversión en iPhone (`accept` con tipos concretos, experimento en `ReportCard`: ¿entra rápido? ¿el recorte aguanta vídeos 4K?); recortador en Safari/iPhone y Android; grabación de audio; subida en segundo plano y pantalla encendida (Wake Lock); cabecera y zona segura del iPhone; vídeo largo de Jeff (10 min) de punta a punta; `:where(.main *){min-width:0}` en Plan, Nutrición y Agenda con datos reales; todo en Android.
Lo lento al elegir un vídeo de cámara en iPhone es la **conversión del propio iPhone** antes de que la app reciba el archivo; la app no puede acelerarlo. Recomendación para clientes: "Grabar ahora" dentro de la app, o ajustes de cámara 1080p/30 y formato "Más compatible".

## 9. Pendientes (orden sugerido, al 29-oct noche)
0. **29-oct, noche:** se atendió el reporte de pruebas de Cristian (ver la primera entrada de `CHANGELOG.md`). Falta: que corra la **0041** y vuelva a probar en Vercel. Reglas PROPUESTA por validar con Jeff: 3 días para alertar "sin primera llamada", 2 días sin actividad/sin reporte = urgente, umbrales de subir/bajar peso.
1. **Cristian está probando en Vercel** lo del 28-oct: arranque rápido, Avisar con cumplido, respuestas de Jeff (Hoy, Mensajes y "la última vez" en la rutina), plan mensual de 30 días, bienvenida sin saltar con peso y estatura, agenda por días, vídeo del día/semana, cancelar cita con aviso, filtros del catálogo, imágenes de ejercicios (Mi plan, Hoy, catálogo) y 54 precargados. Esperar su reporte.
2. **Imágenes de los 54 ejercicios APROBADAS** (28-oct, noche) por Cristian y Jeff, incluidas 01, 09, 10, 49 y 53 tal como están. Ya están en la app (`public/ex/`) y en el catálogo (0040 corrida). Si Jeff quiere cambiar una, la reemplaza él desde el catálogo con "Cambiar imagen".
3. **Próximo "fusiona"** (una sola publicación, 15 créditos): seguir `PASO_A_PRODUCCION.md` §10. Después del merge: la notificación de plan vencido sale con la tarea de la mañana (apunta a Netlify).
4. Cambiar la clave del cron, Supabase Pro, regenerar la clave de Bunny, repositorio privado y revocar el token de GitHub.
5. Antes de lanzar: WhatsApp y foto de Jeff en la landing, planes y precios, limpiar datos de prueba, restringir el registro en `/login`, landing en su propia dirección. Decidir si se baja Netlify al plan gratis (capacidad estimada: 100-150 clientes; si se agotan los 300 créditos el sitio se apaga hasta el mes siguiente).
6. Ideas aprobadas y **no construidas**: "escribir a todos los de este filtro", racha por cliente, PDFs en Material, modo sin conexión, apps de tienda, cruzar "sin entrenar hoy" con el día de descanso.
7. La propuesta de personaje **animado** por ejercicio se descartó (técnica imperfecta confunde); quedó la imagen fija.

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
Pega: *"Lee `docs/MASTER_ROLE.md` y asume ese rol. Luego lee `AGENTS.md`, `docs/HANDOFF.md` (sobre todo §2, §3, §4 y §9), `docs/PASO_A_PRODUCCION.md` y las 15 primeras entradas de `CHANGELOG.md` del repo `Yeffitnes/YEFFITNES-APP`, rama `bloque-hoy`. Confírmame en pocas líneas qué entendiste, qué migraciones están corridas y qué está pendiente de probar. Tienes permiso para subir a `bloque-hoy`; a `main` solo cuando yo diga \"fusiona\"."*
El rol está en `docs/MASTER_ROLE.md`, el blueprint en `docs/PRODUCT_BLUEPRINT.md` y el cruce con la app en `docs/BLUEPRINT_GAPS.md`: no hace falta pegarlos.
**No se suben al repo** (hoy es público): el zip de DaniFit (material de terceros, ver blueprint §"Propiedad intelectual") ni la propuesta comercial de Jeff (`APROPUESTA-YEFFITNES.html`). Lo útil de ambos ya está resumido en el blueprint y en `CONTEXT.md`; se adjuntan al chat solo si una tarea los necesita (por ejemplo, comparar un diseño de DaniFit).
