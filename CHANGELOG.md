# CHANGELOG
## 2026-10-27 (noche) - Recorrido: primero el gesto, después señala
- Pedido de Cristian: en cada panel el personaje primero hace el gesto del tema (mancuerna, sentadilla, planilla, cronómetro, libro, celular) y a los 2,6 s señala el panel en el menú, que es lo que queda si el cliente se demora leyendo.
- Archivo: `Onboarding.tsx`. Revertir: restaurar del commit `e1c412d`.

## 2026-10-27 (noche) - Recorrido con un gesto distinto en cada panel
- **Poses nuevas del personaje:**
  - Planilla (`clipboard`): la sostiene y mira.
  - Cronómetro (`stopwatch`): lo levanta y la aguja gira.
  - Celular (`phone`).
  - Libro (`study`): lee con la cabeza inclinada.
  - Señalar abajo con la mano izquierda (`down-left`).
- **Recorrido (pedido de Cristian):**
  - En cada panel primero señala y a los 2 segundos cambia al gesto del tema.
  - Hoy: curl con mancuerna. Mi plan: sentadilla. Agenda: planilla. Progreso: cronómetro. Material: libro. Mensajes: celular.
  - En el celular, para los paneles de la izquierda (Hoy, Plan, Agenda) el personaje va a la izquierda y señala con la mano derecha. Para los de la derecha (Progreso, Material) se pasa al otro lado y señala con la izquierda.
  - Bienvenida: saluda. Punto de partida: saca músculo. Llamada: celebra.
- **Error corregido:** si el panel a señalar no se encontraba (por ejemplo, Mensajes), la burbuja del recorrido quedaba fuera de la pantalla y no se podía tocar "Siguiente". Ahora se centra bien.
- Probado en un celular simulado (390 px) recorriendo los 6 paneles.
- Archivos: `Guide.tsx`, `Onboarding.tsx`, `portal.css`. Revertir: restaurar del commit `b1adc17`.

## 2026-10-27 (noche) - Personaje sin saturar
- Pedido de Cristian: dentro de los paneles vuelve **solo la carita** ("Falta poco" y "Día completado").
- El cuerpo completo queda para:
  - La bienvenida y el recorrido, que cambian de pose en cada paso.
  - El aviso "Primer paso: agenda tu llamada".
  - La pantalla de notificaciones.
- **Nuevo:**
  - En la tarjeta "Próxima sesión" de Hoy, el personaje saluda pequeño en la esquina cuando hay una sesión reservada.
  - Al confirmar una reserva en Agenda, celebra junto al mensaje "Reservaste el…".
- Archivos: `LockedPanel.tsx`, `DayDone.tsx`, `HoySide.tsx`, `AgendaClientView.tsx`, `portal.css`. Revertir: restaurar del commit `aaaaca2`.

## 2026-10-27 (noche) - El personaje reacciona a lo que muestra
- Pedido de Cristian: que el personaje use el gesto que va con cada momento.
- **Bienvenida:**
  - Saluda al entrar, saca músculo en "Tu punto de partida" y celebra en "Agenda tu llamada".
- **Recorrido:**
  - En cada panel primero señala el menú y, a los 2 segundos, hace el gesto del tema.
  - Hoy: curl con mancuerna. Mi plan: saca músculo. Agenda: saluda. Progreso: sentadilla. Material: sigue señalando. Mensajes: saluda.
- **Resto de la app:**
  - Paneles "Falta poco": rutina con mancuerna, nutrición tomando agua y reporte señalando el botón.
  - "Día completado": el personaje celebra.
- Archivos: `Onboarding.tsx`, `LockedPanel.tsx`, `DayDone.tsx`, bloque "Día completado con el personaje" en `portal.css`. Revertir: restaurar esos archivos del commit `0932f4d`.

## 2026-10-27 (noche) - Personaje v3: ropa estilo ilustración
- Siguiendo la imagen de referencia de Cristian:
  - Contorno negro en toda la ropa.
  - **Chaqueta** abierta con capucha (forro rojo), franjas rojas técnicas, cordones de capucha con puntas rojas, mangas con franja y puños y borde acanalados.
  - **Camiseta** interior de malla con escudo "Y" y cuello rojo.
  - **Pantalón** deportivo ancho y recto, con doble franja roja, pliegues y pretina acanalada con cordón.
  - **Tenis** más robustos: suela blanca gruesa, capellada roja y cordones.
  - Reloj rojo.
- La cabeza y la cara no cambian; todas las poses y animaciones siguen funcionando.
- Archivo: `components/portal/Guide.tsx` (`Torso`, `Arm`, `Leg`, `Hips`, `Shoe`). Revertir: restaurar `Guide.tsx` del commit `4b0ab93`.

## 2026-10-27 (noche) - Personaje: jogger holgado
- Pedido de Cristian: un jogger con más estilo y algo holgado.
  - Muslo ancho que se angosta hacia el tobillo, con tiro un poco bajo.
  - Puño elástico acanalado recogido sobre el tenis.
  - Pliegues en muslo y pantorrilla, franja roja lateral, bolsillos.
  - Pretina con cordón blanco de puntas rojas.
- Color gris carbón (antes casi negro, se perdía contra la camiseta).
- La sentadilla y el salto siguen funcionando: el jogger se dobla con la rodilla.
- Archivo: `components/portal/Guide.tsx` (`Leg`, `Hips`). Revertir: restaurar `Guide.tsx` del commit `b6d5f54`.

## 2026-10-27 (noche) - Personaje guía v2
- Mezcla del primer personaje con la propuesta de Cristian.
  - **Se conserva del primero:** la cabeza con solo la cinta, los ojos blancos, las mejillas y la sonrisa fija; al hablar la sonrisa solo se mueve un poco, no se abre.
  - **Se toma de la propuesta:** ropa deportiva (camiseta con cuello en V, franjas y escudo "Y", jogger con franja), codos y rodillas articulados, tenis blancos y rojos, reloj y accesorios.
  - **Se quitó:** que siga el ratón, la boca que se abre, el moño de la cinta y los colores fuera de la marca (cian y verde).
- Poses nuevas además de las anteriores: saca músculo (`flex`), curl con mancuerna (`workout`), toma agua (`hydrate`) y sentadilla (`squat`, con los tenis fijos en el piso). El saludo ahora mueve el antebrazo, y los brazos levantados ya no se esconden detrás de la cabeza.
- Archivos: `components/portal/Guide.tsx` (reescrito, misma forma de uso) y el bloque "Personaje guía v2" de `portal.css`.
- Revertir: restaurar ambos del commit `3021d90`.

## 2026-10-27 (noche) - Tarjetas que se pliegan, plan junto al nombre y SQL de cuentas de prueba
- **Hoy (cliente):** al terminar el entrenamiento, la tarjeta se pliega en un resumen: rutina completada, series, esfuerzo y el comentario de Jeff si hay. "Ver detalle" la despliega y "Editar" la abre para cambiarla; "Plegar" la vuelve a cerrar. Lo mismo con la nutrición de hoy cuando todas las comidas están marcadas.
- **Ficha del cliente (Jeff):** el plan ya no está escondido en Resumen. Sale arriba, junto al nombre: un botón "Plan Esencial ▾" que se cambia con dos toques. Si el cliente no tiene plan, el botón sale resaltado como "Asignar plan" y dice cuándo pidió acceso. Resumen queda más corto.
- **`docs/SQL_CUENTAS.md`:** SQL para **reiniciar** una cuenta como recién registrada y para **borrar** una cuenta. Probados en la base local; no tocan la cuenta del coach.
- Archivos: `HoyView.tsx`, `HoySide.tsx`, `ClientFicha.tsx`, bloques nuevos al final de `portal.css` y `coach.css`. Sin migración.
- Revertir: restaurar esos archivos del commit `1d73c83`.

## 2026-10-27 (noche) - Rango de repeticiones con sugerencia de peso
- Decisión de Cristian: las series son fijas y las repeticiones pueden ser un **rango**. Jeff lo escribe en la rutina como "8-12" (o "8 a 12"). Sin migración: la app entiende el texto.
- **Cliente:**
  - En cada ejercicio con rango ve la regla: "Rango 8 a 12. Si pasas de 12, sube el peso; si no llegas a 8, bájalo".
  - Al guardar una serie fuera del rango le sale un consejo una sola vez (el de la última serie), sin bloquear nada.
  - Con rango, la casilla de repeticiones ya no viene llena: escribe lo que hizo de verdad.
- **Jeff:** en la revisión del entrenamiento (pestaña Hoy de la ficha e historial), bajo cada ejercicio sale "Recomendado: subir el peso" o "bajar", con el motivo y un botón "Subir a 62,5 kg" que cambia el peso del plan del cliente. Él decide.
- **Reglas (PROPUESTA, en `lib/progression.ts`):**
  - Subir: la mitad o más de las series pasaron del máximo, o todas llegaron al máximo, o el esfuerzo fue 4/10 o menos sin quedarse corto.
  - Bajar: la mayoría de las series quedó bajo el mínimo.
  - Estar en los extremos del rango (8 o 12) está bien.
  - Pasos de peso: 2,5 kg, o 1 kg si el peso es menor de 20 kg.
- Revertir: borrar `lib/progression.ts` y restaurar `HoyView.tsx`, `RecentWorkouts.tsx`, `RoutineForm.tsx` y `lib/queries.ts` del commit `41c944f`; quitar los bloques "Rango de repeticiones" de `portal.css` y "Sugerencia de peso" de `coach.css`.

## 2026-10-27 (noche) - Notificaciones sí o sí, primera llamada obligatoria y personaje guía con cuerpo
- **Notificaciones:** se revisó por qué no salió la pantalla en el teléfono de Cristian: ese teléfono ya tenía avisos activados (de otra cuenta), así que la app los pasa a la cuenta nueva y no pide nada; es lo correcto. Se cerraron los huecos:
  - Mientras la app revisa, no se puede tocar nada.
  - iPhone o Android en el navegador sin la app instalada (ahí no hay avisos): ahora sale "Instala la app para seguir", con los pasos.
  - Avisos activados en el teléfono: se asocian siempre a la cuenta que entra.
  - El cliente ya no puede apagar los avisos desde el menú de arriba.
  - Probado en el computador con 5 casos simulados (celular nuevo, avisos bloqueados, iPhone sin instalar, teléfono con avisos ya activos y computador sin soporte).
  - **Error encontrado y corregido antes de subir:** la primera versión de este cambio rompía el portal al cargar en el servidor.
