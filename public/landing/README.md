# Landing de venta (en `/landing`, temporalmente dentro del sitio de la app)
Sitio estático de una sola página. **No enlaza a la app ni al login**: todos los botones llevan al WhatsApp de Jeff.
- **Cambiar el WhatsApp:** en `index.html`, busca `COACH_PHONE` (y los `href` de respaldo `https://wa.me/57XXXXXXXXXX`). Solo dígitos con indicativo, ej. `573001234567`.
- **Foto de Jeff:** guarda `assets/jeff.jpg` (vertical, ~1200×1500). Si existe, reemplaza el panel con el logo; si no, no pasa nada.
- **Planes y precios:** son PROPUESTA del blueprint (Esencial/Completo), sin precios. Validar con Jeff.
- **Dónde vive hoy:** se sirve desde la misma dirección de la app, en `/landing` (archivos en `public/landing/`, ruta definida en `next.config.mjs`). Cualquier cambio exige mezclar a `main` (un deploy). La app no enlaza a la landing ni la landing a la app.
- **Pendiente:** moverla a su propia dirección (hosting estático aparte o subdominio): `git mv public/landing landing`, quitar la regla `/landing` de `next.config.mjs` y `landing` del `matcher` de `middleware.ts`, y rutas `/landing/assets/…` → `assets/…` en `index.html`.
- Pantallas del teléfono de ejemplo: HTML propio con datos ficticios (no usa datos reales).
