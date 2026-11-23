// Capturas REALES del portal del cliente para el celular interactivo de la landing (22-nov). Ver capture.sh.
// Cliente de demostración: Valentina Ríos (12 semanas con Yeff, datos ficticios de tools/landing/demo.sql).
// Salida: public/landing/shots/<id>.webp (página completa, 390 px de ancho a 2x, sin la barra de abajo de la app: la dibuja la landing)
//         components/landing/screens.json (alto de cada pantalla y dónde está cada tarjeta, para los puntos interactivos).
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium, ctxFor } = require("../../tests/e2e/lib.js");
const REPO = path.resolve(__dirname, "../.."), SHOTS = path.join(REPO, "public/landing/shots"), TMP = fs.mkdtempSync("/tmp/lp-");
fs.mkdirSync(SHOTS, { recursive: true });
const U = "http://localhost:3000";
const HIDE = ".bottom-nav{display:none!important} nextjs-portal{display:none!important} .toast,.toasts{display:none!important}";

// Rectángulo de la tarjeta (o la fila) que contiene el texto, en px de la página (ancho 390).
async function rectOf(p, h) {
  const loc = h.sel ? p.locator(h.sel).first() : p.getByText(h.text, { exact: !!h.exact }).first();
  await loc.waitFor({ timeout: 8000 });
  return loc.evaluate((el, lvl) => {
    const has = (e) => { const cs = getComputedStyle(e); return cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || cs.borderTopWidth !== "0px"; };
    let e = el;
    if (lvl === "card") { while (e && e !== document.body) { const r = e.getBoundingClientRect(); if (r.width >= 330 && parseFloat(getComputedStyle(e).borderTopLeftRadius) >= 10 && has(e)) break; e = e.parentElement; } if (!e || e === document.body) e = el; }
    else if (lvl === "row") { while (e && e.parentElement && e.getBoundingClientRect().width < 290) e = e.parentElement; }
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  }, h.level ?? "card");
}
async function shoot(p, id, hotspots, extra = {}) {
  await p.addStyleTag({ content: HIDE }); await p.waitForTimeout(700);
  const spots = [];
  for (const h of hotspots) { try { spots.push({ id: h.id, ...(await rectOf(p, h)), title: h.title, text: h.say, go: h.go }); } catch (e) { console.log(`  ! ${id}/${h.id}: ${e.message.split("\n")[0].slice(0, 120)}`); } }
  const height = await p.evaluate(() => document.documentElement.scrollHeight), png = path.join(TMP, id + ".png");
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: png, fullPage: !extra.viewport });
  execFileSync("python3", ["-c", `from PIL import Image; Image.open("${png}").convert("RGB").save("${SHOTS}/${id}.webp", "WEBP", quality=80, method=6)`]);
  const kb = Math.round(fs.statSync(`${SHOTS}/${id}.webp`).size / 1024);
  console.log(`${id}: ${extra.viewport ? 844 : height} px · ${spots.length}/${hotspots.length} puntos · ${kb} KB`);
  return { id, height: extra.viewport ? 844 : height, start: extra.start ?? 0, spots };
}
const go = async (p, u) => { await p.goto(U + u, { waitUntil: "networkidle" }); await p.waitForTimeout(2200); };