- **Primera llamada (decisión de Cristian):** todo cliente agenda primero su llamada con Jeff; la rutina y la nutrición llegan después.
  - La bienvenida lo explica en 3 pasos y termina en "Elegir mi horario", sin "Más tarde". "Saltar" lleva directo a ese paso.
  - Mientras no haya agendado ni tenga rutina, arriba sale "Primer paso: agenda tu llamada con Jeff".
  - Hoy, Mi plan, Nutrición y el Reporte muestran el panel **"Falta poco: Jeff creará tu rutina/nutrición para ti"**: mismo diseño del candado, sin candado. Muestra "Agendar mi llamada" o la fecha de la llamada ya agendada.
- **Personaje guía:**
  - Ahora tiene cuerpo, brazos, piernas y tenis.
  - Parpadea, respira, gira la cabeza y mira a los lados.
  - Saluda con la mano (pantalla de avisos, bienvenida y aviso de la llamada), señala el panel del menú en el recorrido y celebra con los brazos arriba en el paso de la llamada.
  - Aparece de un salto en cada paso y los textos entran con animación suave.
  - Su cara sale también en los paneles "Falta poco".
  - Diseño provisional (`components/portal/Guide.tsx`).
- Archivos: `FirstRun.tsx`, `Guide.tsx`, `Onboarding.tsx`, `LockedPanel.tsx` (`PlanWait`, `FirstCallBanner`), `HoyView.tsx`, `HoySide.tsx`, `MiPlanView.tsx`, `ActionsBar.tsx`, `lib/queries.ts` (`useFirstCall`), `app/inicio/layout.tsx`, `portal.css`. Sin migración.
- Revertir: restaurar esos archivos del commit `de32a6f`.

## 2026-10-27 - Documentos y limpieza para la próxima salida a main
- `docs/PRODUCT_BLUEPRINT.md`: copia del blueprint v1 dentro del repo (pedido de Cristian). `docs/BLUEPRINT_GAPS.md` gana las decisiones del 27-oct y la propuesta de rango de repeticiones (sin construir). `docs/FUTURO_MULTICOACH.md`: plan para vender la app a otros coaches (solo planeado).
- `docs/PASO_A_PRODUCCION.md`: migraciones 0032 a 0035, quinta tarea programada (`yeffitnes-videos`) y §10 "Próxima salida a main" paso a paso. `docs/HANDOFF.md` actualizado.
- Se quitó `/zz-test` (página de prueba del micrófono que quedaba publicada).
- Bloqueos: el contenido borroso de los paneles bloqueados se ve un poco más.
- Revertir: borrar los documentos nuevos; restaurar `app/zz-test/page.tsx` del commit `93cebbd`.

## 2026-10-27 - Material: vídeo privado y vídeo del día o de la semana en Hoy
- Jeff elige **YouTube o Privado** al crear un vídeo en Material. El privado se sube desde la app en segundo plano (hasta 15 min), queda como borrador mientras sube y **se publica solo al terminar**. Solo lo ven los clientes cuyo plan incluye ese material.
- La estrella ahora pregunta: **Vídeo del día** (se ve en Hoy hasta la medianoche) o **Vídeo de la semana** (7 días). El cliente ve "Vídeo del día" o "Vídeo de la semana" en Hoy y en Material. Los destacados que ya existían siguen sin vencimiento.
- Un vídeo subido se considera huérfano a las **3 h** (antes 30 min), para no borrar a mitad de camino un vídeo largo de Jeff.
- **Migración `0035_material_private_video.sql` (correrla en Supabase ANTES de subir este código).** Mantiene compatibles las llamadas del código viejo de `main`. Pruebas: nueva `rls_matvideo.sql`; `rls_videodiscard.sql` ajustada a las 3 h.
- Archivos: `MaterialView.tsx`, `MaterialClientView.tsx`, `HoySide.tsx`, `lib/queries.ts`, `lib/upload-video.ts`, `lib/upload-manager.tsx`, `app/api/video/upload-url` y `play` (`?material=`), estilos "Material: vídeo privado" al final de `coach.css`.
- Revertir: ver la cabecera de la migración; restaurar esos archivos del commit `a2cfa31`.

## 2026-10-27 - Notificaciones obligatorias y bienvenida interactiva con personaje guía
- Decisión de Cristian: al entrar, el cliente **tiene que activar las notificaciones** (pantalla que no se puede saltar; si las bloqueó, explica cómo activarlas en iPhone o Android y vuelve a revisar al regresar a la app). Aplica también al cliente sin plan, para que le llegue "Tu plan está activo". Si el teléfono no admite avisos, o aún no hay claves VAPID, no se bloquea.
- Después, con el plan activo, viene la **bienvenida interactiva**: un personaje guía recorre los paneles reales (los ilumina en el menú: Hoy, Mi plan, Agenda, Progreso, Material, Mensajes), y al final pide punto de partida (peso y cintura), **consentimiento de fotos de progreso** y la llamada con Jeff. Se puede saltar.
- El personaje es una **propuesta provisional** en la marca (`components/portal/Guide.tsx`); el diseño definitivo sigue NO DEFINIDO y se cambia solo en ese archivo. Textos = PROPUESTA.
- Archivos: `components/portal/FirstRun.tsx` (nuevo), `Guide.tsx` (nuevo), `Onboarding.tsx` (reescrito), `app/inicio/layout.tsx`, icono `send` en `Icon.tsx`, bloque "Primer arranque" al final de `portal.css`. Sin migración.
- Revertir: en `app/inicio/layout.tsx` volver a `<Onboarding />` en lugar de `<FirstRun />` y restaurar `Onboarding.tsx` del commit `a2cfa31`.

## 2026-10-27 - Cliente sin plan dentro de la app, con candados y "Solicitar acceso"
- Decisión de Cristian: el cliente que se registra **entra a la app** (antes quedaba en una pantalla aparte). Ve todos los paneles con el candado borroso del FeatureGate de DaniFit (en la marca) y arriba un aviso con el botón **"Solicitar acceso a Jeff"**.
- Al pedir acceso, a Jeff le llega un aviso push y en **Clientes** el cliente sale primero con "Pidió acceso · hoy · asígnale un plan". Se puede volver a avisar cada 12 h.
- Cuando Jeff le asigna el plan, al cliente le llega "Tu plan está activo" (una sola vez).
- `FeatureGate` ahora usa el mismo panel bloqueado: sin plan → "Solicitar acceso"; con un plan que no lo incluye → "Hablar con tu coach".
- Hoy, Agenda, Material y Objetivos muestran paneles bloqueados al cliente pendiente; Mi plan y Progreso usan el FeatureGate. Mensajes sigue abierto para el pendiente, solo texto (3 al día), para que Jeff pueda hablarle.
- `/pendiente` queda solo para cuentas **en pausa**.
- **Migración `0034_access_request.sql` (correrla en Supabase ANTES de subir este código).** Columnas nuevas en `clients` (`access_requested_at`, `activated_at`, `activation_notified_at`), `request_access()`, `activation_targets()` y un disparador al activar. Prueba nueva: `supabase/tests/rls_access.sql`.
- Archivos: `components/portal/LockedPanel.tsx` (nuevo), `components/FeatureGate.tsx`, `app/api/access/*` (nuevas), `app/inicio/layout.tsx`, `app/pendiente/page.tsx`, vistas del portal, `ClientsView.tsx`, `lib/queries.ts`, bloque "Bloqueo por plan" al final de `portal.css`.
- Revertir: ver la cabecera de la migración; en `app/inicio/layout.tsx` volver a `if (!client || client.status !== "active") redirect("/pendiente")`; restaurar `FeatureGate.tsx` y `app/pendiente/page.tsx` del commit `0fffddf`.

## 2026-10-27 - Borrado garantizado de los vídeos del reporte
- Reglas nuevas (decisión de Cristian): el vídeo se borra **32 h después de enviado si Jeff no lo ve** y **12 h después de que Jeff lo marca visto**. Antes: 7 días y 24 h.
- **Migración `0033_report_video_expiry.sql` (correrla en Supabase ANTES de subir este código a producción).** Cambia los plazos en `submit_report` y `review_report` (mismas firmas: `main` sigue funcionando), ajusta los vídeos ya subidos y crea las funciones de la tarea programada (validan la clave del cron).
- Nueva ruta `/api/cron/purge-videos`: la llama una tarea programada cada hora y borra en Bunny los vídeos vencidos y los huérfanos aunque Jeff no abra la app. **Hay que programarla** (paso en `docs/PASO_A_PRODUCCION.md` §2). El borrado al abrir Reportes sigue como respaldo.
- Jeff ve en Reportes y en la pestaña Hoy cuándo se borra cada vídeo; al marcar visto le sale "El vídeo se borrará en las próximas 12 horas". El cliente ve la regla en su tarjeta de reporte.
- Prueba nueva: `supabase/tests/rls_videoexpiry.sql` (sin clave o con clave mala no se lista ni se borra nada; un vídeo en uso nunca es huérfano).
- Revertir: ver la cabecera de la migración; borrar `app/api/cron/purge-videos/`; quitar `videoExpiry` y `deleteAfter` de `lib/queries.ts`, `ReportsView.tsx` y `TodayCard.tsx`; desprogramar la tarea (`select cron.unschedule('yeffitnes-videos');`).

## 2026-10-27 - Mensajes del cliente: 3 textos, 1 foto y 1 vídeo al día
- Decisión de Cristian: que no se vuelva un chat. El cliente envía al día (hora de Bogotá) **máx. 3 mensajes de texto, 1 foto y 1 vídeo; nunca audio**. Jeff escribe sin límite (texto, foto, vídeo, audio, YouTube). El reporte diario va aparte y no cuenta.
- Se quitó la regla anterior ("3 sin leer" y "12 al día"): ahora el cupo no se reinicia cuando Jeff lee.
- **Migración `0032_client_message_quota.sql` (correrla en Supabase ANTES de subir este código a producción).** Recrea `send_message` con la misma firma.
- Pantalla de mensajes del cliente: muestra cuánto le queda hoy y apaga Foto o Vídeo cuando ya los usó. Prueba de ataque actualizada en `rls_messages.sql` (incluye que el cliente no puede enviar audio).
- Revertir: volver a ejecutar el bloque `send_message` de `0028_messages_board.sql`; en `ThreadView.tsx` volver a `MAX_UNREAD` (commit `4d1e343`).

## 2026-10-26 - Cruce del blueprint con la app
- Nuevo `docs/BLUEPRINT_GAPS.md`: tabla de qué pide el Product Blueprint v1, qué existe en `bloque-hoy`, qué cambió por decisiones posteriores y qué falta. Solo documentación; se verificó leyendo código y migraciones, sin abrir la app con datos reales.
- Revertir: borrar `docs/BLUEPRINT_GAPS.md`.

