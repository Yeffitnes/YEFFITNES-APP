# Pruebas de punta a punta (29-oct)
Levantan la app REAL en local contra un Postgres con todas las migraciones y datos de prueba (Jeff, Camila con rutina y nutrición,
Andrés sin rutina, Laura pendiente) y la recorren con Playwright como coach y como cliente. Sirven para encontrar errores de flujo,
de pantalla y de "hidratación" (React redibujando todo al abrir) que no se ven leyendo el código.
- `bash tests/e2e/run.sh setup` (una vez): base nueva + datos + build de la app apuntando al Supabase local. Requiere Postgres 16.
- `bash tests/e2e/run.sh smoke.js`: abre todas las pantallas y lista errores de consola o de red. Capturas en `tests/e2e/shots/`.
- `bash tests/e2e/run.sh flows.js`: rutina (series, consejo de peso), agenda (reservar, 10 min), mensajes, revisión de Jeff,
  cancelar desde la ficha, vídeo del día + semana, eliminar material, filtros del catálogo, y que el cliente vea todo.
- `bash tests/e2e/run.sh hydration.js`: abre Hoy 40 veces y avisa si React tuvo que redibujar (error 418).
Límites: `proxy.js` simula solo lo mínimo de Supabase (sesión y /rest). No hay Storage (fotos, audios), Realtime, avisos push ni Bunny.
**Después de usarlo, vuelve a compilar normal** (`npx next build` con las variables de siempre) antes de los chequeos para subir.
