# Blueprint v1 contra la app: qué cumple, qué cambió y qué falta

Cruce hecho el 26-oct-2026, noche, sobre la rama `bloque-hoy` (commit `93cebbd`). Se comparó el **Product Blueprint v1** (21-oct, documento de Claude fuera del repo) con el código y las migraciones `0001` a `0031`. Se leyó código y esquema; **no se abrió la app con datos reales**.

## Decisiones de Cristian del 27-oct (mandan sobre el blueprint y sobre las tablas de abajo)
| Tema | Decisión | Estado |
|---|---|---|
| Mensajes | El cliente envía al día **3 textos, 1 foto y 1 vídeo; nunca audio**. Jeff sin límite (texto, foto, vídeo, audio). **No** van ligados al reporte: el reporte va aparte (comentario del entreno + vídeo). | Hecho (0032) |
| WhatsApp | Fuera de la app. No se necesita. | Ya estaba |
| Cliente sin plan | Entra a la app y ve **cada panel bloqueado y borroso con candado** (FeatureGate de DaniFit); botón "Solicitar acceso a Jeff" que le avisa; Jeff elige el plan. | Hecho (0034) |
| Notificaciones | **Obligatorias** al entrar, antes de la bienvenida. | Hecho (sin migración) |
| Bienvenida | Más dinámica, con **personaje guía** que muestra cada panel; incluye **consentimiento de fotos**. | Hecho; el personaje es provisional (diseño NO DEFINIDO) |
| Vídeos del reporte | Se borran **sí o sí**: 32 h si Jeff no los ve; **12 h** después de verlos, y Jeff ve el aviso. | Hecho (0033); falta programar la tarea al fusionar |
| Rutinas | Series fijas; repeticiones en rango ("8-12"). Si pasa del máximo, sugerir subir el peso al cliente y recomendárselo a Jeff, que lo ajusta. | Hecho (27-oct, noche; `lib/progression.ts`) |
| Primera llamada | Todo cliente agenda primero su llamada; rutina y nutrición llegan después. Paneles "Falta poco" sin candado. | Hecho (27-oct, noche) |
| Fotos de progreso | Solo las sube el cliente (no hay sesiones presenciales). A futuro, Jeff debería poder editar lo que registra el cliente. | Se deja como está |
| Material | Vídeos **privados** además de YouTube; **vídeo del día o de la semana** en Hoy. | Hecho (0035) |
| Colores por coach | Solo como arquitectura pensada para vender la app a otros coaches. No para esta entrega. | Documentado en `FUTURO_MULTICOACH.md` |
| `/zz-test` | Quitar. | Hecho |

### Rutinas: cómo lo entendí (confirmar antes de construir)
Cristian habló de "mínimo 6, máximo 15" y de que, si el cliente supera el máximo, **sube el peso**. Eso es una **doble progresión por rango de repeticiones**: Jeff pone por ejercicio un rango (p. ej. 8 a 12 repeticiones); el cliente registra peso y repeticiones de cada serie; si llega al máximo en todas las series, la app le sugiere subir el peso la próxima vez, y si no llega al mínimo, bajarlo. Hoy el campo de repeticiones es texto libre ("8-12" se puede escribir, pero la app no lo entiende).
Propuesta técnica: `plan_items` gana `reps_min` y `reps_max` (y `template_items` igual), el registro marca en rojo la serie fuera del rango y Hoy muestra "Sube el peso" o "Baja el peso" para la próxima sesión. Las series mínimas obligatorias serían otro campo (`sets_min`). **Falta que Jeff confirme si habla de repeticiones o de series** y si el aviso debe ser automático o solo para Jeff.

Estados: **Cumple** = existe y hace lo que pide el blueprint · **Distinto** = existe, pero se decidió otra cosa después (confirmar que es a propósito) · **Parcial** = existe a medias · **Falta** = no existe.

## P0

| Pide el blueprint | Estado | Qué hay en la app |
|---|---|---|
| Registro abierto, cliente queda Pendiente y Jeff lo activa | Cumple | `clients.status` pending/active/paused; pantalla `/pendiente`. |
| Pendiente ve la app bloqueada y borrosa con botón de WhatsApp | Distinto | Ve una pantalla propia "Tu coach activará tu plan" con hilo de Mensajes, no la app borrosa. WhatsApp se quitó de la app (CONTEXT §3). |
| Acceso por plan, validado en la base y no solo en pantalla | Cumple | `plans.features` por espacio + `client_has_feature()` en RLS de entrenos, progreso, reportes, nutrición, anuncios y material. |
| Plan sin funciones = no ve nada | Cumple | `client_has_feature` exige `status = 'active'`. |
| Roles y RLS, aislamiento entre clientes y coaches | Cumple | 17 pruebas de ataque en `TODO OK`. Deuda: `ex_client_read` deja ver todo el catálogo de ejercicios. |
| Plantillas de rutina que se clonan por cliente | Cumple | `routine_templates` se copian a `plan_days`/`plan_items`; editar al cliente no toca la plantilla. La plantilla es de **un día**, no de una semana completa. |
| Rutina por días con enfoque, vídeo, peso e intensidad | Parcial | Días lun-dom con nombre, series, reps, descanso, peso objetivo, notas y vídeo. **No hay campo de intensidad** (RIR/RPE/tempo); hoy iría en notas. |
| Hoy con registro de series: reps, peso real, esfuerzo 1-10, aproximaciones | Cumple | `set_logs` con `kind` warmup/work; esfuerzo 1-10 en `workout_logs`. |
| Partes del registro que Jeff marca como obligatorias | Falta | No existe la marca. La decisión de qué es obligatorio también está pendiente con Jeff. |
| Reporte diario: vídeo corto + comentario + esfuerzo | Parcial | Vídeo + comentario sí. El esfuerzo vive en el entrenamiento, no en el reporte (un día sin entreno no tiene esfuerzo). |
| Jeff responde sobre el mismo reporte / el cliente ve "Jeff lo revisó" | Parcial | El cliente ve "Tu coach ya lo vio". La respuesta de Jeff va por Mensajes o en el comentario del entrenamiento, no en el reporte. |
| Cola de revisión priorizada | Cumple | "Seguimiento de hoy" + razones de atención (`lib/attention.ts`, `lib/followup.ts`) + Reportes. Se calcula en el navegador (vale hasta unos 50 clientes). |
| Todo dato pertenece a un coach (`workspace_id`) | Cumple | En todas las tablas. Deuda: el registro asigna siempre el primer espacio y hay textos "Jeff" fijos. |

