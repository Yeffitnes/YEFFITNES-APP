# Pruebas de punta a punta (29-oct)
**Todo de una vez (4-nov), solo antes de "fusiona" o de cambiar de chat (no en cada cambio, ver `docs/HANDOFF.md` §2b):** `bash tests/e2e/all.sh` (17 pruebas en orden, cada una con su base; ~20 min, en segundo plano si el entorno corta a los 10 min). `push.js` va aparte.

Levantan la app REAL en local contra un Postgres con todas las migraciones y datos de prueba (Jeff, Camila con rutina y nutrición,
Andrés sin rutina, Laura pendiente) y la recorren con Playwright como coach y como cliente. Sirven para encontrar errores de flujo,
de pantalla y de "hidratación" (React redibujando todo al abrir) que no se ven leyendo el código.
- `bash tests/e2e/run.sh setup` (una vez): base nueva + datos + build de la app apuntando al Supabase local. Requiere Postgres 16.
- `bash tests/e2e/run.sh smoke.js`: abre todas las pantallas (incluidas Revisar y Programas, y el panel de Jeff en celular) y lista errores de consola o de red y desbordes a la derecha. Capturas en `tests/e2e/shots/`.
- `bash tests/e2e/run.sh flows.js`: rutina (series, consejo de peso), agenda (reservar, 10 min), mensajes, revisión de Jeff,
  cancelar desde la ficha, vídeo del día + semana, eliminar material, filtros del catálogo, y que el cliente vea todo.
- `bash tests/e2e/run.sh hydration.js`: abre Hoy 40 veces y avisa si React tuvo que redibujar (error 418).
- `bash tests/e2e/run.sh stuck.js`: ninguna pantalla atascada (correr con `LATENCY=150`).
- `bash tests/e2e/run.sh ficha.js`: el reporte del día se lee en la ficha de Jeff (necesita un reporte de hoy, ver el archivo).
- `bash tests/e2e/run.sh extras.js`: programas, respuestas guardadas, revisar pendientes, resumen semanal, récords, descanso, sin señal (cortándola de verdad), hábitos. Correr sobre base recién creada (`setup`).
- `PAGE=/inicio/progreso bash tests/e2e/run.sh hydration.js`: la prueba de redibujado en otra pantalla.
- `bash tests/e2e/run.sh photos.js`: fotos de progreso (permiso, selector, subir, deslizar). Base recién creada.
- `bash tests/e2e/run.sh offline.js`: abrir la app sin señal, registrar, cerrar, volver a abrir y que se envíe al volver la señal. Base recién creada.
- `bash tests/e2e/run.sh swaps.js`: ejercicios alternativos (Jeff aprueba 2 sustitutos, Camila cambia en el celular, registra, ya no puede volver, Jeff ve "en lugar de"). Base recién creada.
- `push.js` (2-nov): motivos de "Avisar", "Probar avisos" y aviso de cambio de plan. Necesita claves VAPID de prueba en el build y al correr: `node -e 'console.log(require("web-push").generateVAPIDKeys())'`, compilar con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y correr con esa y `VAPID_PRIVATE_KEY`. Para repetirla: `delete from nudges; delete from push_subscriptions; delete from plan_notices;`.
- `review2.js` (2-nov): Revisar pendientes (botones en el celular, filtro) y logros por rutinas completas; `nudge_row.js`: la fila "Jeff te está esperando" se abre con texto y botones. Ver la cabecera de cada uno para el dato que necesitan.
- `away.js` (2-nov): hábitos (ayer, récord, historial para cliente y Jeff) y "Jeff estuvo pendiente de ti". Base recién creada.
- `review3.js` (2-nov): Revisar cliente por cliente (computador y celular), tarjeta del panel legible, "Revisar" segundo en el menú del celular. Base recién creada. `report_time.js`: hora del reporte (ver cabecera).
- `set_order.js` (4-nov): marcar la última serie sin las de arriba no recoge el ejercicio. `week_plan.js`: resumen por la semana real y planes por vencer (computador y celular). `plan_cron.js`: la tarea de la mañana manda el aviso de plan y no lo repite (claves VAPID de prueba, como `push.js`). Base recién creada.
- `bash tests/e2e/run.sh catalog.js`: galería de ejercicios (arranca Compacta; Normal se recuerda por filtro) en celular y computador.
Límites: `proxy.js` simula solo lo mínimo de Supabase (sesión y /rest). No hay Storage (fotos, audios), Realtime, avisos push ni Bunny.
**Después de usarlo, vuelve a compilar normal** (`npx next build` con las variables de siempre) antes de los chequeos para subir.
