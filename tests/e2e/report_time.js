// 2-nov: la hora del reporte se ve en Reportes, en la ficha (Hoy) y en Revisar pendientes.
// Antes: insert into daily_reports (workspace_id, client_id, report_date, comment, created_at) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien', (date_trunc('day', now() at time zone 'America/Bogota') + interval '20 hours 42 minutes') at time zone 'America/Bogota' from clients where profile_id='00000000-0000-0000-0000-00000000000a';
const { chromium, ctxFor, watch } = require("./lib.js");
(async () => { const b = await chromium.launch(), errs = [], j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs); const out = [];
  await j.goto("http://localhost:3000/coach/reportes", { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
  out.push((await j.locator(".note-item", { hasText: "Camila" }).first().locator(".attn-name").innerText()).replace(/\n/g, " "));
  await j.goto(`http://localhost:3000/coach/clientes/${process.env.CLIENT_ID}`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
  const sec = j.locator(".today-sec", { hasText: "Reporte diario" }); out.push((await sec.innerText()).replace(/\n/g, " ")); await sec.screenshot({ path: __dirname + "/shots/report_time.png" });
  await j.goto("http://localhost:3000/coach/revisar", { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
  out.push(await j.locator(".rv-sec", { hasText: "Reporte de hoy" }).locator(".rv-state").innerText());   // Revisar por cliente (2-nov)
  const ok = out.every((t) => /20:42/.test(t)); console.log(ok ? "OK" : "FAIL", JSON.stringify(out)); console.log(errs.length ? errs.join("\n") : "sin errores");
  await b.close(); process.exit(ok && !errs.length ? 0 : 1); })();
