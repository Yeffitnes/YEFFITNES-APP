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
    const t = (await row.innerText()).replace(/\n/g, " "); await row.screenshot({ path: `${S}/away.png` });
    if (!/2 veces/.test(t) || !/entrenamiento de hoy/.test(t) || !/Hoy aún no registras nada/.test(t) || !/Hoy toca/.test(t)) throw new Error(t.slice(0, 300)); return t.slice(0, 160);
  });
  await step("'Entendido' la quita y no vuelve al recargar", async () => {
    await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).getByRole("button", { name: "Entendido" }).click(); await c.waitForTimeout(300);
    if (await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).count()) throw new Error("sigue");
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1200);
    if (await c.locator(".qrow", { hasText: "Jeff estuvo pendiente de ti" }).count()) throw new Error("volvió al recargar"); return "ok";
  });
  if (await g.count()) await g.first().click().catch(() => {});
  await step("hábitos: anotar ayer y luego hoy con récord de pasos", async () => {
    const h = c.locator("#habitos"); await h.scrollIntoViewIfNeeded();
    await h.getByRole("button", { name: "Ayer", exact: true }).click(); await h.getByLabel("Pasos de ayer").fill("5000"); await h.getByLabel("Pasos de ayer").press("Enter"); await c.waitForTimeout(800);
    await h.getByRole("button", { name: "Un vaso más" }).click(); await c.waitForTimeout(600);
    await h.getByRole("button", { name: "Hoy", exact: true }).click(); await c.waitForTimeout(300);
    const empty = await h.getByLabel("Pasos de hoy").inputValue();
    await h.getByLabel("Pasos de hoy").fill("8000"); await h.getByLabel("Pasos de hoy").press("Enter");
    const toast = await c.locator(".toast").innerText({ timeout: 5000 });
    const rows = sql(`select day = ${D(1)}, water, steps from habit_logs where client_id = '${CID}' order by day`);
    await h.screenshot({ path: `${S}/habits.png` });
    if (empty !== "" || !/Nuevo récord de pasos/.test(toast) || !/t\|1\|5000/.test(rows) || !/f\|\|8000/.test(rows)) throw new Error(`hoyVacío=${empty} toast=${toast} filas=${rows}`);
    return `${toast} | filas: ${rows.replace(/\n/g, " ; ")}`;
  });
  await step("historial de hábitos en Progreso (cliente)", async () => {
    await c.goto("http://localhost:3000/inicio/progreso", { waitUntil: "networkidle" }); await c.waitForTimeout(1500);
    const card = c.locator(".hab-hist"); await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${S}/hab_hist.png` });
    const t = (await card.innerText()).replace(/\n/g, " "); if (!/2 días seguidos/.test(t) || !/mejor día 8\.000/.test(t)) throw new Error(t); return t.slice(0, 140);
  });
  await step("Jeff ve el mismo historial en la ficha (Progreso)", async () => {
    const j = await (await ctxFor(b, "jeff", false)).newPage(); watch(j, "jeff", errs);
    await j.goto(`http://localhost:3000/coach/clientes/${CID}?tab=Progreso`, { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
    const t = (await j.locator(".hab-hist").innerText()).replace(/\n/g, " "); if (!/Hábitos \(30 días\)/i.test(t) || !/mejor día 8\.000/.test(t)) throw new Error(t); return t.slice(0, 120);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
