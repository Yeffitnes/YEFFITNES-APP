# Instrucciones para cualquier asistente (IA o persona)
1. **Empieza por `docs/HANDOFF.md`** (estado actual, reglas fijas, entornos, trampas y pendientes). Luego lee en este orden: `docs/CONTEXT.md` → `docs/AGENT_PLAYBOOK.md` → `docs/PROJECT_STATE.md` → `docs/ARCHITECTURE.md` → `design/README.md` → primeras entradas de `CHANGELOG.md`.
2. Antes de subir: `npx tsc --noEmit`, `npx next lint` y `bash supabase/tests/run_local.sh` (debe decir `TODO OK`).
3. Documenta cada cambio en `CHANGELOG.md` (con cómo revertir). No inventes datos del coach: `NO DEFINIDO`. Copia los mockups de `design/mockups/`. Di siempre qué verificaste y qué no.
4. Producción = Netlify (`main`, plan de pago); pruebas = Vercel (`bloque-hoy`, plan Hobby, misma base de datos). Cualquier cambio de claves, dominios, variables o tareas programadas debe reflejarse en `docs/PASO_A_PRODUCCION.md`.
