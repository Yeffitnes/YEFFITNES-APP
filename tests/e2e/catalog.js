// Galería de ejercicios: vista Normal / Compacta por filtro (30-oct). Capturas en celular y computador.
const { chromium, ctxFor } = require("./lib.js");
const S = __dirname + "/shots";
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const mobile of [true, false]) {
    const ctx = await ctxFor(b, "jeff", mobile), p = await ctx.newPage(), tag = mobile ? "movil" : "pc";
    await p.goto("http://localhost:3000/coach/catalogo/ejercicios", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    const cols = async () => p.locator(".ex-card").evaluateAll((els) => new Set(els.slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().top))).size);
    const normal = await p.locator(".ex-grid.compact").count();
    await p.screenshot({ path: `${S}/cat_${tag}_normal.png` });
    await p.getByRole("button", { name: "Compacta" }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${S}/cat_${tag}_compacta.png` });
    const visible = await p.locator(".ex-card").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().bottom <= innerHeight).length);
    const nameCut = await p.locator(".ex-grid.compact .ex-name").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    // Otro filtro arranca Normal; volver a Todos la recuerda compacta, también al recargar
    await p.getByRole("button", { name: "Tren superior" }).click(); const upper = await p.locator(".ex-grid.compact").count();
    await p.getByRole("button", { name: "Todos", exact: true }).click(); const back = await p.locator(".ex-grid.compact").count();
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500); const reload = await p.locator(".ex-grid.compact").count();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const ok = normal === 0 && upper === 0 && back === 1 && reload === 1 && !nameCut && !overflow;
    if (!ok) bad++;
    console.log(tag, ok ? "OK" : "FAIL", JSON.stringify({ arrancaNormal: normal === 0, filasPrimeros8: await cols(), visiblesEnPantalla: visible, nombresCortados: nameCut, superiorNormal: upper === 0, recuerda: back === 1, trasRecargar: reload === 1, desborde: overflow }));
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0); })();
