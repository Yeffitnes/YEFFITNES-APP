const { chromium, ctxFor } = require("./lib.js");
// Revisa que el reporte del día se VEA en la ficha (30-oct: salía texto blanco sobre blanco). Necesita un reporte de hoy de Camila:
// runuser -u postgres -- psql -d e2e -c "insert into daily_reports (workspace_id, client_id, report_date, comment) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'prueba' from clients where profile_id='00000000-0000-0000-0000-00000000000a' on conflict do nothing"
(async () => { const b = await chromium.launch(); const ctx = await ctxFor(b, "jeff", false), p = await ctx.newPage();
  await p.goto("http://localhost:3000/coach/clientes/" + process.env.CLIENT_ID, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  const sec = p.locator(".today-sec", { hasText: "Reporte diario" }); await sec.screenshot({ path: __dirname + "/shots/ficha_reporte.png" });
  console.log(await sec.evaluate((e) => { const q = e.querySelector(".today-quote"); const cs = q && getComputedStyle(q); return JSON.stringify({ texto: q?.textContent, color: cs?.color, fondo: getComputedStyle(e).backgroundColor, display: cs?.display, alto: q?.getBoundingClientRect().height }); }));
  await b.close(); })();
