# Landing de venta (aparte de la app)
Sitio estático de una sola página. **No enlaza a la app ni al login**: todos los botones llevan al WhatsApp de Jeff.
- **Cambiar el WhatsApp:** en `index.html`, busca `COACH_PHONE` (y los `href` de respaldo `https://wa.me/57XXXXXXXXXX`). Solo dígitos con indicativo, ej. `573001234567`.
- **Foto de Jeff:** guarda `assets/jeff.jpg` (vertical, ~1200×1500). Si existe, reemplaza el panel con el logo; si no, no pasa nada.
- **Planes y precios:** son PROPUESTA del blueprint (Esencial/Completo), sin precios. Validar con Jeff.
- **Publicar:** en Netlify, un sitio nuevo apuntando a este repo con *Base directory* `landing`, sin comando de build y *Publish directory* `.` (o GitHub Pages). El sitio de la app ignora los cambios de esta carpeta (ver `netlify.toml`), así que editar la landing no gasta créditos del sitio de la app.
- Pantallas del teléfono de ejemplo: HTML propio con datos ficticios (no usa datos reales).