## 2026-10-26 - HANDOFF: inventario de lo construido y lo que falta
- `docs/HANDOFF.md` gana la sección 9b (construido, faltante, decisiones de Jeff, deuda técnica y pre-lanzamiento), tomada de `CONTEXT.md` y `PROJECT_STATE.md`. No es una auditoría contra el blueprint. Solo documentación. Revertir: borrar esa sección.

## 2026-10-26 - HANDOFF: dónde está el plano
- `docs/HANDOFF.md` gana la sección 1b (mockups, blueprint, contexto y qué documentos están desactualizados). Solo documentación. Revertir: borrar esa sección.

## 2026-10-26 - Documento de traspaso
- Nuevo `docs/HANDOFF.md` (estado, reglas fijas, entornos Netlify/Vercel/Supabase, vídeos, trampas, pendientes y cómo arrancar un chat nuevo) y `CLAUDE.md` que lo apunta; `AGENTS.md` lo pone primero. Solo documentación.
- Revertir: borrar `docs/HANDOFF.md` y `CLAUDE.md`, y la primera frase añadida en `AGENTS.md`.

## 2026-10-26 - Portal del cliente: sin verde y sin desbordes
- Cliente y coach en celular: ningún elemento puede ensanchar su columna (`:where(.main *){min-width:0}`), que era lo que sacaba las tarjetas de Plan, Nutrición y Agenda por la derecha. No pude abrir esas pantallas con datos reales; solo reproduje el mecanismo en una página de prueba.
- Portal: se quitó el verde. "Reporte enviado" y "Día completado" llevan chip rojo con chulo blanco; "Completado", "Plan activo", sesión confirmada y "Enviado" van en negro/rojo.
- Revertir: borrar el bloque "Sin verde" al final de `portal.css`, la regla `:where(.main *)` de `coach.css`, y volver el color de `.mb-sent` en `messages.css` a `#1C9A5B`.

## 2026-10-26 - Dashboard: tarjetas fuera de pantalla en celular
- Causa: los filtros con desplazamiento de "Seguimiento de hoy" ensanchaban la columna de la cuadrícula. Ahora la cuadrícula usa `minmax(0, ...)` y las tarjetas no pueden ser más anchas que la columna.
- Revertir: borrar el bloque "Dashboard: ninguna tarjeta puede ensanchar la columna" al final de `coach.css`.

## 2026-10-26 - Dashboard: "Seguimiento de hoy"
- La tarjeta "Clientes por revisar" del dashboard se reemplaza por "Seguimiento de hoy": cada cliente activo con tres marcas (Entreno, Nutrición, Reporte) = hecho / falta, filtros (Por escribir, Sin nada hoy, Sin reporte, Sin entrenar, Sin nutrición, Al día) con su conteo, y botón Escribir. Solo cuenta lo que le corresponde a cada cliente: plan de entrenamiento activo, plan de nutrición activo, plan que exige reporte diario. La razón de atención anterior (días sin entrenar, entrenamientos sin revisar) sigue visible bajo el nombre.
- La 5.ª tarjeta ("Por escribirles hoy") lleva a esa tarjeta. Lógica en `lib/followup.ts` (sin migración).
- Revertir: volver a `DashboardView.tsx` y `DashKpis.tsx` del commit `bbb2a19`; borrar `lib/followup.ts` y `FollowUp.tsx`.

## 2026-10-26 - Hoy: "Entrenamientos anteriores" desplegable al final
- Al final de la pestaña "Hoy": lista desplegable de los entrenamientos anteriores (sin el de hoy), con cuántos están sin revisar; cada uno se abre para ver el detalle y revisarlo. `RecentWorkouts` gana las opciones `title`, `skipDate` y `collapsible`.
- Revertir: quitar la línea `<RecentWorkouts ... collapsible />` de `TodayCard.tsx`.

## 2026-10-26 - Hoy: pendientes de días anteriores y entrenamiento revisado
- La pestaña "Hoy" ahora muestra arriba "Por revisar de días anteriores" (entrenamientos completados sin revisar que no son de hoy), cada uno con su detalle, comentario y audio. Antes solo se veía el de hoy y desde el dashboard no se encontraba el de hace 2 días.
- Al guardar la revisión, el entrenamiento se pliega en una línea ("Ya lo revisaste..."), con botón "Ver o editar".
- El icono del reporte sobre la tarjeta oscura es ahora un chip claro (antes oscuro sobre oscuro).
- Revertir: quitar el bloque `oldPending`/`logOpen` de `TodayCard.tsx` y las reglas "Hoy: pendientes..." de `coach.css`.

## 2026-10-26 - Audio en el comentario del entrenamiento + más acentos oscuros
- Jeff puede dejar un audio (hasta 2 min) junto al comentario de un entrenamiento; el cliente lo oye en su pantalla "Hoy". El audio reemplazado o quitado se borra del almacenamiento con la limpieza de mensajes.
- **Migración `0031_workout_comment_audio.sql` (hay que correrla en Supabase ANTES de que funcione esta versión).** Añade `workout_logs.coach_comment_audio`, amplía `protect_coach_columns` (un cliente no puede escribirla) y recrea `review_workout(p_log, p_comment, p_audio)`. Prueba nueva: `supabase/tests/rls_commentaudio.sql` (encontró y cerró que el cliente podía escribir la columna).
- Hoy: reporte diario en tarjeta oscura con botones propios; iconos de marca en cada sección; mensajes con icono por tipo.
- Avatares de cliente en negro con aro rojo (dashboard, clientes, mensajes, reportes); agenda: sesión confirmada en negro; se quitó el verde de estados (Activo, Confirmada, origen en el historial, punto "tiempo real", "Enviado").
- Revertir: ver migración (instrucciones arriba) y el bloque "Acentos negros en clientes, agenda y estados" al final de `coach.css`.

## 2026-10-26 - Ficha del cliente: pestaña "Hoy"
- Nueva primera pestaña "Hoy" (abre por defecto) con lo del día: entrenamiento (con detalle y revisión), nutrición (comidas marcadas), reporte diario (comentario, vídeo, marcar visto) y mensajes de hoy (con vídeo). Cuatro indicadores arriba; lo hecho va marcado en rojo, sin verde. "Resumen" queda como antes, sin mezclar.
- Pestañas en celular: ya no se mueven arriba y abajo; estilo píldora con acento negro. Avatar y primer indicador con acentos negros.
- `components/coach/TodayCard.tsx` (nuevo; sin migración). `RecentWorkouts` exporta `Detail`.
- Revertir: quitar "Hoy" de `TABS` y la rama `tab === "Hoy"` en `ClientFicha.tsx`, y las reglas "Ficha del cliente" al final de `coach.css`.

## 2026-10-26 - Dashboard del coach interactivo
- Las tarjetas de arriba ahora se abren: Clientes activos, Entrenaron hoy (quiénes ya entrenaron y quiénes aún no), Nutrición hoy (quiénes completaron las comidas y a quién le falta), Revisiones pendientes (reportes diarios, mensajes sin leer y entrenamientos sin revisar juntos) y Clientes por revisar. Cada fila lleva a la ficha y tiene botón "Escribir" que abre el chat con ese cliente.
- `components/coach/DashKpis.tsx` (nuevo), `useTodayActivity` y `useNutritionClients` en `lib/queries.ts`. Sin migración: usa tablas existentes (activity_events, nutrition_plans).
- "Revisiones pendientes" antes contaba solo entrenamientos sin revisar; ahora suma reportes y mensajes.
- Revertir: restaurar el bloque `kpi-strip` de `DashboardView.tsx` (commit anterior `59b6f87`) y borrar `DashKpis.tsx`.

## 2026-10-26 - Cancelar subidas y Salir en celular
- Botón "Cancelar" en: lectura del vídeo, subida del reporte, subida de vídeo en mensajes y subida en segundo plano (coach). Cancelar corta la subida y borra el vídeo parcial en Bunny. Código `cancelled` en `lib/upload-video.ts` (`signal`).
- Cerrar sesión en celular: el círculo con las iniciales (junto al logo, cliente y coach) abre un menú con "Cerrar sesión" (`components/ProfileMenu.tsx`).
- Corrección iPhone instalado: el contenido queda debajo de la barra de estado (margen de zona segura arriba). Sin franja ni cabecera oscura (se probó y se descartó).
- Coach en celular: acentos negros como el panel del cliente (botones principales y sección activa en negro con brillo rojo suave; primera tarjeta del dashboard en negro). Extendido a chips de filtro activos (Todos, Pendientes...), pestañas de día de la agenda y "Hoy", conversación activa de la bandeja de mensajes, botones primarios de los diálogos y la tarjeta "Reportes diarios por revisar" del dashboard (`.card-dark`).
- Revertir: quitar el `signal` de `uploadVideo` y los botones; quitar `ProfileMenu` de `app/inicio/layout.tsx` y `app/coach/layout.tsx`; para los acentos, borrar el bloque "Celular" al final de `coach.css`.

## 2026-10-26 - Subida de vídeo en segundo plano (coach)
- El vídeo personalizado de un día se sube desde la raíz de la app (`lib/upload-manager.tsx`, montado en `Providers`): el coach puede cambiar de sección mientras sube. Un indicador fijo muestra el porcentaje, errores y "Listo". Al terminar asigna el vídeo solo.
- Mientras sube: pantalla encendida (Wake Lock, si el navegador lo soporta) y aviso al intentar cerrar la pestaña. No sobrevive a cerrar la app.
- No incluye aún el vídeo adjunto a mensajes (sigue ligado al envío).
- Revertir: en `TrainingTab` volver a `uploadVideo` local con estado `pct` (commit anterior `6719fe3`) y quitar `UploadProvider` de `Providers`.

## 2026-10-26 - Vídeos largos del coach sin recortar
- Coach: hasta 15 min y 1,5 GB, se sube tal cual (sin recorte ni recompresión; Bunny los procesa). Si pasa de 15 min se rechaza con mensaje, ya no abre el recortador (que tarda lo que dura el tramo).
- Archivos: `lib/upload-video.ts`, `TrainingTab`, `ThreadView`.
- Revertir: `MAX_COACH_VIDEO_SECONDS = 300`, `MAX_COACH_VIDEO_MB = 500` y quitar `maxSourceSeconds` en TrainingTab.

## 2026-10-26 - Vídeos del cliente más cortos
- Reporte y mensaje del cliente: máximo 20 s al enviar (antes 30). Se pueden elegir vídeos de hasta 60 s para recortarlos; uno más largo se rechaza al elegirlo, con un mensaje claro. El coach no cambia (hasta 300 s).
- Archivos: `lib/upload-video.ts` (`MAX_VIDEO_SECONDS`, `MAX_SOURCE_SECONDS`), `components/ui/useVideoPick.tsx` (`maxSourceSeconds`), `ReportCard`, `ThreadView`.
- Revertir: `MAX_VIDEO_SECONDS = 30` y quitar `maxSourceSeconds` de las dos llamadas a `useVideoPick`.