(async () => {
  const b = await chromium.launch(), p = await (await ctxFor(b, "camila", true)).newPage(), out = [];
  // ---- Hoy ----
  await go(p, "/inicio");
  out.push(await shoot(p, "hoy", [
    { id: "dia", text: "Hola, Valentina", title: "Tu día de un vistazo", say: "Apenas abres la app ves qué te toca hoy: entrenar, nutrición, hábitos y reporte. Y tu racha de días cumpliendo." },
    { id: "agenda", sel: ".sess-soon", level: "self", title: "Tu sesión, lo primero", say: "Si tienes sesión conmigo hoy o mañana, es lo primero que ves. Te aviso el día antes, esa mañana y 1 hora antes, y la agregas al calendario de tu celular." },
    { id: "resumen", text: "te envió el resumen de tu semana", title: "Resumen de cada semana", say: "Cada semana te mando un resumen con lo que lograste y cómo vas frente a la anterior, con mi comentario.", go: "resumen" },
    { id: "reporte", text: "Reporte de hoy", title: "Reporte diario", say: "Me cuentas cómo te fue y me mandas un vídeo corto de tu técnica. Yo lo reviso y te respondo." },
    { id: "rutina", text: "Rutina de hoy", title: "Tu rutina con mi vídeo", say: "Tu rutina del día, armada para ti, con un vídeo mío explicándola. Series, repeticiones y el peso que te toca." },
    { id: "ejercicio", sel: ".exercise-list > div:first-child", level: "self", title: "Anota cada serie", say: "Tocas un ejercicio y anotas repeticiones y peso, serie por serie. El descanso se cuenta solo.", go: "ejercicio" },
    { id: "sesion", text: "Próxima sesión", title: "Tus llamadas conmigo", say: "Tu próxima sesión conmigo, a la vista. La reservas tú desde la agenda." },
    { id: "nutricion", text: "Tu plan de hoy", title: "Nutrición del día", say: "Tus comidas de hoy. Las vas marcando y yo veo cómo vas." },
    { id: "habitos", text: "Tus hábitos", title: "Hábitos", say: "Agua, pasos, sueño y lo que acordemos. Los anotas en segundos y te muestro tu promedio de la semana." },
    { id: "progreso", text: "Progreso reciente", title: "Tu progreso", say: "Tu peso y tus medidas, semana a semana. Lo ves sin hacer cuentas." },
    { id: "mensajes", sel: "a[aria-label^='Mensajes']", level: "self", title: "Mensajes conmigo", say: "Me dejas tus dudas con foto o vídeo y te respondo. Todo queda dentro de la app.", go: "mensajes" },
  ]));
  // ---- Un ejercicio abierto, con series anotadas y el descanso corriendo ----
  const ex = p.locator(".exercise-list > div").nth(0); await ex.locator(".ex-row").click(); await p.waitForTimeout(700);
  for (const n of [0, 1]) {
    const inputs = ex.locator("input.set-input"); await inputs.nth(n * 2).fill("12"); await inputs.nth(n * 2 + 1).fill("20");
    await ex.locator("button.set-save").nth(n).click(); await p.waitForTimeout(900);
  }
  const exTop = await ex.evaluate((e) => Math.round(e.getBoundingClientRect().top + window.scrollY));
  out.push(await shoot(p, "ejercicio", [
    { id: "series", sel: ".exercise-list > div:first-child", level: "self", title: "Serie por serie", say: "Repeticiones y peso de cada serie, con mi indicación debajo. Si haces más repeticiones de las del rango, la app te sugiere subir el peso y a mí me avisa." },
  ], { start: Math.max(0, exTop - 90) }));
  // ---- Resumen semanal ----
  await go(p, "/inicio"); await p.getByText("Ver mi resumen").first().click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2500);
  out.push(await shoot(p, "resumen", [
    { id: "titulo", text: "Semana 12", title: "Tu semana en una página", say: "Entrenos, nutrición, hábitos, récords y medidas de la semana, comparados con la anterior. Con mi comentario arriba." },
  ]));
  // Recorte del resumen (tarjeta de arriba, comentario de Yeff y los primeros números) para la sección de progreso de la landing
  { const top = await rectOf(p, { text: "récords nuevos", level: "card" }), bot = await rectOf(p, { text: "días completos", level: "self" }), png = path.join(TMP, "resumen_card.png");
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: png, fullPage: true, clip: { x: top.x, y: top.y, width: top.w, height: bot.y + bot.h + 46 - top.y } });
    execFileSync("python3", ["-c", `from PIL import Image; Image.open("${png}").convert("RGB").save("${SHOTS}/resumen_card.webp", "WEBP", quality=82, method=6)`]); console.log("resumen (recorte) listo"); }
  // ---- Mensajes ----
  await go(p, "/inicio/mensajes");
  out.push(await shoot(p, "mensajes", [
    { id: "chat", text: "Escríbele a tu coach", title: "Escríbeme", say: "Una duda, cómo te sientes, una foto de tu comida o un vídeo de un ejercicio. Lo leo y te respondo con calma." },
    { id: "respuestas", text: "Respuestas de Yeff a tus entrenamientos", title: "Mis respuestas", say: "Aquí ves lo que te respondo sobre tus entrenamientos: texto, audio, foto o vídeo." },
  ]));
  // ---- Plan ----
  await go(p, "/inicio/plan");
  out.push(await shoot(p, "plan", [
    { id: "semana", sel: ".mode-toggle", level: "self", title: "Entrenamiento y nutrición", say: "Tu plan completo: los días de la semana con su rutina y, en la otra pestaña, tu nutrición." },
    { id: "dia", text: `${["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][new Date().getDay()]} · hoy`, title: "Cada día, su rutina", say: "Cada ejercicio con series, repeticiones, descanso y el peso que te toca. Y el vídeo de la rutina." },
    { id: "nivel", text: "Sobre este plan", title: "Tu nivel y la revisión", say: "En qué fase estás, tu nivel y por qué, y cuándo revisamos el plan. Nada de rutinas eternas." },
  ]));
  await p.getByRole("tab", { name: "Nutrición" }).click(); await p.waitForTimeout(1500);
  out.push(await shoot(p, "nutricion", [
    { id: "comidas", text: "Plan nutricional", title: "Comida por comida", say: "Qué comer en cada momento del día, con porciones. Lo vas marcando al cumplirlo." },
    { id: "macros", text: "Tu objetivo diario", title: "Tu objetivo diario", say: "Calorías, proteína, carbohidratos y grasas pensados para tu objetivo, con mis recomendaciones." },
  ]));
  // ---- Agenda (semana siguiente, con un horario elegido) ----
  await go(p, "/inicio/agenda");
  const next = p.getByRole("button", { name: "Semana siguiente" }); if (await next.isEnabled()) { await next.click(); await p.waitForTimeout(1500); }
  const free = p.locator("button.slot.free, button.slot:not([disabled])").first(); if (await free.count()) { await free.click(); await p.waitForTimeout(800); }
  out.push(await shoot(p, "agenda", [
    { id: "calendario", sel: ".cal-grid", level: "card", title: "Mis horarios, en tiempo real", say: "Publico mis horarios cada semana. Eliges el que te sirve y queda confirmado al instante." },
    { id: "proximas", text: "Tus próximas sesiones", title: "Tus sesiones", say: "Tus llamadas reservadas, con alarma para que no se te pasen." },
  ]));
  // ---- Progreso ----
  await go(p, "/inicio/progreso");
  out.push(await shoot(p, "progreso", [
    { id: "resumenes", text: "Resúmenes de Yeff", title: "Todas tus semanas", say: "Cada resumen semanal queda guardado. Puedes volver a cualquier semana." },
    { id: "tendencias", text: "Semana a semana", exact: true, title: "Semana a semana", say: "Tus entrenos, el peso que mueves, tu nutrición y tus hábitos, semana por semana y con tu promedio. Ves si vas mejorando sin hacer cuentas." },
    { id: "semana", text: "Tu semana", exact: true, title: "Tu semana en números", say: "Entrenos, nutrición, reportes, hábitos y peso de la semana en curso. Y te aviso en qué días te quedaste corto." },
    { id: "logros", text: "Tus récords y logros", title: "Récords y logros", say: "Cada récord que rompes queda aquí, con la fecha. Y medallas por rutinas completas." },
    { id: "habitos", text: "Tus hábitos (30 días)", title: "Constancia", say: "Tus hábitos de los últimos 30 días, día por día." },
    { id: "metrica", text: "Evolución por métrica", title: "Peso y medidas", say: "La curva de tu peso, cintura, cadera y demás medidas desde que empezamos." },
  ]));
  // Recorte de "Semana a semana" para la sección de progreso de la landing (22-nov, noche)
  { const png = path.join(TMP, "tendencias.png"); await p.locator(".wt-card").first().scrollIntoViewIfNeeded();
    await p.locator(".wt-chips button", { hasText: "Peso movido" }).click(); await p.waitForTimeout(800);   // la métrica que más se ve crecer
    // La barra de arriba de la app es fija: se deja la tarjeta 140 px por debajo para que no la tape.
    await p.evaluate(() => { const el = document.querySelector(".wt-card"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140); }); await p.waitForTimeout(500);
    // Solo la cabecera y la gráfica (sin la lista de abajo): de la parte de arriba de la tarjeta al final de la gráfica
    const card = await p.locator(".wt-card").first().boundingBox(), chart = await p.locator(".wt-card .wt-chart").first().boundingBox();
    await p.screenshot({ path: png, clip: { x: card.x, y: card.y, width: card.width, height: chart.y + chart.height - card.y + 18 } });
    execFileSync("python3", ["-c", `from PIL import Image; Image.open("${png}").convert("RGB").save("${SHOTS}/tendencias.webp", "WEBP", quality=82, method=6)`]); console.log("tendencias (recorte) listo"); }
  // ---- Material ----
  await go(p, "/inicio/material");
  out.push(await shoot(p, "material", [
    { id: "lista", text: "Activación de glúteo", title: "Material educativo", say: "Vídeos y artículos míos de técnica, nutrición y recuperación. Para que entiendas lo que haces." },
  ]));
  fs.writeFileSync(path.join(REPO, "components/landing/screens.json"), JSON.stringify({ width: 390, capturedOn: new Date().toISOString().slice(0, 10), screens: out }, null, 1));
  console.log("Listo:", out.length, "pantallas"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
