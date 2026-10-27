# Claude

Lee `AGENTS.md` y `docs/HANDOFF.md` antes de hacer cualquier cosa. Reglas clave: sin emojis, sin verde, acentos negros con brillo rojo suave; sube a `bloque-hoy` (Vercel, pruebas) y fusiona a `main` (Netlify, producción) solo cuando Cristian diga "fusiona"; antes de subir corre `npx tsc --noEmit`, `npx next lint`, el build y `bash supabase/tests/run_local.sh`; cada cambio en `CHANGELOG.md` con cómo revertirlo; di siempre qué verificaste y qué no.