## 2026-10-26 - Prueba: selector de galería sin conversión (iPhone)
- `ReportCard`: el selector "Elegir de la galería" acepta tipos concretos (mp4, mov, m4v) en vez de `video/*`, para que el iPhone entregue el vídeo sin convertirlo. Experimento, solo se ve en Vercel hasta fusionar.
- Revertir: volver a `accept="video/*"` en el input `gallery` de `components/portal/ReportCard.tsx`.

Formato: fecha · título · qué y por qué · archivos/SQL · **cómo revertir**. Lo más reciente arriba.

## 2026-10-26 · Vídeos huérfanos: ya no quedan guardados ni gastan cupo (migración 0030)
- Problema: la subida anticipada del reporte creaba un vídeo en Bunny por cada intento; al cambiar de vídeo el anterior quedaba guardado y contaba para el límite de 5 al día ("ya subiste varios vídeos hoy"). Ahora: el vídeo se sube SOLO al enviar el reporte; si se cambia o se quita uno ya subido, o si la subida/el envío falla, se descarta al instante (`/api/video/discard` → Bunny + registro, libera el cupo); y cualquier huérfano de más de 30 min se borra cuando el coach abre Reportes (`/api/video/purge`).
- SQL `0030_discard_videos.sql`: `discard_video_upload`, `due_orphan_videos`, `_video_in_use`. Prueba nueva `rls_videodiscard.sql` (no descarta ajenos ni en uso; solo el coach lista huérfanos). Suite completa "TODO OK"; build compila. Sin probar con Bunny real.
- El reporte muestra una vista previa del vídeo elegido (miniatura, nombre, peso) y un botón para quitarlo.
- Revertir: `git revert` + `drop function public.discard_video_upload(text); drop function public.due_orphan_videos(); drop function public._video_in_use(text);`.

## 2026-10-26 · Se quita el aligerado automático de vídeos
- Los vídeos que caben en el máximo se suben tal cual (sin recomprimir): el aligerado añadía espera y no era necesario. Se mantiene el recorte solo cuando el vídeo se pasa del máximo. El cortador carga solo los metadatos (`preload="metadata"`) para gastar menos memoria con vídeos largos. Revertir: `git revert`.

## 2026-10-26 · Vídeos de galería: la espera ya no puede alargarse sin control
- Reporte de uso: un vídeo de la galería tardaba unos 10 min en quedar listo. Causa no confirmada (puede ser la conversión/descarga de iCloud que hace el propio teléfono al elegirlo, o el aligerado que añadí). Cambios: el aligerado tiene un tope de tiempo (1,6 × la duración + 12 s) y un botón "Subir sin optimizar"; si el vídeo deja de avanzar 8 s se corta solo y se sube el original; abortar ahora sí termina la operación (antes quedaba colgada). La pantalla de carga dice en qué fase va ("Leyendo…", "Optimizando… N %").
- Probado en Chromium: recorte de 6 s en 6,5 s; abortar a los 1,5 s corta en 1,5 s. Sin probar en teléfono real.
- Revertir: `git revert` del commit.

## 2026-10-26 · Hoy: el audio del coach se escucha en la fila del mensaje
- La fila "Mensaje de tu coach" de Hoy decía "Te envió una foto" para los audios. Ahora dice "Te envió un audio" y trae el reproductor dentro de la fila (más el texto, si lo hay). Revertir: `git revert`.

## 2026-10-26 · Menú del cliente otra vez oscuro; "Día completado" sobrio
- Se revierte el menú claro: vuelve el oscuro de marca (fijo a la ventana, con sus detalles). El logo vuelve a `/brand/logo.svg`.
- El aviso "Día completado" (y "Nutrición del día completada") era lo que saturaba el panel Hoy: el bloque negro pasó a una tarjeta blanca con borde fino, icono verde discreto y texto pequeño. Solo CSS al final de `portal.css`.
- Revertir: `git revert` del commit.

## 2026-10-26 · Audios del coach (migración 0029), menú y paneles más sobrios, vídeos pesados
- **Audio (migración 0029, HAY QUE CORRERLA ANTES DE USAR ESTA VERSIÓN):** el coach graba un audio (hasta 2 min) desde Mensajes; el cliente lo escucha en su tarjeta. Columna `messages.audio_path`, bucket privado `message-audio` (solo el coach sube; cada cliente oye los de su hilo), función `send_audio_message` (solo coach), limpieza a las 24 h de leído (como el resto), el tipo "audio" en la bandeja y en el aviso push. Hallazgo: la cabecera `Permissions-Policy` tenía `microphone=()`; ahora `microphone=(self)` (`next.config.mjs`). Pruebas: `rls_audio.sql` (cliente no envía ni sube audio, rutas ajenas, otro coach, Storage por cliente, basura y bandeja) y suite completa "TODO OK". Grabación probada en Chromium con micrófono simulado (3 s, 17 KB); no probada en Safari/iPhone real. El formato es mp4 donde el navegador lo permite, si no webm.
- **Menú lateral del cliente** más claro (fondo rosado muy suave, texto oscuro, fichas de icono, activo rojo) y logo oscuro; **paneles del cliente** con detalles más sutiles (fondo casi plano, pestaña roja pequeña, etiquetas tenues, sin degradado en títulos).
- **Vídeos de la galería:** ahora se ve "Leyendo tu vídeo…" mientras se abre; si dura ≤ 30 s pero pesa más de 30 MB se aligera antes de subir (se graba en tiempo real, máx. 30 s de espera, y sube mucho menos); bitrate 2 Mbps. Si es más largo, se abre el cortador. En iPhone, la espera previa a elegir ("Preparando…") la hace el propio sistema al convertir el vídeo y no se puede acelerar desde la app.
- Revertir: `git revert` del commit. Del audio: `alter table messages drop column audio_path;` + borrar el bucket y las políticas `msgaudio:*` + `drop function send_audio_message` y recrear `_purge_client_messages`/`list_threads` de 0028/0020.

## 2026-10-26 · Menú lateral del cliente: fijo de verdad y con más vida
- Causa probable de que el menú se moviera: `app/globals.css` tenía `html, body {overflow-x:hidden}` (hace del body un contenedor de scroll y rompe `position:sticky`); el arreglo anterior dependía del orden de los CSS. Ahora la regla global usa `body{overflow-x:clip}` y, además, el menú del cliente en escritorio (> 1020 px) es `position:fixed` (no depende de ningún contenedor) con `.main{grid-column:2}`.
- Más vida: línea de color en el borde, separador bajo el logo, etiqueta "Tu espacio", iconos en fichas con el activo en degradado rojo, desplazamiento al pasar el cursor y anillo en el avatar. Solo CSS al final de `portal.css`.
- Probado con una página simulada (scroll de 1200 px: el menú queda en top 0 y el contenido a 236 px); sin probar en el portal real ni en Safari.
- Revertir: `git revert` del commit.

## 2026-10-26 · Cortador de vídeo en un portal, escritorio del cliente con más detalle
- Error: el cortador se dibujaba dentro de la tarjeta del reporte; al estar la tarjeta recortada/animada, en el celular quedaba fuera del recuadro y en escritorio no se veía (parecía que no dejaba subir). Ahora se dibuja directamente en `document.body` (`useVideoPick`). Probado con un contenedor recortado a propósito; sin probar en Safari de escritorio ni en teléfono real.
- Los dos botones del reporte ("Elegir de la galería" / "Grabar ahora") ahora caben en pantallas angostas (cuadrícula de 2 columnas, texto recortado con puntos suspensivos).
- Recorte más robusto: si el navegador niega la reproducción con sonido (Safari) se graba sin audio en vez de fallar; si falla, el mensaje incluye la causa. Se aceptan vídeos sin tipo MIME si la extensión es de vídeo (mp4, mov, m4v, webm…).
- Portal del cliente (solo escritorio, ≥ 861 px; el celular no cambia): fondo con degradados suaves de marca, línea de acento bajo el título, títulos con degradado, pestañas de color en las tarjetas, etiquetas de sección como píldoras, filas rápidas con borde de color por estado y sombras más definidas. Solo CSS (final de `portal.css`).
- Revertir: `git revert` del commit.

## 2026-10-26 · Reporte diario: elegir vídeo de la galería y subida en segundo plano
- El selector del reporte forzaba la cámara (`capture`), por eso no dejaba elegir de la galería. Ahora hay dos botones: "Elegir de la galería" y "Grabar ahora". Si el vídeo se pasa de 30 s se abre el cortador.
- El vídeo empieza a subirse apenas queda listo (ya recortado), mientras el cliente escribe el comentario; "Enviar" solo espera si aún no terminó. Cambiar de vídeo reinicia la subida (el límite de 5 vídeos al día sigue vigente). Sin probar en teléfono real.
- Revertir: `git revert` del commit.

## 2026-10-26 · Recortar vídeos al subirlos (cliente y coach) y Bunny conectado en Vercel
- Si el vídeo se pasa del máximo (30 s cliente / 5 min coach) ya no se rechaza: se abre un cortador dentro de la app (vista previa, dos manijas y arrastre del tramo, máximo respetado) y el tramo se prepara en el teléfono (`lib/trim-video.ts`, canvas + MediaRecorder, sin librerías pesadas; deja ≤ 720p y ~2,5 Mbps, así que también sube más rápido). Pantalla de carga con el logo mientras se prepara. Usado en reporte diario, mensajes y vídeo de rutina del coach (`useVideoPick`, `VideoTrimmer`).
- Probado en Chromium (simulando celular): vídeo de 45 s recortado a 8 s y a 22 s, con audio, de 1080x1920 a 720x1280, de 5,7 MB a 1-3 MB; la interfaz carga y recorta. NO probado en iPhone/Safari ni en Android real (MediaRecorder y mp4 varían por teléfono; si el navegador no puede recortar, se avisa que se recorte en la galería). El recorte tarda lo que dura el tramo (se graba en tiempo real) y la pantalla debe quedarse abierta.
- Bunny: `BUNNY_LIBRARY_ID` y `BUNNY_API_KEY` puestos en Vercel; `/api/video/config` responde `enabled: true`. Netlify pendiente de redesplegar con las variables. El borrado automático de vídeos de reportes ya existe (`/api/video/purge`, al abrir Reportes); el doc de producción lo decía pendiente.
- Revertir: `git revert` del commit (no hay SQL).

## 2026-10-25 · Menú lateral del cliente: oscuro y fijo (escritorio)
- Mismo arreglo de desplazamiento que en el coach (`body{overflow-x:clip}`, `align-self:start`, `100dvh`) y mismo fondo oscuro con degradado de marca; el logo pasó a `/brand/logo.svg` (letras claras). Los enlaces, el estado activo y la tarjeta del cliente usan los colores del menú del coach. Solo escritorio (en celular el menú no se muestra). Probado con una página simulada; sin probar en el portal real.
- Revertir: `git revert` del commit (o quitar el bloque "Menú lateral del cliente" al final de `portal.css` y devolver `logo-claro.svg` en `PortalNav.tsx`).

