// ¿Se queda la app "quieta"? Abre pantallas y mira si siguen los esqueletos de carga después de 8 s y si "Avisar" responde.
const { chromium, ctxFor } = require("./lib.js");
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const [who, mob, path] of [["jeff", false, "/coach"], ["jeff", true, "/coach"], ["camila", true, "/inicio"], ["camila", false, "/inicio"], ["andres", true, "/inicio"], ["jeff", false, "/coach/agenda"]]) for (let k = 0; k < 3; k++) {
    const ctx = await ctxFor(b, who, mob), p = await ctx.newPage(); await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(8000);
    const sk = await p.locator(".sk:visible").count(); if (sk) bad++; console.log(who, mob ? "móvil" : "pc", path, sk ? `ATASCADO (${sk} cargando)` : "ok"); await ctx.close(); }
  console.log(bad ? `ATASCOS: ${bad}` : "SIN ATASCOS"); await b.close(); })();
