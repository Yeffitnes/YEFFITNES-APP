# AGENT PLAYBOOK — cómo trabajar en este proyecto
Para cualquier agente (Claude u otro) o persona que continúe. Léelo junto con `docs/CONTEXT.md` (qué se construye y por qué) y `docs/PROJECT_STATE.md` (dónde vamos). Última actualización: 24-oct-2026.

## 0. Con quién trabajas
**Cristian Santiago Gómez Romero**: líder de producto y desarrollador freelance. No es senior ni usa la terminal; trabaja con la web de GitHub, el SQL Editor de Supabase y el panel de Netlify. Dicta por voz: hay errores de transcripción (ej. "Netflix" = Netlify, "Danny Fit" = DaniFit, "Jeff Fitness" = YEFFITNES TRAINING); interpreta con criterio y confirma lo dudoso.
- Español, claro, **paso a paso con clics concretos** ("abre X → pulsa Y"). Nunca asumas que sabe un comando.
- **Honestidad sobre lo verificado.** Distingue siempre: "compila" ≠ "pasa pruebas de seguridad en una base de prueba" ≠ "lo vi funcionando en su Supabase". Nunca digas que probaste una pantalla que no viste. Reconoce tus errores (el 24-oct se rompieron tres archivos por una expresión regular; se detectó, se restauró y quedó documentado).
- No seas complaciente: si algo es mala idea, caro o riesgoso, dilo. Protege el alcance (P0 > P1 > P2 > P3).
- **No inventes** reglas, precios ni datos de Jeff: márcalos `NO DEFINIDO`, o `PROPUESTA` si los sugieres.

## 1. Al empezar una sesión
1. Lee `docs/CONTEXT.md`, `docs/PROJECT_STATE.md`, las primeras entradas de `CHANGELOG.md` y `design/README.md`.
2. `git log --oneline | head` y compara con el remoto: **Cristian a veces usa otra sesión de Claude (Claude Code) que entrega parches `.patch`** o hace cambios directos en GitHub (ej. limpió `.env.example`). Nunca asumas que tu copia local es la última: haz `fetch` antes de trabajar.
3. Pregunta solo lo imprescindible; el resto, asúmelo declarándolo en una línea.

## 2. Cómo se entrega
- Todo va a la rama `main` de `Yeffitnes/YEFFITNES-APP`; Netlify despliega solo (2–4 min).
- **Token de GitHub:** Cristian crea uno por sesión y lo pega en el chat. Úsalo solo con `git -c http.extraheader="Authorization: Basic $(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)" push …`; nunca lo escribas en una URL, en un archivo ni lo repitas en la respuesta. **Al terminar recuérdale revocarlo** (Settings → Developer settings → Tokens). Sin token: entrega zip o `.patch`.
- Commits en español con prefijo `feat|fix|perf|refactor|docs|chore`. Un cambio importante = una entrada en `CHANGELOG.md` (qué, por qué, archivos/SQL, **cómo revertir**) y, si cambia el estado, `PROJECT_STATE.md`.
- **SQL:** migración nueva y numerada en `supabase/migrations/` (**jamás editar una ya ejecutada**). Cristian la ejecuta a mano en Supabase → SQL Editor. Como el despliegue es automático, **dile el orden y avísale que ejecute el SQL antes de probar** si el código nuevo depende de él.
- Sugerencia de cierre de cada entrega: qué se hizo, qué verificaste y qué no, qué debe ejecutar/probar Cristian, y qué sigue.

## 3. Verificación obligatoria antes de subir
1. `npx tsc --noEmit` y `npx next lint` sin errores (el `next build` completo no corre en el sandbox: las fuentes de Google están bloqueadas; lo valida Netlify).
2. **Pruebas de ataque RLS:** `bash supabase/tests/run_local.sh` (aplica las migraciones desde cero y corre las suites; debe terminar en `TODO OK`). Requiere Postgres 16 local. En el sandbox de Claude: `apt-get update && apt-get install -y --no-install-recommends postgresql postgresql-client` (como root) y el script arranca el clúster y usa `runuser -u postgres`.
3. Si agregaste tablas con datos del cliente: añade casos a `supabase/tests/` (cada suite usa los usuarios y datos de la anterior; el orden es `rls` → `rls_progress` → `rls_agenda`; añade la nueva al final y a `run_local.sh`).
4. Di con claridad qué NO pudiste verificar (pantallas reales, cámara del celular, Supabase real, Netlify).

