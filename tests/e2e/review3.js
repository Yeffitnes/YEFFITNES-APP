// 2-nov: "Revisar" se encuentra (arriba del panel y segundo en el menú del celular) y tiene "Todo lo de hoy" (revisado o no).
// Base recién creada. Prepara: reporte de hoy de Camila (sin ver) y un entrenamiento de hoy de Andrés YA revisado.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 220)); } };
(async () => { const b = await chromium.launch(), errs = [];
  sql(`insert into daily_reports (workspace_id, client_id, report_date, comment) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien' from clients where profile_id='00000000-0000-0000-0000-00000000000a' on conflict do nothing`);
  sql(`insert into workout_logs (workspace_id, client_id, log_date, effort, completed_at) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 7, now() from clients where profile_id='00000000-0000-0000-0000-00000000000b' on conflict do nothing`);
  // la revisión solo la puede marcar el coach (protect_coach_columns): se hace como Jeff
  sql(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f0',false); set role authenticated; update workout_logs set coach_seen_at = now(), coach_comment = 'Bien hecho' where log_date = (now() at time zone 'America/Bogota')::date and client_id = (select id from clients where profile_id='00000000-0000-0000-0000-00000000000b');`);
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs);
  await j.goto("http://localhost:3000/coach", { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
  await step("panel: tarjeta Revisar arriba y 'Revisar' segundo en el menú", async () => {
    const y = await j.locator(".rv-cta").evaluate((e) => Math.round(e.getBoundingClientRect().top)); const nav = await j.locator(".mobile-nav a").allInnerTexts();
    await j.screenshot({ path: `${S}/rv_dash.png` });
    if (y > 700 || nav[1] !== "Revisar") throw new Error(`y=${y} menú=${nav.slice(0, 3)}`); return `tarjeta a ${y}px · menú: ${nav.slice(0, 3).join(", ")}`;
  });
  await step("Pendientes: el entreno de hace 3 días y el reporte de hoy (no el entreno ya revisado)", async () => {
    await j.locator(".rv-cta").getByRole("link", { name: /Pendientes/ }).click(); await j.waitForURL(/revisar/); await j.waitForTimeout(1200);
    const h = await j.locator("h1").innerText(); if (!/2 por revisar/.test(h)) throw new Error(h); return h;
  });
  await step("Todo lo de hoy: reporte de Camila y entreno revisado de Andrés; Siguiente pasa entre ellos", async () => {
    await j.getByRole("tab", { name: "Todo lo de hoy" }).click(); await j.waitForTimeout(400);
    const h = await j.locator("h1").innerText(), c = await j.locator(".rv-count").innerText();
    await j.waitForTimeout(800); const a = await j.locator(".rv-who").innerText(); const upd = await j.getByRole("button", { name: "Actualizar" }).count();   // Andrés: ya revisado, se puede editar la respuesta
    await j.getByRole("button", { name: /Siguiente/ }).click(); await j.waitForTimeout(800);
    const bb = await j.locator(".rv-who").innerText();
    await j.screenshot({ path: `${S}/rv_today.png`, fullPage: true });
    const both = [a, bb].join(" | ").replace(/\n/g, " ");
    if (!/Hoy: 2 registros/.test(h) || !/1 de 2 · 1 sin revisar/.test(c) || !/Andrés/.test(both) || !/Camila/.test(both) || !upd) throw new Error(`${h} / ${c} / ${both} / upd=${upd}`); return `${h} · ${c} · ${both.slice(0, 150)}`;
  });
  await step("el enlace del panel abre directo en Todo lo de hoy", async () => {
    await j.goto("http://localhost:3000/coach/revisar?modo=hoy", { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    const sel = await j.getByRole("tab", { name: "Todo lo de hoy" }).getAttribute("aria-selected"), h = await j.locator("h1").innerText();
    if (sel !== "true" || !/Hoy: 2/.test(h)) throw new Error(`${sel} ${h}`); return h;
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
