// 22-nov: "Resúmenes por enviar". Camila empezó hace 14 días: completó su semana 2 y no tiene resumen → a Yeff le sale como
// prioridad en el panel y en la campana; "Revisar y enviar" abre su Resumen; al enviarlo, sale de la lista. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
  sql(`update clients set activated_at = (((now() at time zone 'America/Bogota')::date - 14) + time '09:00') at time zone 'America/Bogota' where id='${CA}'`);
  sql(`delete from week_summaries where client_id='${CA}'`);
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, `jeff-${tag}`, errs);
    await step(`[${tag}] panel: 'Resúmenes por enviar' con Camila (semana 2)`, async () => {
      await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      const t = await p.locator("#resumenes").innerText(); if (!/Camila/.test(t) || !/semana 2/i.test(t)) throw new Error(t.slice(0, 200));
      await p.screenshot({ path: `${S}/wsum_panel_${tag}.png` });
    });
    await step(`[${tag}] campana: sale como prioridad`, async () => {
      await p.getByRole("button", { name: /^Avisos/ }).first().click(); await p.waitForTimeout(400);
      const hot = await p.locator(".act-pop .act-item.hot").allInnerTexts(); if (!hot.some((x) => /completó su semana 2|resúmenes de semana por enviar/.test(x))) throw new Error(hot.join(" | "));
      await p.keyboard.press("Escape");
    });
  }
  await step("'Revisar y enviar' abre su Resumen; al enviarlo sale de la lista", async () => {
    const p = await (await ctxFor(b, "jeff", true)).newPage(); watch(p, "jeff-envio", errs);
    await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
    const before = await p.locator("#resumenes .req-line").count();
    await p.locator("#resumenes .req-line").filter({ hasText: "Camila" }).getByRole("link", { name: /Revisar y enviar/ }).click(); await p.waitForURL(/tab=Resumen/, { timeout: 8000 }); await p.waitForTimeout(1500);
    await p.getByRole("button", { name: /Enviarle el resumen/ }).click(); await p.waitForTimeout(400);
    await p.locator(".modal-box").getByRole("button", { name: /Enviar/ }).last().click(); await p.waitForTimeout(1800);
    if (sql(`select count(*) from week_summaries where client_id='${CA}'`) !== "1") throw new Error("no se envió");
    await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200); const left = await p.locator("#resumenes .req-line").filter({ hasText: "Camila" }).count(), now = await p.locator("#resumenes .req-line").count();
    if (left || now !== before - 1) throw new Error(`sigue en la lista (${before} → ${now})`);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