## 2026-10-25 · Día de descanso en el plan y menú lateral fijo del coach
- Entrenamiento: botón visible "Dejar como día de descanso" junto a "Cambiar rutina de este día" (antes solo había un enlace pequeño abajo). El día se libera al instante; si la base no borra nada, se avisa y se restaura (`useClearDay` ahora comprueba la fila borrada). En la base de pruebas el borrado como coach funcionaba, así que lo anterior podía ser el enlace poco visible o un fallo silencioso; sin comprobar en el sitio real.
- Menú lateral del coach: `html, body{overflow-x:hidden}` convertía el body en contenedor de scroll y rompía `position:sticky`; ahora `body{overflow-x:clip}`, el menú tiene `align-self:start`, `100dvh` y scroll propio. Probado con una página simulada (queda en top 0 tras el scroll). Sin probar en el coach real.
- Revertir: `git revert` del commit.

## 2026-10-25 · Imagen al compartir en Vercel, con etiqueta TEST
- La dirección base ahora usa las variables de Vercel (antes apuntaba a localhost y la imagen no salía). Con `NEXT_PUBLIC_APP_NAME` definida se usa `public/og-test.png` (la misma con la etiqueta TEST); en Netlify sigue `og.png`. Revertir: `git revert`.

## 2026-10-25 · Obligar a usar la app instalada (rama `bloque-hoy`)
- `components/InstallGate.tsx`: si `NEXT_PUBLIC_REQUIRE_INSTALL=1`, en celulares y tablets que NO la tengan abierta como app instalada se muestra una pantalla de la marca con los pasos (iPhone, Android con botón de instalar, navegadores internos de Instagram/WhatsApp). Computador no se bloquea (coach). Es un bloqueo suave, no de seguridad. Apagado por defecto. `NEXT_PUBLIC_APP_NAME` cambia el nombre de la app instalada (para Vercel: "YEFFITNES Test").
- Sin probar en dispositivos reales. Revertir: quitar la variable (basta, no hace falta redesplegar código) y volver a desplegar; o `git revert`.

## 2026-10-25 · Fluidez, mensajes tipo tablón (migración 0028), cargador de marca, iconos (rama `bloque-fluidez`, sin subir a main)
- **Mensajes ya no son un chat:** tablón con redacción arriba y tarjetas abajo. Límites (PROPUESTA): cliente máx. 600 caracteres, máx. 3 mensajes sin leer por el coach, máx. 12 por 24 h. Un mensaje leído se borra a las 24 h; sin leer, a los 30 días. Imágenes/vídeos de mensajes borrados se eliminan del Storage/Bunny (tabla `message_trash`, ruta `/api/messages/purge`, el coach limpia al abrir Mensajes). Imágenes de mensajes comprimidas a 1280 px / 0.75. **Hay que correr la migración 0028 en Supabase antes de probar o fusionar.**
- **Velocidad:** caché de consultas 30 s, `staleTimes` de Next, `prefetch` en todas las navegaciones, precarga en segundo plano de agenda/material/avisos/nutrición/mensajes (`Warmup`), subida de fotos optimista con compresión por `createImageBitmap`, animación de tarjetas más corta, respuesta táctil en botones.
- **Cargador de marca** (`BrandLoader`, logo de Jeff pulsando) en reproducción de vídeos (Bunny y VideoModal).
- **Iconos de marca** en lugar de flechas de texto (‹ › → ← ↑ ↓); deltas ahora con + / −.
- Pruebas: tsc limpio, lint sin errores, suite RLS "TODO OK" (rls_messages adaptada), build compila. Sin probar: dispositivos reales ni flujos autenticados.
- Revertir: `git revert` del commit; en Supabase `drop table message_trash cascade;` y recrear `send_message` de la migración anterior.

## 2026-10-25 · Landing dentro del sitio de la app, en `/landing` (temporal)
- La carpeta `landing/` pasó a `public/landing/` y se sirve en `/landing` (regla en `next.config.mjs`; excluida del `middleware`). Rutas de imágenes ahora absolutas (`/landing/assets/…`). Se quitó el `netlify.toml` de la landing y la regla `ignore` del `netlify.toml` raíz (ya es parte del sitio). Probado en local: `/landing` 200, imágenes 200, `/login` 200, `/inicio` sigue protegido. Sin probar en Netlify/Vercel.
- Pendiente a futuro: moverla a su propia dirección (ver `public/landing/README.md`).
- Revertir: `git mv public/landing landing`, y deshacer los cambios en `next.config.mjs`, `middleware.ts`, `netlify.toml` e `index.html`.

## 2026-10-25 · Producción en Netlify (plan de pago) y pruebas en Vercel
- Decisión: Netlify Personal es la producción (`main`); Vercel Hobby solo prueba (`bloque-hoy`). Nuevo `docs/PASO_A_PRODUCCION.md` con variables, Supabase (Site URL = Netlify), tareas programadas apuntando a Netlify, notificaciones, Bunny, dominio, landing y limpieza. Enlazado desde `AGENTS.md` y `docs/CONTEXT.md`.
- Revertir: borrar el archivo y las dos líneas añadidas.

## 2026-10-25 · Recordatorios a horas fijas (migración 0027; rama `bloque-hoy`)
- Antes: revisión cada 15 min. Ahora: buenos días (7:00), mediodía (12:30), noche (20:00, reporte pendiente) y sesión 1 h antes. `due_reminders(secret, kind, now)`; la ruta `/api/cron/reminders?kind=...` valida el tipo. Un aviso por cliente y tipo al día (`reminder_log`). La revisión de sesiones corre dentro de Supabase y solo llama a la app si hay una reserva en la próxima hora. Textos y horas: PROPUESTA.
- Pruebas: `rls_reminders.sql` ampliada (mañana, mediodía, tipo desconocido). Sin probar: push real.
- Revertir: `drop function public.due_reminders(text, text, timestamptz);` y recrear la de 0023; `git revert`.

## 2026-10-25 · Panel Hoy rediseñado, corrección de "sin sesión reservada", destachar series (migración 0026; rama `bloque-hoy`, sin subir a main)
- **Error corregido (0026):** la política `slots_client_read` (0012) comparaba contra `bookings.id` en vez de `availability_slots.id`; el cliente nunca podía leer el horario de su reserva y Hoy decía "aún no tienes una sesión". Ahora aparece cualquier sesión futura (una semana, un mes…), con "En N días", "Ver sesión" y "Recordarme". Prueba nueva en `rls_agenda.sql`.
- **Destachar series (0026):** `unlog_set()`; tocar el check de una serie ya guardada la deshace (si cambias reps/peso, vuelve a guardar).
- **Orden de Hoy:** saludo + semana (bloque oscuro de marca) primero; luego filas compactas y plegables (mensaje del coach, anuncios, reporte); después la rutina y las tarjetas. Mensaje nuevo = fila resaltada y abierta; ya leído = una línea. Reporte enviado = una línea con check.
- **Reporte:** el vídeo (cuando Bunny está activo) y el comentario son obligatorios; el vídeo dura máximo 30 s (`MAX_VIDEO_SECONDS`). La obligatoriedad del comentario está solo en la interfaz (no en la base de datos).
- **Rutina de hoy:** vídeo grande al estilo DaniFit; si aún no hay vídeo se ve igual, con candado y "Disponible pronto" (en Hoy y en Mi plan). Cada ejercicio muestra series hechas (2/3). El vídeo "no aparecía" porque aún no existe ninguno: sin Bunny el coach no puede subirlo.
- **Bolita viva** (`live-dot`) en Rutina de hoy, Próxima sesión y Objetivo (Objetivo: "Actualizado hace N días"; pasa a dorado si pasan 30 días).
- **Nutrición:** cada comida se pliega (solo el nombre); tocarla muestra qué toca; el círculo marca y desmarca.
- **Color:** tarjeta de nivel, sesión y semana en tonos oscuros con degradado; barra lateral del coach con degradado rojo/dorado y marca activa más visible.
- **Botones principales** (mini-btn, reporte, confirmar, serie hecha, esfuerzo) en negro de marca con brillo rojo, en vez de rojo plano.
- **Entorno de pruebas:** Vercel (Hobby, solo pruebas) despliega la rama `bloque-hoy`; Netlify solo `main`. Mismas variables de entorno en ambos.
- **App descargable (pendiente a propósito):** hoy es una app instalable (PWA) desde el navegador. Subirla a App Store / Google Play sería un envoltorio aparte (cuentas de desarrollador de pago y revisión); decidir después del lanzamiento.
- **Archivos:** `0026_fix_client_slot_read.sql`, `lib/queries.ts`, `lib/upload-video.ts`, `components/portal/{QuickRow,RoutineVideo,HoyView,HoySide,ReportCard,MealChecklist,MiPlanView}.tsx`, `components/ui/Icon.tsx`, `app/inicio/portal.css`, `app/coach/coach.css`.
- **Sin probar:** flujo autenticado completo y teléfono real (solo maqueta renderizada y pruebas de base de datos).
- **Revertir:** `git revert`; SQL: `drop function public.unlog_set(date, uuid, int);` y recrear la política anterior (no recomendado).

## 2026-10-25 · Landing de venta separada (carpeta `landing/`) y nueva entrada de la app (rama `bloque-landing`, sin subir a main)
- **Landing de venta:** `landing/index.html`, sitio estático basado en la landing v3 de DaniFit pero con marca de Jeff (rojo/negro/dorado), sin emojis y con pantallas de ejemplo de la app real (Hoy, Mi plan con nutrición por comidas, Agenda, Progreso). **No enlaza a la app ni al login**: todos los botones van al WhatsApp de Jeff. Se quitaron contadores y testimonios inventados y los precios; los planes Esencial/Completo son PROPUESTA.
- **WhatsApp:** número placeholder `57XXXXXXXXXX` (constante `COACH_PHONE` en `landing/index.html`). Falta el real y la foto `landing/assets/jeff.jpg`.
- **Entrada de la app (`/`):** `app/page.tsx` ahora es una pantalla mínima y premium con solo "Iniciar sesión" (se eliminó la landing anterior con "Crear mi cuenta").
- **Netlify:** `netlify.toml` ignora los cambios que solo toquen `landing/` (no gastan créditos del sitio de la app). La landing se publica como sitio aparte (ver `landing/README.md`).
- **Sin probar:** landing en móviles reales; número de WhatsApp real.
- **Revertir:** borrar `landing/`, `git revert` de `app/page.tsx` y de `netlify.toml`. Sin SQL.

