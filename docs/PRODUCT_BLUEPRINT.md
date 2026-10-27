> Copia fiel del Product Blueprint v1 (21-oct-2026) publicado como documento de Claude. Se guarda aquí para leerlo sin el chat.
> Lo decidido **después** (27-oct) está en `docs/BLUEPRINT_GAPS.md` § "Decisiones de Cristian del 27-oct" y manda sobre este texto donde choquen.

# Product Blueprint v1 — Jeff Fitness (YEFFITNES TRAINING)

Borrador para aprobación · 21 de octubre de 2026 · Sustituye al diagnóstico preliminar

Leyenda: **\[REQ\]** requisito dicho por el coach/propietario · **\[PROP\]** propuesta mía · **\[INF\]** inferencia · **NO DEFINIDO** pendiente.

## 1. Producto en una frase

Una app web instalable (PWA) en la que Jeff entrega y supervisa un coaching casi 100 % online, y en la que el cliente sabe qué hacer hoy, lo registra, lo reporta en un video corto y recibe ajustes de Jeff. \[REQ\]

La venta, el cobro y la conversación personal viven fuera de la app (landing + WhatsApp). La app no procesa pagos. \[REQ\]

## 2. Restricción de diseño más importante

Jeff solo puede revisar **por las noches entre semana**; los fines de semana hace llamadas y sesiones. \[REQ\] Todo el panel del coach debe responder en minutos a: *¿a quién tengo que atender esta noche y por qué?*

Consecuencia: el panel de Jeff es una **cola de revisión priorizada**, no una lista de clientes. \[PROP\]

## 3. Usuarios y roles

| Rol | Qué hace |
| --- | --- |
| Coach (Jeff) | Activa clientes, asigna plan, arma rutinas y nutrición, revisa reportes, comenta, publica anuncios, gestiona agenda y material |
| Cliente | Se registra, completa onboarding, entrena, registra series, envía reporte diario, ve progreso y contenido según su plan |
| Admin de plataforma | Crea espacios de coaches nuevos. Sin interfaz en el MVP (se hace en base de datos). \[PROP\] |

## 4. Journeys

### Cliente

1. Cierra la venta por WhatsApp y descarga/instala la app. \[REQ\]
2. Se registra solo. Queda en estado **Pendiente**: ve la app con todo el contenido bloqueado y borroso (estado FeatureGate de DaniFit) y un botón para escribir a Jeff por WhatsApp. \[REQ\]
3. Jeff lo **activa** y le asigna un plan. \[REQ\]
4. Onboarding interactivo con personaje guía: tour de la app, peso, medidas, consentimiento de fotos y agendar la llamada del sábado o domingo. \[REQ\] El orden exacto respecto a la activación es una inferencia mía \[INF\].
5. En la llamada, Jeff conoce al cliente y después arma nutrición y rutina dentro de la app. \[REQ\]
6. Día a día: **Hoy** → rutina → registra series (repeticiones, peso real, esfuerzo 1 a 10) → **reporte diario** (video corto + comentario) → ve progreso. \[REQ\]

### Jeff (noche entre semana)

1. Abre la **cola de revisión**: reportes nuevos, clientes sin reporte, esfuerzo alto o bajo sostenido, series incumplidas, preguntas del cliente.
2. Ve el video, los datos del día y la rutina.
3. Responde en el mismo reporte, ajusta peso o ejercicio, o deja una nota.
4. Publica un anuncio para todos si hace falta.

### Jeff (fin de semana)

Publica horarios, ve las reservas, hace las llamadas, arma planes. \[REQ\]

## 5. Reglas de negocio acordadas

- **Acceso por plan.** Sin plan, el cliente no ve nada (ni gratis). Con plan, ve solo lo que ese plan incluye; lo demás aparece bloqueado y borroso con botón de WhatsApp. Jeff asigna el plan manualmente. \[REQ\] La validación vive en la base de datos y el servidor, no solo en la pantalla. \[PROP\]
- **Reporte diario.** Video muy corto de verificación ("aquí estoy, cumpliendo") + comentario + esfuerzo. Es una pieza de la rutina del día, no una conversación. \[REQ\]
- **Borrado de videos.** Los videos de reporte se eliminan solos tras la revisión de Jeff. Propuesta: 24 h después de marcado como visto, con tope de 7 días aunque no se haya visto. \[PROP\] (Jeff solo revisa de noche; un tope de 48 h borraría videos que aún no ha visto.)
- **Mensajes sin chat.** Jeff comenta a un cliente o publica un anuncio para todos en cualquier momento. El cliente escribe **una vez por noche**, vinculado a su reporte, sin hilo ni indicador de "visto". \[REQ\] Para que el cliente no sienta que lo dejan en visto, Jeff responde sobre el mismo reporte, o la app muestra "Jeff lo revisó". \[PROP\]
- **Registro de series.** Repeticiones, peso real y esfuerzo percibido; incluye aproximaciones. Opcional para el cliente, pero se pueden marcar partes como obligatorias. \[REQ\]
- **Rutinas.** Semana con lunes, martes, etc.; cada día con su enfoque (p. ej. pecho), ejercicios con video e imágenes, peso e intensidad. \[REQ\] Jeff parte de **plantillas** y las clona por cliente: editar el cliente no modifica la plantilla. \[REQ/PROP\]
- **Nutrición.** Plan por cliente, estructurado, con plantillas predeterminadas que Jeff ajusta rápido. Sin PDFs. \[REQ\]
- **Agenda.** Jeff publica horarios y el cliente reserva manualmente. \[REQ\] Sesiones presenciales: no por ahora. \[REQ\]
- **Videos de contenido.** Material educativo y técnica en **YouTube** embebido; videos privados en **Bunny Stream**, subidos desde la propia app (Jeff elige "YouTube" o "Privado"). \[REQ\]
- **Fotos de progreso.** Del cliente y de Jeff; privadas, con consentimiento explícito. \[REQ\]
- **Multi-coach.** Cada coach con su entorno, logo y colores. \[REQ\]

