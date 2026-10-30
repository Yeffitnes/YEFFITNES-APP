const { chromium, ctxFor, watch } = require("./lib.js");
const SHOTS = require("path").join(__dirname, "shots"); require("fs").mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch(), errs = [];
  const run = async (who, mobile, paths) => {
    const ctx = await ctxFor(b, who, mobile), p = await ctx.newPage(); watch(p, who, errs);
    for (const path of paths) {
      try { await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 }); } catch (e) { errs.push(`[${who}] GOTO ${path} ${e.message.slice(0, 80)}`); }
      await p.waitForTimeout(800);
      const txt = await p.evaluate(() => document.body.innerText);
      if (/No pudimos|Application error|Unhandled/.test(txt)) errs.push(`[${who}] ${path} muestra error: ${(txt.match(/[^\n]*(No pudimos|Application error)[^\n]*/) || [""])[0].slice(0, 120)}`);
      await p.screenshot({ path: `${SHOTS}/${who}${path.replace(/[\/?=&]/g, "_") || "_root"}.png`, fullPage: true });
      console.log(who, path, "->", p.url().replace("http://localhost:3000", ""));
    }
    await ctx.close();
  };
  await run("jeff", false, ["/coach", "/coach/clientes", "/coach/clientes/" + process.env.CLIENT_ID, "/coach/agenda", "/coach/catalogo/ejercicios", "/coach/catalogo/rutinas", "/coach/catalogo/nutricion", "/coach/material", "/coach/mensajes", "/coach/reportes"]);
  await run("camila", true, ["/inicio", "/inicio/plan", "/inicio/progreso", "/inicio/agenda", "/inicio/material", "/inicio/mensajes", "/inicio/objetivos"]);
  await run("andres", true, ["/inicio", "/inicio/plan"]);
  await run("laura", true, ["/inicio"]);
  await b.close();
  console.log("\n=== ERRORES ===\n" + (errs.length ? [...new Set(errs)].join("\n") : "ninguno"));
})();