## P1

| Pide el blueprint | Estado | Qué hay en la app |
|---|---|---|
| Onboarding con tour, peso, medidas, consentimiento de fotos y agendar llamada | Parcial | 3 pasos: tour, peso y cintura, ir a Agenda. El consentimiento de fotos se pide en Progreso, no en el onboarding. |
| Agenda: Jeff publica horarios, el cliente reserva | Cumple | Más de lo pedido: clases grupales y agendado directo de Jeff. |
| Progreso con gráficas y fotos | Cumple | Mediciones, gráfica, fotos antes/después con consentimiento. |
| Fotos de progreso **también de Jeff** | Falta | Jeff solo puede ver las fotos; no puede subir. Mediciones sí puede registrarlas. |
| Nutrición estructurada con plantillas, sin PDF | Cumple | Plantillas en catálogo, comidas por día, marcar comidas. |
| Anuncios a todos | Cumple | Fijar y vencimiento. |
| Notas visibles al cliente + notas privadas | Distinto | Hay notas privadas (`client_notes`, el cliente nunca las ve). Lo "visible" se hace por Mensajes y comentario del entreno. |
| Mensajes sin chat: el cliente escribe una vez por noche, ligado al reporte, sin "visto" | Distinto | Existe Mensajes: 600 caracteres, 3 sin leer, 12 por día, foto, vídeo y audio de Jeff. Es más abierto que el blueprint. **Confirmar con Cristian que es la decisión vigente.** |
| Borrado automático de vídeos (24 h tras visto, tope 7 días) | Parcial | Las reglas existen, pero el borrado corre **cuando Jeff abre Reportes**, no como tarea programada. Si Jeff no entra, los vídeos no se borran. |

## P2

| Pide el blueprint | Estado | Qué hay en la app |
|---|---|---|
| Personaje guía animado | Falta | Bloqueado por diseño del personaje (NO DEFINIDO). |
| Material educativo con YouTube | Cumple | Artículos y vídeos, básico/completo, vídeo de la semana, vistas. |
| Material con vídeo **privado** (Jeff elige YouTube o Privado) | Falta | En Material solo hay YouTube. Bunny sí existe para el vídeo personalizado de una rutina. |
| Tema por coach (logo y colores) | Falta | Columnas `logo_url` y `primary_color` existen pero ningún código las usa. |
| PWA instalable con avisos | Cumple | Push, recordatorios por cron y puerta de instalación. Sin modo sin conexión. |

## P3 (no se espera nada todavía)
Cobros a coaches, dominios propios, analítica avanzada, IA, apps de tienda: nada construido, como corresponde.

## Arquitectura y costos

| Blueprint | App hoy |
|---|---|
| Netlify plan gratis | Netlify **de pago** (producción) + Vercel Hobby (pruebas). Decisión del 25-oct. |
| Pasar a Supabase Pro antes de clientes reales | Pendiente. |
| Bunny con subida firmada, llave nunca en el navegador | Cumple. Falta poner las variables en Netlify y regenerar la clave expuesta. |

## Hallazgos sueltos
- `/zz-test` es una página de prueba del micrófono que se publica en producción y no pide sesión. No es peligrosa, pero sobra.
- `docs/PASO_A_PRODUCCION.md` dice que el vídeo del reporte dura máx. 30 s y que Bunny está "pendiente de crear la cuenta"; el HANDOFF dice 20 s y que Bunny ya funciona en Vercel.

## Lo que más falta, en orden sugerido (actualizado 27-oct)
1. Correr 0032 a 0035 y probar en Vercel el recorrido completo (`PASO_A_PRODUCCION.md` §10).
2. Definir con Jeff el rango de repeticiones o series de las rutinas (arriba) y construirlo.
3. Diseño definitivo del personaje guía y textos de la bienvenida (Jeff).
4. Campo de intensidad en la rutina (RIR/RPE) si Jeff lo usa.
5. Al fusionar: programar la tarea `yeffitnes-videos`.
