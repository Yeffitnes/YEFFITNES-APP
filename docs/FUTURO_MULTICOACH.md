# Futuro: la app como plantilla para muchos coaches (NO es para esta entrega)

Decisión de Cristian (27-oct): la app de Jeff **no se entrega así**, pero se deja pensada para venderla después a otros coaches. Cada coach recibiría su propia app: entra, cambia sus colores y su logo, y puede pedir funciones extra. Esto es **P3**: no se construye ahora, solo se deja la base y este plan para no cerrar la puerta.

## Lo que YA existe (la base)
- **Todo dato pertenece a un espacio** (`workspace_id` en todas las tablas) y las reglas de seguridad (RLS) ya aíslan un espacio de otro. Las pruebas de ataque incluyen a un "otro coach" que no puede ver ni tocar nada de Jeff.
- La tabla `workspaces` ya tiene `name`, `slug`, `logo_url`, `primary_color` y `whatsapp` (hoy sin usar en pantalla).
- Los planes y lo que incluye cada uno se guardan por espacio (`plans.features`), no en el código.

## Lo que faltaría (en orden), cuando llegue el momento
1. **Alta de coaches.** Hoy el registro asigna siempre el primer espacio (`handle_new_user`). Cambiarlo para que el cliente entre al espacio de su coach (por dirección propia, por `slug` o por un código de invitación).
2. **Marca por coach.** Leer `logo_url` y los colores del espacio y aplicarlos como variables CSS (`--neon`, `--rose`, `--ink`) al cargar; cambiar los textos fijos "Jeff" por el nombre del coach; manifiesto de la app instalable (nombre e icono) por espacio.
3. **Panel de marca** para el coach (subir logo, elegir colores con vista previa) con las mismas reglas de contraste y sin verde.
4. **Dominio propio por coach** y su Site URL en Supabase.
5. **Vídeo y avisos por coach**: una biblioteca de Bunny por coach (o carpetas) y revisar si cada uno necesita sus claves VAPID.
6. **Zona horaria por espacio** (hoy se asume Bogotá en cupos, vídeo del día y recordatorios).
7. **Administración**: crear espacios, suspenderlos y, si se vende por suscripción, el cobro a coaches (hoy no hay pagos en la app).

## Regla mientras tanto
No meter nada que dependa de que exista un solo coach más allá de lo que ya está anotado como deuda en `docs/CONTEXT.md` §12. Toda tabla nueva lleva `workspace_id` y su prueba de "otro coach".
