# PROJECT_STATE — YEFFITNES TRAINING
Foto del estado al **24-oct-2026**. El historial detallado está en `CHANGELOG.md` (no se duplica aquí). Contexto: `CONTEXT.md`. Forma de trabajar: `AGENT_PLAYBOOK.md`.

## Resumen
Fundación, panel del coach y portal del cliente funcionando en el código, con 12 migraciones y 3 suites de pruebas de ataque en verde (Postgres de prueba). **Falta la validación de punta a punta con el Supabase real y con un celular** (ver "Sin verificar").

## Qué está hecho
| Área | Estado |
|---|---|
| Acceso (login/registro, pendiente, bloqueo por plan, PWA) | hecho |
| Coach: dashboard, clientes y ficha, catálogo, entrenamiento por días, revisión de entrenamientos, agenda | hecho |
| Cliente: Hoy, Mi plan, Progreso (mediciones y fotos), Agenda | hecho |
| Seguridad: RLS + trigger de columnas del coach + pruebas de ataque (`run_local.sh`) | hecho |
| Herramientas para agentes: `AGENT_PLAYBOOK`, `run_local.sh`, `design/port_css.py`, mockups en el repo | hecho |

## Sin verificar (riesgo real)
- Nadie ha reportado la prueba completa en producción: coach crea ejercicio/rutina/plan → cliente entrena y mide → coach revisa → cliente ve el comentario.
- Subida de foto desde celular (cámara, compresión) y creación del bucket `progress-photos`.
- Agenda con dos usuarios reales y con la zona horaria del celular.
- Las pantallas nuevas (Mi plan, logo corregido, series de un toque) no se han visto renderizadas por el agente.
- Netlify: que el build completo pase (fuentes de Google).

## Siguiente (orden propuesto)
1. **Probar lo existente** (Cristian) y corregir lo que falle.
2. ~~Material educativo~~ **hecho** (0013; falta: documentos PDF y mostrar el vídeo de la semana en Hoy).
3. ~~Anuncios a todos y notas privadas~~ **hecho** (0014; los anuncios no tenían mockup: se hicieron con el estilo de las tarjetas existentes; pendiente que Jeff los valide).
4. ~~Reporte diario con vídeo~~ **construido** (0015; falta crear la cuenta de Bunny y las variables en Netlify, y probar una subida real desde un celular. Se usa la cámara nativa del teléfono, así que NO hace falta cambiar `Permissions-Policy`).
5. ~~Nutrición con plantillas~~ **hecho** (0016; la vista del cliente sigue el mockup de Mi plan; la del coach se diseñó con el estilo del catálogo).
6. ~~Onboarding~~ **versión básica hecha** (0017: 3 pasos; falta el personaje guía y el contenido que defina Jeff).
7. Landing pública, avisos/recordatorios, objetivos (P2).
8. **Pre-lanzamiento:** revocar token, quitar la insignia "Powered by Netlify" (Netlify → Project configuration → General → Powered by Netlify badge → apagar; no requiere redeploy), repo privado, Supabase Pro, confirmación de correo, revisión final de RLS, prueba con 2–3 clientes reales, dominio.

## Bloqueos y dependencias
- Bunny Stream: Cristian debe crear la cuenta/biblioteca y pasar `BUNNY_API_KEY` y `BUNNY_LIBRARY_ID` como variables de **servidor** (nunca `NEXT_PUBLIC_`).
- Decisiones de Jeff pendientes: ver `CONTEXT.md` §11.
- Plazo: 2 meses (hasta el 21-dic-2026), ampliable a 3 (21-ene-2027).
