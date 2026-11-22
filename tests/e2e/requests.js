// 22-nov: lo que los clientes le piden a Yeff sale prioritario en su panel (0058).
//  - Laura (pendiente) toca "Solicitar acceso a Yeff".
//  - Andrés (plan Esencial, sin nutrición) toca "Pedírselo a Yeff" en Nutrición.
//  - Yeff los ve arriba del panel ("Solicitudes de clientes") y primero en la campana, en celular y computador; "Listo" la quita.
// Base recién creada. El tiempo real no existe en local: el panel se recarga.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const LAURA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000c'`), ANDRES = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000b'`);
  sql(`update clients set access_requested_at = null where id='${LAURA}'`);
  await step("Laura (sin plan) toca Solicitar acceso", async () => {
    const p = await (await ctxFor(b, "laura", true)).newPage(); watch(p, "laura", errs);
    await p.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Solicitar acceso a Yeff/ }).first().click(); await p.getByText(/Solicitud enviada/).first().waitFor({ timeout: 6000 });
    if (sql(`select access_requested_at is not null from clients where id='${LAURA}'`) !== "t") throw new Error("no quedó anotada");
  });
  await step("Andrés (sin nutrición) se la pide a Yeff con un toque", async () => {
    const p = await (await ctxFor(b, "andres", true)).newPage(); watch(p, "andres", errs);
    await p.goto(`${U}/inicio/plan`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    await p.getByRole("tab", { name: "Nutrición" }).click(); await p.waitForTimeout(400);
    if (!(await p.getByRole("link", { name: "o escríbele" }).count())) throw new Error("falta el enlace para escribirle");
    await p.getByRole("button", { name: "Pedírselo a Yeff" }).click(); await p.getByText(/Se lo pediste a Yeff/).waitFor({ timeout: 6000 });
    await p.screenshot({ path: `${S}/req_cliente.png` });
    if (sql(`select count(*) from feature_requests where client_id='${ANDRES}' and feature='nutrition' and handled_at is null`) !== "1") throw new Error("no quedó anotada");
    await p.reload({ waitUntil: "networkidle" }); await p.getByRole("tab", { name: "Nutrición" }).click(); await p.waitForTimeout(600);
    if (!(await p.getByText(/Se lo pediste a Yeff/).count())) throw new Error("al recargar volvió a ofrecer el botón");
  });
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", j = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(j, `jeff-${tag}`, errs);
    await step(`[${tag}] panel: "Solicitudes de clientes" arriba de todo, con Laura y Andrés`, async () => {
      await j.goto(`${U}/coach`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
      const card = j.locator("#solicitudes"); await card.waitFor({ timeout: 6000 });
      const t = await card.innerText();
      if (!/Laura/.test(t) || !/pidió acceso/i.test(t)) throw new Error("falta Laura: " + t.slice(0, 200));
      if (!/Andrés/.test(t) || !/plan de nutrición/i.test(t)) throw new Error("falta Andrés: " + t.slice(0, 200));
      const top = await card.boundingBox(), rv = await j.locator(".rv-cta").boundingBox(); if (!top || !rv || top.y > rv.y) throw new Error("no está arriba de todo");
      await j.screenshot({ path: `${S}/req_panel_${tag}.png` });
    });
    await step(`[${tag}] campana: la solicitud sale primero y marcada`, async () => {
      await j.getByRole("button", { name: /^Avisos/ }).first().click(); await j.waitForTimeout(400);
      const first = j.locator(".act-pop .act-item").first(); if (!(await first.evaluate((e) => e.classList.contains("hot")))) throw new Error("la primera no es la solicitud");
      const t = await first.innerText(); if (!/solicitudes de clientes/i.test(t)) throw new Error(t);
      await j.screenshot({ path: `${S}/req_campana_${tag}.png` }); await j.keyboard.press("Escape"); await j.locator(".greeting").first().click(); await j.waitForTimeout(300);
    });
  }
  await step("Yeff toca Listo en la de Andrés: sale del panel y queda cerrada; Laura sigue", async () => {
    const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff-listo", errs);
    await j.goto(`${U}/coach`, { waitUntil: "networkidle" }); await j.waitForTimeout(1000);
    await j.locator("#solicitudes .req-line", { hasText: "Andrés" }).getByRole("button", { name: "Listo" }).click(); await j.waitForTimeout(1200);
    if (await j.locator("#solicitudes .req-line", { hasText: "Andrés" }).count()) throw new Error("sigue en el panel");
    if (sql(`select count(*) from feature_requests where client_id='${ANDRES}' and handled_at is null`) !== "0") throw new Error("no se cerró en la base");
    await j.reload({ waitUntil: "networkidle" }); await j.waitForTimeout(800);
    if (!(await j.locator("#solicitudes .req-line", { hasText: "Laura" }).count())) throw new Error("Laura desapareció");
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
