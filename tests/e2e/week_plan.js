// 4-nov: resumen por la semana real del cliente y avisos de plan por vencer. Base recién creada.
// Camila lleva 3 días (semana 1): sin enviar; luego 9 días (semana 2): la semana 1 se puede enviar. Plan: faltan 7, faltan 2 y vencido.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
(async () => { const b = await chromium.launch(), errs = [];
  for (const mobile of [false, true]) {
    const tag = mobile ? "cel" : "pc", j = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(j, `jeff-${tag}`, errs);
    const ficha = async () => { await j.goto(`${U}/coach/clientes/${CID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200); return (await j.locator(".wk-card").innerText()).replace(/\n/g, " "); };
    sql(`update clients set activated_at = now() - interval '2 days', plan_since = ${hoy} - 2 where id = '${CID}'`);
    await step(`[${tag}] día 3: dice su día real y el botón está inactivo`, async () => {
      const t = await ficha(); await j.locator(".wk-card").screenshot({ path: `${S}/wk_day3_${tag}.png` });
      if (!/Semana 1 · día 3 de 7/i.test(t) || !/faltan 5 días/i.test(t) || /Últimos 7/.test(t) || /\/7/.test(t)) throw new Error(t.slice(0, 260));
      if (await j.getByRole("button", { name: /Enviarle el resumen/ }).count()) throw new Error("se puede enviar");
      if (!(await j.locator(".wk-wait").isDisabled())) throw new Error("botón activo"); return t.slice(0, 80);
    });
    await step(`[${tag}] ficha: día del plan`, async () => { const t = await j.locator(".plan-month").innerText(); if (!/día 3 de 30/.test(t) || /Renovar/.test(t)) throw new Error(t); return t; });
    sql(`update clients set activated_at = now() - interval '8 days', plan_since = ${hoy} - 8 where id = '${CID}'`);
    await step(`[${tag}] día 9: abre la semana 1 completa, con envío; la 2 en curso sin envío`, async () => {
      const t = await ficha(); await j.locator(".wk-card").screenshot({ path: `${S}/wk_day9_${tag}.png` });
      if (!/Semana 1 · completa/i.test(t)) throw new Error(t.slice(0, 200));
      if (!(await j.getByRole("button", { name: /Enviarle el resumen/ }).count())) throw new Error("sin botón de enviar");
      await j.locator(".wk-tabs button", { hasText: "en curso" }).click(); await j.waitForTimeout(400);
      const c = (await j.locator(".wk-card").innerText()).replace(/\n/g, " "); if (!/Semana 2 · día 2 de 7/i.test(c) || await j.getByRole("button", { name: /Enviarle el resumen/ }).count()) throw new Error(c.slice(0, 200));
      return "semana 1 se puede enviar; la 2 no";
    });
    const panel = async () => { await j.goto(`${U}/coach`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200); return j.locator("#planes"); };
    sql(`update clients set plan_since = ${hoy} - 23 where id = '${CID}'`);
    await step(`[${tag}] faltan 7 días: aparece en el panel, sin botones`, async () => {
      const c = await panel(), t = (await c.innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/plan_d7_${tag}.png` });
      if (!/Vence en 7 días/.test(t) || (await c.locator("button").count())) throw new Error(t); return t.slice(0, 110);
    });
    sql(`update clients set plan_since = ${hoy} - 30 where id = '${CID}'`);
    await step(`[${tag}] vence hoy: decide; cancelar pide confirmar; renovar cuenta 30 días`, async () => {
      const c = await panel(), t = (await c.innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/plan_d0_${tag}.png` });
      if (!/Venció hoy/.test(t) || !/Sí pagó: renovar 30 días/.test(t) || !/No pagó: cancelar plan/.test(t)) throw new Error(t);
      await c.getByRole("button", { name: /No pagó/ }).click(); await c.getByRole("button", { name: /Confirmar: se queda sin acceso/ }).waitFor();
      const still = sql(`select plan_id is not null from clients where id = '${CID}'`); if (still !== "t") throw new Error("se quitó sin confirmar");
      await c.getByRole("button", { name: /Sí pagó/ }).click(); await j.waitForTimeout(1500);
      const since = sql(`select plan_since = ${hoy} from clients where id = '${CID}'`); if (since !== "t") throw new Error("no renovó");
      if (await j.locator("#planes").count()) throw new Error("sigue en el panel");
    });
  }
  const m = await (await ctxFor(b, "camila", true)).newPage(); watch(m, "camila", errs);
  sql(`update clients set activated_at = now() - interval '2 days' where id = '${CID}'`);
  await step("cliente: ve su día y no hay botón de enviar", async () => {
    await m.goto(`${U}/inicio/progreso`, { waitUntil: "networkidle" }); await m.waitForTimeout(1500);
    const t = (await m.locator(".wk-card").innerText()).replace(/\n/g, " "); await m.locator(".wk-card").screenshot({ path: `${S}/wk_client.png` });
    if (!/Semana 1 · día 3 de 7/i.test(t) || await m.locator(".wk-wait").count()) throw new Error(t.slice(0, 200)); return t.slice(0, 70);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
