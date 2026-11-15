// 2-nov: avisos. "Avisar" dice el motivo exacto cuando no llega; "Probar avisos" responde; cambiar el plan llama al aviso de plan.
// Necesita build y servidor con claves VAPID de prueba (ver README). No hay servicio push real: se prueban los motivos, no la entrega.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 220)); } };
(async () => {
  const b = await chromium.launch(), errs = [];
  const j = await (await ctxFor(b, "jeff", false)).newPage(); watch(j, "jeff", errs);
  await j.goto("http://localhost:3000/coach", { waitUntil: "networkidle" }); await j.waitForTimeout(800);
  await step("Avisar a Andrés sin teléfonos: dice que su cuenta no tiene teléfono", async () => {
    await j.locator(".attn-line", { hasText: "Andrés" }).getByRole("button", { name: /Avisar/ }).click();
    const t = await j.locator(".toast").innerText({ timeout: 9000 }); if (!/ningún teléfono/.test(t)) throw new Error(t); return t;
  });
  await step("Probar avisos (Jeff sin teléfonos)", async () => {
    const r = await j.evaluate(async () => (await fetch("/api/push/test", { method: "POST" })).json());
    if (!r.configured || r.devices !== 0 || !r.key) throw new Error(JSON.stringify(r)); return JSON.stringify(r);
  });
  await step("Probar avisos con un teléfono que ya no existe: lo limpia y lo dice", async () => {
    sql("insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) select 'https://localhost:9/push/x', '00000000-0000-0000-0000-0000000000f0', workspace_id, 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg' from profiles where id = '00000000-0000-0000-0000-0000000000f0' on conflict do nothing");
    const r = await j.evaluate(async () => (await fetch("/api/push/test", { method: "POST" })).json());
    if (r.devices !== 1 || r.sent !== 0 || !r.reason) throw new Error(JSON.stringify(r)); return JSON.stringify(r);
  });
  await step("Cambiar el plan de Camila llama al aviso de plan (una vez cada 30 min)", async () => {
    const calls = []; j.on("response", (r) => { if (r.url().includes("/api/push/plan")) calls.push(r.status()); });
    sql(`insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) select 'https://localhost:9/push/camila', '00000000-0000-0000-0000-00000000000a', workspace_id, 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg' from profiles where id = '00000000-0000-0000-0000-00000000000a' on conflict do nothing`); sql('delete from plan_notices');
    await j.goto(`http://localhost:3000/coach/clientes/${process.env.CLIENT_ID}?tab=Entrenamiento`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
    const w = j.getByLabel(/Peso objetivo de .* en kilos/).first();
    if (!(await w.count())) throw new Error("no encontré el peso del plan");
    await w.fill("42.5"); await w.blur(); await j.waitForTimeout(800);
    await w.fill("45"); await w.blur();   // segundo cambio seguido: no debe volver a sonar
    await j.waitForTimeout(2500);
    const n = sql(`select count(*) from plan_notices where client_id = '${process.env.CLIENT_ID}' and kind = 'training'`);
    const st = sql(`select count(*) from plan_notices`);
    if (calls.length < 2 || n !== "1" || st !== "1") throw new Error(`llamadas=${calls} avisos=${n}`); return `llamadas ${calls.join(",")}, aviso registrado`;
  });
  console.log(errs.filter((e) => !/api\/push/.test(e)).length ? errs.join("\n") : "Sin errores de consola ni de red");
  await b.close(); process.exit(fails ? 1 : 0);
})();