## 2026-10-25 · Nutrición con checks, aviso a Jeff, guía para nuevos, nivel/revisión del plan y "Tiempo real" (migración 0025; rama `bloque-diseno`)
- **Guía para clientes nuevos:** en Hoy, mientras el cliente tenga menos de 2 entrenamientos terminados, una tarjeta explica en 4 pasos cómo registrar series (tocar ejercicio, anotar reps/peso, tocar el check, terminar) y el primer check de serie late. Se puede cerrar ("Entendido", se guarda en el dispositivo).
- **Nutrición interactiva (0025):** tabla `meal_logs` + `log_meal()`. Cada comida de HOY se marca con check (en Hoy y en Mi plan → Nutrición; otros días son de solo lectura). Al marcar todas: "Nutrición del día completada". Aviso de "Día completado" en Hoy cuando está hecho el entrenamiento y la nutrición del día. Nota: si Jeff edita el plan de nutrición del cliente, las comidas se recrean y se pierden las marcas de ese día.
- **Aviso a Jeff:** tabla `activity_events` (training_done / nutrition_done / day_done; un disparador en `workout_logs` crea el de entrenamiento). Push a los dispositivos del coach vía `/api/push/activity` (`push_event_targets`: solo el propio cliente, una vez por evento). En el panel de Jeff: tarjeta **Tiempo real** (cierra el pendiente del blueprint) y avisos en la campana.
- **Mi plan:** tarjeta con **Nivel** (Principiante/Intermedio/Avanzado + "por qué"), **Próxima revisión** y **nota del coach**, definidos por Jeff en la ficha del cliente → Entrenamiento ("Lo que ve el cliente", `set_plan_info`); no se muestran si Jeff no los llena. Vídeo por día (personal "Grabado para ti" / de catálogo / aviso de aún no disponible). En Hoy, la próxima sesión tiene "Recordarme" (alarma de calendario).
- **Pruebas:** `supabase/tests/rls_activity.sql` (14 de 14 suites pasan). **Sin probar:** push real, flujo autenticado completo, móvil real.
- **Archivos:** `supabase/migrations/0025_*.sql`, `lib/queries.ts`, `app/api/push/activity/route.ts`, `components/portal/{MealChecklist,TrainingGuide,DayDone,HoyView,HoySide,MiPlanView}.tsx`, `components/coach/{ActivityCard,PlanInfoForm,DashboardView,TrainingTab}.tsx`, `components/ActionsBar.tsx`, CSS.
- **Revertir:** `git revert` y en Supabase: `drop trigger workout_done_event on workout_logs; drop function _on_workout_done, _close_day, log_meal, activity_feed, unseen_activity, mark_activity_seen, push_event_targets, set_plan_info; drop table activity_events, meal_logs; alter table training_plans drop column level, drop column level_reason, drop column review_on, drop column coach_note;`

## 2026-10-25 · Pulido de diseño: sin emojis, semana coherente y barra inferior (rama `bloque-diseno`, sin subir a main)
- **Sin emojis del sistema:** nuevo `components/ui/Icon.tsx` (iconos de trazo fino de la marca: check, lock, camera, video, play, pin, download, bell, close, dumbbell, chart, calendar). Sustituye 📷🎥▶✕🔒📌✅🔔⬇️🏋️📈📅 en mensajes (adjuntos, chips, reproducir), reporte diario, agenda, material, anuncios, onboarding, bloqueo de plan y el botón ✓ de las series. Los avisos push ya no llevan emoji.
- **Hoy · semana:** el día hecho lleva un check SVG de marca sobre degradado; hoy = contorno con su letra; el resto, neutro. Se eliminó el rojo "Perdido" (marcaba lunes/martes/sábado aunque fueran anteriores al plan o días sin registro) y la leyenda. Los días anteriores al inicio del plan no se marcan.
- **Barra inferior (móvil):** `viewport` propio del portal con `themeColor` blanco (la barra de Safari ya no se tiñe de negro), `padding-bottom` con `safe-area-inset-bottom`, y un relleno blanco bajo la barra por si el navegador deja hueco. No probado en un iPhone real.
- **Archivos:** `components/ui/Icon.tsx`, `components/portal/HoyView.tsx`, `app/inicio/portal.css`, `app/inicio/layout.tsx`, `app/messages.css` y los componentes citados.
- **Revertir:** `git revert` del commit; no hay SQL.

## 2026-10-25 · Clases grupales, "De tu coach", pestañas Mensajes/Agenda en la ficha y landing (migración 0024; en la rama `bloque-grande`)
- **Clases grupales (0024):** `availability_slots.capacity` (1 = individual). Jeff elige "Cupos" al publicar; en su agenda el hueco muestra "3/4 cupos" con los inscritos (se puede quitar a uno) y en Dashboard "Clase grupal: …". El cliente ve "N cupos" y no puede reservar si está lleno. El límite se valida en la base con el hueco bloqueado (dos reservas a la vez no superan los cupos). Suite `rls_groups.sql`.
- **Hoy:** tarjeta "De tu coach" con su último mensaje (del blueprint, "De Daniel"). **Ficha del cliente:** pestañas **Mensajes** (escribirle desde ahí) y **Agenda** (sus sesiones). **Landing pública** en `/` (textos PROPUESTA, sin precios: no están definidos).
- **Revertir:** `git revert` y en Supabase: restaurar `book_slot`/`coach_book_slot`/`list_open_slots` de 0012, `drop index one_confirmed_booking_per_client_slot; create unique index one_confirmed_booking_per_slot on public.bookings (slot_id) where status = 'confirmed'; alter table public.availability_slots drop column capacity;` (si ya hay clases con varios inscritos, primero cancelar las reservas sobrantes).

## 2026-10-25 · BLOQUE GRANDE (rama `bloque-grande`, sin subir a main): mensajes en la app, avisos push, recordatorios, vídeo de rutina, PWA/enlace con imagen y panel (migraciones 0020–0023)
- **WhatsApp eliminado de la app.** Se quitaron `NEXT_PUBLIC_COACH_WHATSAPP`, el botón de Mi plan, el FAB, los enlaces de la agenda, el bloqueo (FeatureGate) y `/pendiente`. Todo se habla dentro de la app: los botones abren **Mensajes** con el texto ya escrito (`/inicio/mensajes?m=…`). `workspaces.whatsapp` queda en la base sin uso.
- **Mensajes (0020):** NO es chat en vivo: bandeja cliente↔coach. Texto + foto (bucket privado `message-images`) + vídeo (Bunny) y, solo el coach, enlace de YouTube. El cliente en "Mensajes" (`/inicio/mensajes`) y el cliente sin plan en `/pendiente` (solo texto). Jeff: `/coach/mensajes` (bandeja con no leídos, buscador, cualquier cliente), badge en el menú, tarjeta en el Dashboard. "Visto", tiempo real (Supabase Realtime) y respaldo cada 60 s. Nadie escribe directo en la tabla: solo `send_message` (máx. 40/hora por cliente, 2000 caracteres, rutas de imagen y vídeos validados por cliente). Seguridad: suite `rls_messages.sql`.
- **Avisos push (0021):** campana en la barra superior (mensajes sin leer, reporte de hoy pendiente, sesión próxima; para Jeff: reportes por revisar, clientes sin plan). Botón para activar avisos en el teléfono (service worker `public/sw.js`, `web-push`, rutas `/api/push/*`). Sin claves VAPID la app funciona y el botón dice "aún no configurados". Solo quien envió un mensaje obtiene los dispositivos del destinatario, una vez (`push_targets`).
- **Recordatorios automáticos (0023, PROPUESTA de horarios):** reporte diario 8 p. m., "hoy toca entrenar" 7–12 h, sesión 1 h antes (cliente y coach). Los dispara un cron de Supabase que llama a `/api/cron/reminders` con una clave; la clave se valida en la base (`due_reminders`) y cada aviso se marca para no repetirse. **Hasta que se configure el cron (ver CONTEXT §6) no se envían.** Suite `rls_reminders.sql`.
- **Alarma de calendario:** cada sesión reservada tiene "🔔 Alarma": descarga un .ics con 2 alarmas (1 día y 1 hora antes) que funciona sin servidor.
- **Vídeo de la rutina (0022):** el de catálogo (YouTube, campo nuevo en la rutina) se copia al día del plan; Jeff puede subir uno **personalizado** por cliente/día (Bunny) que lo reemplaza. En Hoy aparece el teaser "Ver vídeo de la rutina · Grabado para ti" del diseño y el enlace "Ver rutina completa". Suite `rls_dayvideo.sql`.
- **Hoy:** los días de la semana tienen estado y color (hecho con ✓, hoy, perdido, por hacer, descanso) y leyenda; la tarjeta muestra duración y tipo.
- **Panel del coach:** buscador rápido de clientes (⌘K / Ctrl+K) en todas las pantallas, "Sesiones de hoy", aviso si no hay horarios para la próxima semana, mensajes sin leer. **Cliente:** página "Objetivos" (objetivo + peso desde la primera medida).
- **PWA / Android:** manifest completo (id, scope, iconos *maskable*, atajos a Mensajes/Plan/Agenda), botón "Instalar la app" (Android) o instrucciones (iPhone), insignia con el número de mensajes sin leer. **Enlace compartido:** imagen de marca `public/og.png` (1200×630) + metadatos Open Graph/Twitter (`NEXT_PUBLIC_SITE_URL` o la variable `URL` de Netlify definen el dominio).
- **Fluidez:** el hilo de mensajes se precarga, envío optimista del texto (aparece al instante), fotos reducidas en el teléfono, vídeos directos a Bunny por tramos, `sw.js` sin caché (nunca queda una versión vieja), middleware sin pasar por `sw.js`/iconos.
- Verificación: `tsc`, `lint`, `next build`, 13 suites de ataque en base limpia (TODO OK); revisión visual del hilo con datos de ejemplo en 390 px y 1280 px. **NO probado:** Supabase real (Realtime, Storage), Bunny real, push real en un teléfono, cron.
- Archivos: migraciones 0020–0023; tests `rls_messages|dayvideo|reminders.sql`; `lib/{messages,push,push-client,install,ics}.ts`; `components/{ActionsBar}.tsx`, `components/ui/{ThreadView,BunnyModal}.tsx`, `components/coach/{InboxView,QuickSearch}.tsx`, `components/portal/{MessagesClientView,PendingThread,ObjectiveView}.tsx`, `app/api/{push,cron}/*`, `app/messages.css`, `public/{sw.js,og.png,icon-maskable-*.png}`.
- **Cómo revertir:** `git revert` de los commits del bloque y, en Supabase (orden): `drop function if exists public.due_reminders; drop table if exists public.reminder_log, public.app_secrets;` · `drop function if exists public.set_day_video; alter table public.plan_days drop column if exists video_id, drop column if exists video_ref; alter table public.routine_templates drop column if exists video_ref;` (y volver a crear `save_routine` de 5 parámetros y `assign_day` de 0010) · `drop function if exists public.prune_push, public.push_targets, public.save_push_subscription; drop table if exists public.push_subscriptions;` · `drop function if exists public.mark_thread_read, public.unread_messages, public.list_threads, public.register_message_video, public.send_message; drop table if exists public.messages;` (borra los mensajes).