## 6. Planes: propuesta inicial

Precios y composición final: **NO DEFINIDO**; los decide Jeff. Propongo empezar con dos planes (más simple de vender y de mantener) y dejar un tercero para después.

| Función | Sin plan | Esencial | Completo |
| --- | --- | --- | --- |
| Rutina y registro de series | Bloqueado | Sí | Sí |
| Reporte diario | Bloqueado | Sí | Sí |
| Progreso (peso, medidas, fotos) | Bloqueado | Sí | Sí |
| Anuncios de Jeff | Bloqueado | Sí | Sí |
| Plan de nutrición | Bloqueado | Bloqueado | Sí |
| Material educativo completo | Bloqueado | Parcial | Sí |
| Llamada inicial | — | Sí | Sí |
| Llamadas de seguimiento | — | NO DEFINIDO | NO DEFINIDO |

Las funciones de cada plan se guardan en la base de datos por coach (no en el código), porque cada coach definirá los suyos. Esto cambia la decisión de DaniFit, que usaba una configuración fija, y se justifica por el modelo multi-coach.

## 7. Módulos y prioridades

| Prioridad | Contenido |
| --- | --- |
| **P0** | Registro y activación de clientes · roles y permisos (RLS) · plantillas y asignación de rutinas · "Hoy" con registro de series y esfuerzo · reporte diario con video · cola de revisión del coach · estados bloqueados por plan |
| **P1** | Onboarding con medidas · agenda y reservas · progreso con gráficas y fotos · nutrición con plantillas · anuncios y notas · borrado automático de videos |
| **P2** | Personaje guía animado · material educativo con YouTube · tema por coach (logo y colores editables) · PWA con avisos |
| **P3** | Cobros a otros coaches · dominios propios · analítica avanzada · IA · app en tiendas |

Lo que sí se prepara desde el día 1 aunque no se muestre: cada dato pertenece a un coach (`workspace_id`).

## 8. Arquitectura

| Capa | Elección |
| --- | --- |
| App | Next.js + TypeScript + Tailwind, PWA instalable |
| Hosting | Netlify (plan gratis permite uso comercial); sin funciones exclusivas de ningún host, para poder cambiar |
| Datos, login, tiempo real | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Fotos | Supabase Storage, bucket privado, URLs firmadas, compresión en el teléfono |
| Videos privados | Bunny Stream; la app pide una subida firmada al servidor, la llave nunca llega al navegador (a verificar en implementación) |
| Videos públicos | YouTube embebido |
| Borrado automático | Tarea programada en Supabase que borra el video en Bunny y marca el registro |
| Mensajes | Tablas propias, sin chat |
| Pagos | Ninguno; enlaces wa.me |

### Costos (verificados el 21-oct-2026; las proyecciones son mías)

- **Netlify gratis**: sin restricción comercial (anuncio oficial de su plan Free). Vigilar el consumo de créditos.
- **Supabase gratis**: 500 MB de base de datos, 1 GB de archivos, 5 GB de transferencia, y **pausa tras 7 días sin actividad**. No incluye copias de seguridad automáticas. Para desarrollo sirve; **con clientes reales y fotos corporales, recomiendo Pro (US$25/mes)**.
- **Fotos**: comprimidas a \~200 KB, 1 GB alcanza para unas 5 000 fotos \[estimación\], suficiente para empezar con 10 a 20 clientes. La transferencia de 5 GB es el límite que vigilar.
- **Bunny Stream**: US$0,01/GB de almacenamiento, entrega desde US$0,005/GB y **mínimo US$1/mes**. Con videos de \~15 s borrados en 24 h a 72 h, estimo US$1 a 3/mes con 20 clientes \[estimación\].
- **Total estimado al lanzar**: unos US$26 a 30/mes (Supabase Pro + Bunny), más dominio. En desarrollo, US$0 a 1.