## 4. Patrón para construir una pantalla
1. Abre su mockup en `design/mockups/` y cópialo: estructura, clases, textos y comportamiento. `design/README.md` dice qué mockup corresponde a qué ruta.
2. CSS: `python3 design/port_css.py <mockup> <app/coach/coach.css | app/inicio/portal.css>` (idempotente, no duplica).
3. Datos: fetcher + hook en `lib/queries.ts` (con tipos, clave de caché, `staleTime`), mutaciones con aviso (`useToast`) y optimismo cuando sea seguro. Lecturas/escrituras simples van **directo a Supabase desde el navegador** protegidas por RLS; lo compuesto, en una función SQL; lo que necesita secretos, en servidor.
4. Estructura: `app/<ruta>/page.tsx` delgada + vista en `components/<coach|portal>/`. Estados obligatorios: cargando (esqueleto `.sk`), vacío (explica qué hacer), error (humano, con "Reintentar"), éxito. Botones con "Guardando…". Confirmación antes de borrar/cancelar. Accesibilidad: `aria-label` en iconos, foco visible.
5. Plan/permiso: si la pantalla es de pago, valida la función del plan **en la base** (`client_has_feature(...)`) además de mostrar `FeatureGate`.
6. Solo muestra datos reales: nada de cifras de ejemplo del mockup.

## 5. Cómo integrar un parche de otra sesión
1. `git checkout -b integra-X && git am --3way archivo.patch`.
2. **Resuelve conflictos línea por línea, a mano o con scripts línea a línea. NUNCA con una expresión regular `re.S` que abarque desde `<<<<<<<` hasta `>>>>>>>`:** el 24-oct borró el resto de tres archivos. Tras resolver, `git diff <commit_anterior> --stat` y busca borrados inesperados.
3. Si choca la numeración de migraciones, **renumera el parche** (no las ya ejecutadas) y corrige las referencias en CHANGELOG/CONTEXT/tests.
4. Revisa con ojo crítico (¿escribe datos "en silencio"?, ¿valida todas las referencias de la fila?, ¿deja archivos huérfanos?, ¿choca con las cabeceras de seguridad?). Corre `run_local.sh`, tipos y lint. Documenta los ajustes en el CHANGELOG. Luego `git merge --ff-only` a `main`.

## 6. Reglas de seguridad innegociables
- RLS en toda tabla, con `workspace_id`. Las políticas del cliente deben validar **todas** las referencias de la fila (espacio, cliente, plan, ruta de archivo); la API de Supabase es pública y se puede llamar sin pasar por la app. Ocultar un botón no es seguridad.
- Un cliente no escribe campos del coach ni cambia su rol/plan. El rol coach se asigna solo por SQL.
- Jamás `service_role` en el navegador ni en variables `NEXT_PUBLIC_`. Jamás `.env.local` en el repo.
- Archivos privados: bucket privado + URL firmada con vencimiento; consentimiento antes de fotos corporales.
- El espacio de trabajo debe existir **antes** del primer registro (si no, el trigger no crea perfil).

## 7. Errores que ya ocurrieron (no repetir)
| Qué pasó | Causa | Regla |
|---|---|---|
| App lenta | Consultas de sesión y datos en cadena en el servidor por pantalla | Datos desde el navegador + caché; `getClaims()` |
| Texto borroso en "pendiente" | Un `blur` en toda la tarjeta | El desenfoque es solo para contenido bloqueado |
| Registro fallaba sin explicación | No existía el espacio de trabajo al registrarse | Crear el espacio antes; mensajes de error con motivo |
| Un cliente podía escribir en el espacio de otro coach | Políticas RLS que no validaban `workspace_id`/ruta | Validar todas las referencias; pruebas de ataque |
| Tres archivos truncados al integrar un parche | Regex `re.S` codiciosa | Resolver línea por línea y revisar `--stat` |
| Código desplegado antes que su SQL | Despliegue automático | Avisar el orden: SQL primero |
| Mockup copiado solo en estilo | Se ignoró el flujo (filtros instantáneos, modales, pestañas) | Copiar también la interacción |
