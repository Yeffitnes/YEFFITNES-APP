# YEFFITNES TRAINING — app
Next.js 14 · TypeScript · Tailwind · Supabase · Netlify. Ver `docs/PROJECT_STATE.md`.

## Puesta en marcha local
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa las variables (URL y anon key en Supabase → Project Settings → API).
3. En Supabase → SQL Editor, pega y ejecuta `supabase/migrations/0001_foundation.sql`, luego el bloque "DATOS INICIALES" del final con el WhatsApp real, y después `0002_default_plans.sql` (planes Esencial y Completo).
4. En Supabase → Authentication → Providers → Email, desactiva "Confirm email" mientras pruebas.
5. `npm run dev` y abre http://localhost:3000
6. Regístrate con el correo de Jeff y conviértelo en coach con el UPDATE indicado en la migración.

## Despliegue (Netlify)
Importa el repo en Netlify, agrega las 3 variables de entorno y despliega. No subas `.env.local` ni la clave `service_role`.