## 2026-10-25 · Nutrición por días, "Hoy" completo, objetivo y pantalla fija en móvil (migraciones 0018–0019)
- **Nutrición por días (0018):** calorías/proteína/carbos/grasas son fijos del plan; las comidas se arman por día (Lun–Dom) o "Todos los días" (se suman). El formulario del coach tiene pestañas por día y **"Copiar este día a…"**. El cliente elige el día en Mi plan → Nutrición. Revertir: `alter table public.nutrition_meals drop column weekday;` y volver a ejecutar las funciones `save_nutrition`/`assign_nutrition` de `0016_nutrition.sql`.
- **Hoy completo (0019):** se agregaron las tarjetas del diseño que faltaban: **vídeo de la semana**, **próxima sesión**, **objetivo actual**, **nutrición de hoy** y **progreso reciente** (peso/cintura con variación y mini gráfica). El coach escribe el objetivo en el Resumen de la ficha. Suite `rls_objective.sql`: ninguno. Revertir: `alter table public.clients drop column objective, drop column objective_at;`.
- **Arreglo oculto:** la tarjeta "Vídeo de la semana" nacía con `opacity:0` (animación del diseño que la app no usa) y no se veía ni en Material ni en Hoy; ahora es visible.
- **Móvil:** el zoom al entrar se debía a campos con letra menor a 16 px (iOS amplía al enfocar) y a que se permitía el pellizco. Ahora: viewport fijo (`maximum-scale=1`, `user-scalable=no`), bloqueo del pellizco en iOS (`NoZoom`), campos a 16 px en táctil, `touch-action: manipulation`, sin scroll horizontal y ventanas con scroll interno y altura máxima 92 dvh (las del portal no tenían). Comprobado en un móvil simulado de 375 px: sin desbordes y campos a 16 px. **Sin probar en un iPhone/Android reales.**
- Nota de accesibilidad: bloquear el zoom impide ampliar el texto con pellizco; se hizo a petición expresa. Revertir: quitar `maximumScale`/`userScalable` de `app/layout.tsx` y `NoZoom`.
- Archivos: `0018_nutrition_days.sql`, `0019_objective.sql`, `rls_objective.sql`, `components/portal/HoySide.tsx`, `NutritionForm|Tab|View`, `MiPlanView`, `HoyView`, `ClientFicha`, `app/layout.tsx`, `components/NoZoom.tsx`, `app/globals.css`, `portal.css`.

## 2026-10-25 · Reporte diario con vídeo, nutrición y onboarding (migraciones 0015–0017)
Un solo lote para gastar un solo despliegue (ver regla de créditos).
- **Reporte diario (0015):** el cliente (con `daily_report` en su plan) ve en "Hoy" una tarjeta para grabar un vídeo corto (cámara nativa del teléfono) y escribir un comentario; el vídeo sube directo del teléfono a Bunny Stream con subida firmada (TUS, reanudable) por `/api/video/upload-url`. Coach: nueva pantalla **Reportes diarios** (cola "sin revisar", reproductor protegido por token, "marcar visto") y aviso en el Dashboard. El vídeo se borra 24 h tras verlo (máx. 7 días); el borrado lo dispara el coach al abrir la pantalla (`/api/video/purge`). Endpoints: `config`, `upload-url`, `play`, `purge`; claves solo en servidor (`lib/bunny.ts`).
- **Seguridad:** el cliente no escribe `daily_reports` directo (solo `submit_report`); solo puede usar vídeos que el servidor registró a su nombre (`video_uploads`, máx. 5/día); no puede editar un reporte ya revisado; el coach solo ve los de su espacio. Suite `rls_reports.sql`: ninguno.
- **Sin Bunny configurado** la app funciona: el reporte se envía solo con comentario y `/api/video/config` responde `enabled:false`. **Nunca se ha probado una subida real.**
- **Nutrición (0016):** plantillas en Catálogo → Nutrición (comidas con texto libre + calorías/macros opcionales). En la ficha del cliente, pestaña Nutrición: asignar plantilla (se **clona**), editar solo para ese cliente, quitar. El cliente lo ve en Mi plan → Nutrición (diseño del mockup) y bloqueado si su plan no la incluye. Suite `rls_nutrition.sql`: ninguno. Además `plans.features` ahora se lee en el coach.
- **Onboarding (0017):** bienvenida de 3 pasos la primera vez (qué hay en la app, peso/cintura iniciales, ir a reservar la llamada); se puede saltar. Los textos son PROPUESTA y el personaje guía es un avatar provisional "J". Suite `rls_onboarding.sql`: ninguno.
- Verificación: tsc, lint, `next build` completo y 9 suites de ataque en base limpia (todo OK); endpoints probados con curl (sin sesión → 401). **No** probado: Supabase real, Bunny real, render en pantalla.
- Archivos: migraciones 0015–0017, tests `rls_reports|nutrition|onboarding.sql`, `lib/bunny.ts`, `lib/upload-video.ts`, `app/api/video/*`, `components/coach/{ReportsView,NutritionView,NutritionTab,NutritionForm}.tsx`, `components/portal/{ReportCard,Onboarding}.tsx`, `MiPlanView`, `HoyView`, `CoachNav`, `CatalogTop`, `lib/queries.ts`, dependencia `tus-js-client`.
- **Cómo revertir:** `git revert` del commit y, en Supabase, en este orden: `alter table public.clients drop column if exists onboarded_at; drop function if exists public.complete_onboarding;` · `drop function if exists public.assign_nutrition, public.save_nutrition; drop table if exists public.nutrition_meals, public.nutrition_plans;` · `drop function if exists public.mark_video_deleted, public.due_report_videos, public.review_report, public.submit_report, public.register_video_upload, public.can_report; drop table if exists public.daily_reports, public.video_uploads;` (borra reportes, nutrición y su historial).

## 2026-10-25 · Regla de despliegues por créditos de Netlify
- Netlify avisó "más del 75 % de créditos". Cada despliegue a producción cuesta 15 de 300 créditos/mes (tope duro: al agotarse el sitio se pausa). Se agregó la sección "Créditos de Netlify" al playbook: un push por función, `[skip ci]` en commits de solo documentación. Revertir: borrar esa sección.

## 2026-10-25 · Anuncios a todos y notas privadas (migración 0014)
- **Anuncios:** tarjeta "Anuncios" en el Dashboard del coach (nuevo, fijar arriba, fecha de vencimiento opcional, quitar). Los clientes activos con `announcements` en su plan los ven al inicio de "Hoy" (máx. 5, fijados primero). **No había mockup:** se usó el estilo de las tarjetas existentes; confirmar con Jeff.
- **Notas privadas:** pestaña de la ficha del cliente (copiada de `coach-clientes`): lista, guardar (Ctrl/⌘+Enter), borrar. El cliente no tiene ningún permiso sobre esa tabla.
- Seguridad: el cliente lee anuncios solo por `list_announcements()` (cuenta activa + plan + vigencia + su espacio); la nota debe apuntar a un cliente del mismo espacio. Suite `rls_notes.sql`: ninguno.
- **Reproductor de vídeo:** enlace "¿No carga? Ábrelo en YouTube" y aviso al coach: los vídeos con música con derechos (p. ej. UMPG) bloquean la inserción; no es un fallo de la app. Usar vídeos propios o que permitan insertar.
- Archivos: `0014_announcements_notes.sql`, `rls_notes.sql`, `run_local.sh`, `lib/queries.ts`, `components/coach/{NotesTab,AnnouncementsCard,ClientFicha,DashboardView}.tsx`, `components/portal/{HoyView,VideoModal}.tsx`.
- **Revertir:** `git revert` del commit y en Supabase: `drop function if exists public.list_announcements; drop table if exists public.announcements, public.client_notes;` (borra anuncios y notas).

## 2026-10-25 · Arreglo: logo invisible en el panel del coach y lista de clientes que no se refrescaba
- **Causa del logo:** al integrar Progreso se copió a `app/coach/coach.css` el CSS completo de un mockup del *portal* (sección `/* progreso */`), con reglas de barra lateral clara que pisaron la oscura del coach; el logo es blanco y quedó invisible. Se quitaron 33 reglas de estructura duplicadas de esa sección (`.sidebar`, `.side-*`, `.main`, `.topbar`, `.card`, `.fab-wa`…). Los estilos propios del tab de progreso del coach se conservan.
- **Prevención:** `design/port_css.py` ya no añade reglas de estructura (`.shell`, `.sidebar`, `.side-*`, `.main`, `.topbar`, `.card`…) si el destino ya las tiene. Regla nueva: nunca portar un mockup del portal al CSS del coach ni al revés sin revisar.
- **Clientes que "no aparecen":** la lista se cacheaba 30 s y no se refrescaba sola; ahora se actualiza cada 45 s y al volver a la pestaña. (El número junto a "Clientes" del menú lo calcula el servidor al cargar la página: se actualiza al recargar.)
- Revertir: `git revert` del commit (sin SQL).

## 2026-10-25 · Material educativo (migración 0013)
- **Coach `/coach/material`** (copiado de `coach-material.html`): rejilla de contenidos, búsqueda y filtros, crear/editar/eliminar, borrador o publicado, "quién lo ve" (todos los planes con material o solo plan completo), estrella de **vídeo de la semana** (solo uno; debe ser vídeo publicado de acceso básico) y "Visto por N".
- **Cliente `/inicio/material`** (copiado de `portal-material.html`): vídeo de la semana, búsqueda, filtros, etiqueta "Nuevo" (14 días sin abrir), lectura de artículos y reproductor de vídeo. Lo que el plan no incluye se ve **bloqueado con título** y lleva a WhatsApp; su contenido nunca sale de la base (se abre solo con `open_material`).
- Seguridad: el cliente NO tiene permisos sobre las tablas; lista y abre solo por funciones que validan cuenta activa, espacio y plan. Suite `rls_material.sql` (otro coach, lectura directa, contenido premium con plan Esencial, cliente pendiente, destacado, vistas): ninguno.
- **Pendiente:** documentos PDF (necesitan almacenamiento) y mostrar el vídeo de la semana en "Hoy".
- Archivos: `supabase/migrations/0013_material.sql`, `supabase/tests/rls_material.sql`, `run_local.sh`, `lib/queries.ts`, `components/coach/MaterialView.tsx`, `components/portal/MaterialClientView.tsx`, rutas `app/coach/material` y `app/inicio/material`, menús, CSS.
- **Cómo revertir:** `git revert` del commit y en Supabase: `drop function if exists public.set_featured_material, public.open_material, public.list_materials, public.material_unlocked; drop table if exists public.material_views, public.materials;` (borra el contenido publicado).
- Sin ver renderizado: probar en el navegador tras el deploy.

