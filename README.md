# YEFFITNES TRAINING — app
Next.js 14 · TypeScript · Tailwind · Supabase · Netlify. Ver `docs/PROJECT_STATE.md`.

## Puesta en marcha local
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa las variables (URL y anon key en Supabase → Project Settings → API).
3. En Supabase → SQL Editor, ejecuta `supabase/migrations/0001_foundation.sql`; crea el espacio de trabajo con el bloque "DATOS INICIALES" del final de ese archivo (con el WhatsApp real); y luego **todas las demás migraciones en orden numérico** (`0002` … `0012`). No edites las ya ejecutadas.
4. En Supabase → Authentication → Providers → Email, desactiva "Confirm email" mientras pruebas.
5. `npm run dev` y abre http://localhost:3000
6. Regístrate con el correo de Jeff y conviértelo en coach con el UPDATE indicado en la migración.

## Despliegue (Netlify)
Importa el repo en Netlify, agrega las 3 variables de entorno y despliega. No subas `.env.local` ni la clave `service_role`.


## Para quien continúe el proyecto
Lee `AGENTS.md` y `docs/` (contexto, manual del agente, estado y arquitectura). Pruebas de seguridad: `bash supabase/tests/run_local.sh`.