## 9. Modelo de datos v1 (resumen)

Todas las tablas llevan `workspace_id` y RLS. Jeff = rol coach del espacio; cada cliente solo ve sus filas.

| Dominio | Tablas |
| --- | --- |
| Espacio y usuarios | `workspaces` (nombre, logo, colores, WhatsApp) · `profiles` (rol) · `clients` (estado: pendiente / activo / pausado; plan; consentimiento) |
| Planes | `plans` (nombre, funciones habilitadas) |
| Entrenamiento | `exercises` · `routine_templates` + `template_items` · `assigned_routines` + `assigned_items` (copia por cliente, con series, repeticiones, peso objetivo, video) |
| Ejecución | `workout_logs` (día, esfuerzo 1-10) · `set_logs` (serie, repeticiones, peso real, tipo: aproximación o trabajo) |
| Reporte diario | `daily_reports` (fecha, video, comentario, esfuerzo, visto por coach, respuesta de coach) |
| Progreso | `measurements` (peso, medidas, quién registró) · `progress_photos` |
| Nutrición | `nutrition_templates` · `nutrition_plans` |
| Comunicación | `announcements` (a todos o a uno) · `client_notes` (visibles) · `private_notes` (nunca visibles) |
| Agenda | `availability_slots` (cupo) · `bookings` (creada por cliente o coach) |
| Contenido | `videos` (proveedor: youtube/bunny, visibilidad, caducidad) · `educational_materials` (función de plan requerida) |

La **cola de revisión** es una vista que ordena a los clientes por urgencia (reporte pendiente, días sin reportar, esfuerzo, series incumplidas). Es lo que más valor aporta a Jeff.

## 10. Seguridad y privacidad

- Aislamiento entre clientes y entre coaches garantizado por RLS en la base de datos.
- Fotos y videos privados solo por URL firmada con vencimiento.
- Consentimiento explícito antes de subir fotos corporales.
- `private_notes` nunca se expone al cliente (ni en consultas, ni en registros).
- Validación de plan en el servidor en cada acción.
- Revisión de RLS y rutas antes de lanzar.

## 11. Riesgos

1. **Carga de revisión de Jeff**: con 20 clientes, 20 videos por noche. Mitigación: videos de \~15 s, cola por prioridad, revisión por excepción.
2. **Supabase gratis se pausa** y no tiene copias de seguridad: pasar a Pro antes de clientes reales.
3. **Registro abierto**: cuentas no pagadas. Mitigación: estado Pendiente.
4. **Video como prueba de asistencia** no se puede verificar; es un compromiso, no un control.
5. **PWA**: instalable y con avisos, pero sin presencia en tiendas de apps. Los avisos en iPhone dependen de la versión de iOS (a verificar).
6. **Propiedad intelectual**: los mockups y documentos de DaniFit son referencia; confirmar autorización de reutilización.
7. **Repo público** con la propuesta marcada como confidencial.

## 12. Decisiones abiertas

| Tema | Estado |
| --- | --- |
| Nombre de marca y WhatsApp de Jeff | NO DEFINIDO |
| Planes, precios y funciones por plan | PROP (arriba), a confirmar con Jeff |
| Plazo de borrado de videos (24 h tras visto, tope 7 días) | PROP |
| Orden activación vs. onboarding | INF |
| Personaje guía (diseño, ilustración) | NO DEFINIDO |
| Plantillas iniciales de rutina y nutrición de Jeff | NO DEFINIDO |
| Fecha objetivo de lanzamiento y número inicial de clientes | NO DEFINIDO |

## 13. Hoja de ruta

**Ahora**

- **Fase 0**: aprobar este Blueprint y cerrar las decisiones abiertas.
- **Fase 1, Fundación**: proyecto Next.js, sistema de diseño con los colores de Jeff, esquema de base de datos con RLS, login con roles y estado Pendiente, estados bloqueados por plan.
- **Fase 2, Panel del coach**: clientes, activación y plan, catálogo de ejercicios, plantillas de rutina.
- **Fase 3, Cliente**: Hoy, registro de series, reporte diario con video, cola de revisión.

**Después**

- Fase 4: onboarding con medidas y agenda de llamadas.
- Fase 5: progreso con gráficas y fotos.
- Fase 6: nutrición con plantillas, anuncios y notas.
- Fase 7: material educativo (YouTube) y borrado automático de videos.

**Futuro**

- Tema editable por coach, personaje guía, modelo SaaS para otros coaches, QA y lanzamiento.

## 14. Reglas de trabajo

- Los mockups del repo `coach` (rojo `#F7254B`, oro, negro) son la referencia visual exacta; se pueden mejorar, pero no improvisar.
- Los documentos de DaniFit son referencia técnica; donde chocan con este Blueprint, manda este.
- Cambios importantes pasan por aprobación antes de código.