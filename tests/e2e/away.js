// 2-nov: hábitos (ayer/anteayer, récord, historial 30 días para cliente y Jeff) y "Jeff estuvo pendiente de ti" al volver.
// Base recién creada (run.sh setup).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 220)); } };
const CID = process.env.CLIENT_ID, D = (n) => `(now() at time zone 'America/Bogota')::date - ${n}`;
(async () => { const b = await chromium.launch(), errs = [];
  // Jeff le mandó avisos anteayer y ayer; ella no entró
  sql(`insert into nudges (workspace_id, client_id, kind, day, created_at) select workspace_id, id, 'train', ${D(2)}, now() - interval '2 days' from clients where id = '${CID}'`);
  sql(`insert into nudges (workspace_id, client_id, kind, day, created_at) select workspace_id, id, 'nothing', ${D(1)}, now() - interval '1 day' from clients where id = '${CID}'`);
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await c.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await c.waitForTimeout(1500);
  const g = c.getByRole("button", { name: "Entendido" }); 
  await step("al volver ve 'Jeff estuvo pendiente de ti' con los avisos y lo que quedó sin hacer", async () => {
    const row = c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }); await row.scrollIntoViewIfNeeded();
    const closed = await row.locator(".qrow-body").count(); await row.screenshot({ path: `${S}/away_closed.png` });
    await row.locator(".qrow-head").click(); await c.waitForTimeout(300);
    const t = (await row.innerText()).replace(/\n/g, " "), btns = await row.locator(".qrow-body button, .qrow-body a").count(); await row.screenshot({ path: `${S}/away.png` });
    if (closed || btns !== 1 || !/esperaba tu entrenamiento/.test(t) || !/registraras tu día/.test(t)) throw new Error(`cerrada=${!closed} botones=${btns} ${t.slice(0, 300)}`); return t.slice(0, 200);
  });
  await step("'Entendido' la quita y no vuelve al recargar", async () => {
    await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).getByRole("button", { name: "Entendido" }).click(); await c.waitForTimeout(300);
    if (await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).count()) throw new Error("sigue");
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1200);
    if (await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).count()) throw new Error("volvió al recargar"); return "ok";
  });
  if (await g.count()) await g.first().click().catch(() => {});
  await step("hábitos: avisos (ayer poca agua y pocos pasos, anoche poco sueño), récord y promedio de la semana", async () => {
    sql(`insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) select id, workspace_id, ${D(1)}, 3, 5000, 7 from clients where id = '${CID}'`);
    sql(`insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) select id, workspace_id, ${D(2)}, 8, 1200, 5 from clients where id = '${CID}'`);
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1200);
    const h = c.locator("#habitos"); await h.scrollIntoViewIfNeeded();
    if (await h.getByRole("button", { name: "Ayer", exact: true }).count()) throw new Error("sigue el selector de días");
    await h.getByRole("button", { name: "Media hora más" }).click(); await c.waitForTimeout(300);   // 7 h
    for (let k = 0; k < 4; k++) { await h.getByRole("button", { name: "Media hora menos" }).click(); await c.waitForTimeout(250); }   // 5 h
    await h.getByLabel("Pasos de hoy").fill("8000"); await h.getByLabel("Pasos de hoy").press("Enter");
    const toast = await c.locator(".toast").innerText({ timeout: 5000 }); await c.waitForTimeout(800);
    const alerts = (await h.locator(".hab-alert").allInnerTexts()).join(" | "), week = (await h.locator(".hab-week-box").innerText()).replace(/\n/g, " ");
    await h.screenshot({ path: `${S}/habits.png` });
    if (!/Nuevo récord de pasos: 8\.000/.test(toast) || !/Anoche dormiste 5 h/.test(alerts) || !/Ayer tomaste 3 vasos/.test(alerts) || /Ayer diste/.test(alerts) || !/promedio por día/i.test(week)) throw new Error(`toast=${toast} || avisos=${alerts} || semana=${week}`);
    return `${alerts} || ${week}`;
  });
  await step("historial de hábitos en Progreso (cliente)", async () => {
    await c.goto("http://localhost:3000/inicio/progreso", { waitUntil: "networkidle" }); await c.waitForTimeout(1500);
    const card = c.locator(".hab-hist"); await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${S}/hab_hist.png` });
    const t = (await card.innerText()).replace(/\n/g, " "); if (!/3 días seguidos/.test(t) || !/mejor día 8\.000/.test(t) || !/con poco sueño/.test(t)) throw new Error(t); return t.slice(0, 140);
  });
  await step("Jeff ve el mismo historial en la ficha (Progreso)", async () => {
    const j = await (await ctxFor(b, "jeff", false)).newPage(); watch(j, "jeff", errs);
    await j.goto(`http://localhost:3000/coach/clientes/${CID}?tab=Progreso`, { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
    const t = (await j.locator(".hab-hist").innerText()).replace(/\n/g, " "); if (!/Hábitos \(30 días\)/i.test(t) || !/mejor día 8\.000/.test(t)) throw new Error(t);
    await j.goto(`http://localhost:3000/coach/clientes/${CID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
    const w = (await j.locator(".wk-card").innerText()).replace(/\n/g, " "); await j.locator(".wk-card").screenshot({ path: `${S}/wk_coach.png` });
    if (!/Hábitos por debajo del mínimo/.test(w) || !/poco sueño 2 días/.test(w) || !/poca agua 1 día/.test(w) || !/pocos pasos 1 día/.test(w)) throw new Error(w); return w.slice(w.indexOf("Hábitos por"), w.indexOf("Hábitos por") + 160);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
