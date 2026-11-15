// Galería de ejercicios: vista Normal / Compacta por filtro (30-oct). Arranca Compacta; Normal se recuerda por filtro. Capturas en celular y computador.
const { chromium, ctxFor } = require("./lib.js");
const S = __dirname + "/shots";
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const mobile of [true, false]) {
    const ctx = await ctxFor(b, "jeff", mobile), p = await ctx.newPage(), tag = mobile ? "movil" : "pc";
    await p.goto("http://localhost:3000/coach/catalogo/ejercicios", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    const cols = async () => p.locator(".ex-card").evaluateAll((els) => new Set(els.slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().top))).size);
    const startCompact = await p.locator(".ex-grid.compact").count();
    await p.screenshot({ path: `${S}/cat_${tag}_compacta.png` });
    const visible = await p.locator(".ex-card").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().bottom <= innerHeight).length);
    const nameCut = await p.locator(".ex-grid.compact .ex-name").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    // Normal en Todos; otro filtro sigue Compacta; volver a Todos y recargar recuerda Normal
    await p.getByRole("button", { name: "Normal" }).click(); await p.waitForTimeout(300); await p.screenshot({ path: `${S}/cat_${tag}_normal.png` });
    await p.getByRole("button", { name: "Tren superior" }).click(); const upper = await p.locator(".ex-grid.compact").count();
    await p.getByRole("button", { name: "Todos", exact: true }).click(); const back = await p.locator(".ex-grid.compact").count();
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500); const reload = await p.locator(".ex-grid.compact").count();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const ok = startCompact === 1 && upper === 1 && back === 0 && reload === 0 && !nameCut && !overflow;
    if (!ok) bad++;
    console.log(tag, ok ? "OK" : "FAIL", JSON.stringify({ arrancaCompacta: startCompact === 1, visiblesEnPantalla: visible, nombresCortados: nameCut, superiorSigueCompacta: upper === 1, recuerdaNormal: back === 0, trasRecargar: reload === 0, desborde: overflow }));
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0); })();