## 2026-10-24 · Documentación para continuidad y herramientas de agente
- Reescritos `docs/CONTEXT.md`, `docs/ARCHITECTURE.md` (v3) y `docs/PROJECT_STATE.md` como foto actual (el historial vive aquí). Nuevo `docs/AGENT_PLAYBOOK.md` (cómo trabajar, verificar, entregar, integrar parches, errores ya cometidos). `AGENTS.md` y READMEs actualizados.
- Nuevas herramientas: `supabase/tests/run_local.sh` (todas las migraciones + suites de ataque; devuelve error si algo falla) y `design/port_css.py` (portar CSS de un mockup sin duplicar). Ambas probadas: `TODO OK`; el portador no añade reglas al repetirse.
- Revertir: borrar esos archivos; no afecta a la app.

## 2026-10-24 · Revisión del parche "Auditoría 2": ajustes al integrarlo
- Se integró tal cual el parche de velocidad y flujo, con tres ajustes: (1) el "✓ de un toque" ya no guarda en silencio lo planeado: las casillas de repeticiones y peso **muestran** los valores planeados (editables) y se guarda lo que se ve, porque Jeff revisa datos "reales"; (2) borrar una foto elimina **primero el archivo** y luego la fila (antes podía quedar un archivo huérfano al que el coach aún tendría acceso); (3) asignar una rutina a varios días refresca la pantalla aunque falle uno (puede haber quedado guardado en otros).
- **Aviso para la fase de vídeo:** `next.config.mjs` fija `Permissions-Policy: microphone=()`; al construir el reporte diario con vídeo hay que cambiarlo a `microphone=(self)` o la grabación saldrá sin sonido.
- Sin SQL nuevo (siguen 0001–0012). Revertir: `git revert`.

## 2026-10-24 · Auditoría 2: velocidad y flujo (sin SQL nuevo)
- **Auditoría de seguridad:** las 11 migraciones + `rls.sql` + `rls_progress.sql` pasan en una base limpia ("ataques: ninguno"). No se encontraron agujeros nuevos.
- **Velocidad (portal):** el layout ya lee al cliente y su plan en el servidor y los pasa a la caché: "Hoy" ya no espera ese viaje y plan+registros cargan en paralelo. Se precargan Mi plan y Progreso mientras se ve Hoy. En el coach se precargan también revisiones recientes y clientes con plan (el dashboard abre sin esperas).
- **Velocidad (series):** guardar una serie ya no vuelve a leer 90 días de registros; es instantáneo (optimista) y solo se relee si falla.
- **Flujo del cliente:** Hoy abre solo el primer ejercicio pendiente; ✓ guarda lo planeado (reps y peso objetivo) sin escribir nada; Enter guarda; al terminar las series de un ejercicio pasa al siguiente; Espacio abre/cierra un ejercicio.
- **Flujo del coach:** asignar una rutina a VARIOS días a la vez (semana fija en un paso).
- **Progreso:** se puede eliminar una foto (el texto de consentimiento lo prometía y no había botón); puntos de la gráfica ya no se deforman; aviso si la imagen no se puede procesar.
- **Acceso:** el login lleva directo al panel según rol; si el registro exige confirmar correo, se avisa en vez de rebotar al login. El aviso (toast) ya no se corta antes de tiempo.
- **Seguridad web:** cabeceras (nosniff, no-iframe, HSTS, referrer, permisos: solo cámara propia) en `next.config.mjs`.
- Código: `lib/queries.ts` (fetchers exportados), `components/Providers.tsx`, `app/inicio/layout.tsx`, `HoyView`, `TrainingTab`, `ProgressPanels`, `app/login/*`, `next.config.mjs`.
- Revertir: `git revert` del commit (no hay SQL).
- Sin verificar en pantalla: el entorno de pruebas no puede compilar con las fuentes de Google; se comprobó con `tsc` y lint. Probar en el celular tras el deploy.

## 2026-10-24 · 4348e14 · Progreso: mediciones y fotos privadas
- Portal `/inicio/progreso` copiado de `design/mockups/portal-progreso.html`: resumen por métrica con variación, gráfica con líneas activables, historial (Tú / Coach), comparador Antes/Después y galería. Registro de medición en modal (peso, cintura, caderas, pecho, brazo, pierna; si ya registraste hoy, se actualiza).
- Fotos: se comprimen en el teléfono (máx. 1600 px), se guardan en un bucket **privado** y se muestran con enlaces que vencen. Antes de la primera foto el cliente acepta un consentimiento (`clients.image_consent_at`).
- La ficha del coach tiene la pestaña **Progreso** (solo lectura) con lo mismo.
- SQL: `0008_progress.sql` (`measurements`, `progress_photos`, `client_has_consent`, `give_image_consent`, bucket `progress-photos` y sus políticas; el plan debe incluir `progress`).
- Código: `components/portal/ProgressPanels.tsx`, `ProgressView.tsx`, `lib/image.ts`, `lib/queries.ts`, `PortalNav.tsx`, `ClientFicha.tsx`.
- Revertir código: `git revert`. Revertir SQL: `drop table progress_photos, measurements; drop function give_image_consent, client_has_consent;` y borrar las políticas `fotos: …` de `storage.objects` y el bucket (esto borra mediciones y fotos).
## 2026-10-24 · Agenda: Jeff publica horarios, el cliente reserva
- Coach `/coach/agenda` (mockup `coach-agenda`): semana LUN–DOM, huecos libres y sesiones confirmadas, publicar disponibilidad en bloques (desde–hasta con duración de 30/45/60 min), agendar a un cliente, cancelar una sesión y quitar un hueco. Cliente `/inicio/agenda` (mockup `portal-agenda`): calendario semanal, filtro por tipo, "Tu selección", "Tus próximas sesiones", cancelar y aviso opcional por WhatsApp.
- **Reglas en la base de datos (no en la pantalla):** un hueco confirmado solo admite una reserva aunque dos personas pulsen a la vez; el cliente no ve datos de otros clientes; sin escritura directa del cliente (solo funciones).
- **Reglas PROPUESTAS, no definidas por Jeff (confirmar con él):** una reserva futura por cliente a la vez; el cliente cancela hasta 24 h antes (el coach siempre); tipos de hueco "Llamada inicial" y "Seguimiento"; sesiones individuales (sin clases grupales ni presenciales). Cambiarlas = editar las funciones `book_slot` y `cancel_booking`.
- SQL: `0012_agenda.sql` (`availability_slots`, `bookings`, `list_open_slots`, `book_slot`, `coach_book_slot`, `cancel_booking`, trigger que impide cancelar un hueco con reserva). Pruebas: `supabase/tests/rls_agenda.sql` (resultado: ninguno). Omitido por no tener datos: "agenda del día" en el dashboard y recordatorios.
- Zona horaria: se asume un solo huso (el de Jeff y sus clientes); los horarios se guardan en UTC y se muestran en la hora del dispositivo.
- Revertir código: `git revert`. Revertir SQL: `drop table bookings, availability_slots cascade; drop function list_open_slots, book_slot, coach_book_slot, cancel_booking, slot_cancel_guard;` (borra reservas).

## 2026-10-24 · Integración del parche "Mi plan" + endurecimiento de Progreso (0011)
- Se integró el parche de otra sesión de Claude (Mi plan, endurecimiento RLS, metadatos de día, logo). Choque de numeración: su `0008`/`0009` pasaron a **`0009_harden_client_writes`** y **`0010_plan_day_meta`** porque `0008` ya era Progreso.
- Se **ejecutaron** las pruebas de ataque en un Postgres 16 desechable con las 11 migraciones desde cero: `RESULTADO ATAQUES: ninguno`. Sin la 0009 la prueba falla (detecta el hueco).
- Hallazgo propio: las políticas de mi `0008_progress` tenían los mismos huecos (medición o foto con el espacio de OTRO coach, moverla de espacio, foto apuntando a la carpeta de otro cliente). Corregido en **`0011_harden_progress.sql`**; nuevas pruebas `supabase/tests/rls_progress.sql`; `stub_auth.sql` ahora simula `storage`.
- Orden de SQL en Supabase: `0009`, `0010`, `0011`. **El código nuevo pide columnas de 0010: ejecutar el SQL antes de probar.**
- Revertir: `git revert` de los commits; SQL 0011: restaurar las políticas `me_client_ins`, `me_client_upd`, `ph_client_ins` de 0008 (reabre los huecos).

## 2026-10-24 · Mi plan (portal), endurecimiento de seguridad y logo
- **Seguridad (0009):** las políticas de escritura del cliente permitían, vía API pública, registrar series en planes/clientes ajenos o sin plan de entrenamiento. Ahora exigen `client_id = my_client_id()`, feature `training`, mismo workspace y pertenencia de `plan_day`/`workout_log`/`plan_item`. Pruebas de ataque reproducibles en `supabase/tests/` (resultado esperado: "ninguno").
- **Mi plan** en `/inicio/plan` según `design/mockups/portal-mi-plan.html`: semana LUN–DOM, detalle del día, pestaña Nutrición bloqueable, estados carga/vacío/error. Omitido por no tener datos aún: vídeo de rutina, próxima revisión, nivel, nota del coach.
- **0010:** `plan_days.est_minutes` y `category` (copiados de la plantilla al asignar, porque el cliente no lee plantillas). En Hoy: botón "Ver técnica" con vídeo de YouTube si el ejercicio lo tiene.
- Logo: texto invisible en el menú del coach corregido (`/brand/logo.svg`; portal usa `logo-claro.svg`). Fix de desbordamiento horizontal en móvil.
- Código: `components/portal/{MiPlanView,VideoModal}.tsx`, `lib/week.ts`, `app/inicio/plan/`, `lib/queries.ts`, `portal.css`.
- Ejecutar en Supabase SQL Editor, en orden: `0009` y luego `0010` (la numeración original del parche era 0008/0009; se renumeró porque 0008 ya era Progreso).
- Revertir código: `git revert`. Revertir SQL 0010: `alter table plan_days drop column est_minutes, drop column category;` y restaurar `assign_day` de 0005. 0009: restaurar las políticas `wl_client_*`/`sl_client_*` de 0006 (solo si es imprescindible: reabre la brecha).

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
