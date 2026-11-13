// 4-nov: sugerencias de peso que se resuelven ahí mismo; 12-nov: sin peso, repeticiones. Base recién creada. Prepara a Camila: entreno de hace 3 días, pidió 10 e hizo 7 con 40 kg.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
const ITEM = () => sql(`select pi.id from plan_items pi where pi.client_id='${CID}' and pi.reps='10' limit 1`);
const reset = () => { const it = ITEM();
  sql(`delete from weight_advice_decisions; delete from workout_logs where client_id='${CID}' and log_date > ${hoy} - 3;`);
  sql(`delete from set_logs where client_id='${CID}' and plan_item_id is distinct from '${it}'; update set_logs set reps=7, weight=40 where plan_item_id='${it}'; update plan_items set target_weight=40 where id='${it}'; update training_plans set status='active' where client_id='${CID}'`);
  return it; };
const logNewer = (it, reps) => sql(`with w as (insert into workout_logs (workspace_id, client_id, log_date, effort, completed_at) select workspace_id, id, ${hoy} - 1, 7, now() from clients where id='${CID}' returning id, workspace_id, client_id) insert into set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps, weight) select w.workspace_id, w.client_id, w.id, '${it}', 'Sentadilla', g, 'work', ${reps}, 40 from w, generate_series(1,3) g`);
(async () => { const b = await chromium.launch(), errs = [];
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, `jeff-${tag}`, errs);
    const panel = async () => { await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1300); return p.locator(".wadv-card"); };
    let it = reset();
    await step(`[${tag}] sale con el peso ya escrito y Aceptar; sin "Ajustar en su plan"`, async () => {
      const c = await panel(), t = (await c.innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/adv_${tag}.png` });
      const v = await c.locator("input").inputValue(); if (v !== "37,5" || /Ajustar en su plan/.test(t) || !/hizo 7, 7, 7 con 40 kg/.test(t) || !/En su plan: 40 kg/.test(t)) throw new Error(`${v} / ${t}`); return t.slice(40, 170);
    });
    await step(`[${tag}] escoger otro peso (38) y aceptar: se actualiza el plan, sale y no vuelve al recargar`, async () => {
      const c = p.locator(".wadv-card"); await c.locator("input").fill("38"); await c.getByRole("button", { name: "Aceptar" }).click(); await p.waitForTimeout(1200);
      if (await p.locator(".wadv-card").count()) throw new Error("sigue en el panel"); const w = sql(`select target_weight from plan_items where id='${it}'`); if (Number(w) !== 38) throw new Error(w);
      await panel(); if (await p.locator(".wadv-card").count()) throw new Error("volvió al recargar"); return `plan: ${w} kg`;
    });
    await step(`[${tag}] descartar: el peso no cambia y tampoco sale en otro aparato`, async () => {
      it = reset(); const c = await panel(); await c.getByRole("button", { name: "Descartar" }).click(); await p.waitForTimeout(1000);
      if (await p.locator(".wadv-card").count()) throw new Error("sigue"); if (Number(sql(`select target_weight from plan_items where id='${it}'`)) !== 40) throw new Error("cambió el peso");
      const o = await (await ctxFor(b, "jeff", !mobile)).newPage(); await o.goto(`${U}/coach`, { waitUntil: "networkidle" }); await o.waitForTimeout(1300); if (await o.locator(".wadv-card").count()) throw new Error("salió en el otro aparato"); await o.close();
    });
    await step(`[${tag}] sin peso (12-nov): sugiere las repeticiones que hizo y al aceptar cambia las repeticiones del plan`, async () => {
      it = reset(); sql(`update set_logs set weight=null, reps=14 where plan_item_id='${it}'; update set_logs set reps=15 where plan_item_id='${it}' and set_number=2; update plan_items set target_weight=null where id='${it}'`);
      const c = await panel(), t = (await c.innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/adv_reps_${tag}.png` });
      if (!/subir las repeticiones/.test(t) || !/hizo 14, 15, 14 sin peso/.test(t) || /el peso/.test(t) || await c.locator("input").inputValue() !== "14") throw new Error(t);
      await c.getByRole("button", { name: "Aceptar" }).click(); await p.waitForTimeout(1200);
      const r = sql(`select reps, target_weight is null from plan_items where id='${it}'`); if (r !== "14|t" || await p.locator(".wadv-card").count()) throw new Error(r);
      sql(`update plan_items set reps='10' where id='${it}'`); return `plan: ${r}`;
    });
    await step(`[${tag}] sin peso, rango "8-12" e hizo 6, 6, 7: sugiere "6-10"; "Mejor ponerle peso" deja escribir kg`, async () => {
      it = reset(); sql(`update set_logs set weight=null, reps=6 where plan_item_id='${it}'; update set_logs set reps=7 where plan_item_id='${it}' and set_number=3; update plan_items set target_weight=null, reps='8-12' where id='${it}'`);
      const c = await panel(); const v = await c.locator("input").inputValue(); if (v !== "6-10" || !/bajar las repeticiones/.test(await c.innerText())) throw new Error(v);
      await c.getByRole("button", { name: "Mejor ponerle peso" }).click(); const ok = c.getByRole("button", { name: "Aceptar" }); if (!(await ok.isDisabled())) throw new Error("activo sin peso");
      await c.locator("input").fill("22,5"); await ok.click(); await p.waitForTimeout(1200);
      const r = sql(`select target_weight, reps from plan_items where id='${it}'`); if (r !== "22.50|8-12" || await p.locator(".wadv-card").count()) throw new Error(r);
      sql(`update plan_items set reps='10' where id='${it}'`); return r;
    });
    await step(`[${tag}] si después lo hizo bien, no sale la sugerencia vieja`, async () => { it = reset(); logNewer(it, 10); await panel(); if (await p.locator(".wadv-card").count()) throw new Error("sale"); });
    await step(`[${tag}] descartar la nueva no revive la vieja`, async () => {
      it = reset(); logNewer(it, 7); const c = await panel(); await c.getByRole("button", { name: "Descartar" }).click(); await p.waitForTimeout(1000); await panel(); if (await p.locator(".wadv-card").count()) throw new Error("revivió");
    });
    await step(`[${tag}] Jeff lo cambió en la ficha: sale sola`, async () => { it = reset(); sql(`update plan_items set target_weight=35 where id='${it}'`); await panel(); if (await p.locator(".wadv-card").count()) throw new Error("sigue"); });
    await step(`[${tag}] plan ya terminado: no sale`, async () => { it = reset(); sql(`update training_plans set status='finished' where client_id='${CID}'`); await panel(); if (await p.locator(".wadv-card").count()) throw new Error("sale"); });
    await step(`[${tag}] aceptar al revisar el entrenamiento también lo quita del panel`, async () => {
      it = reset(); await p.goto(`${U}/coach/revisar`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200); await p.locator(".rv-old-head").first().click(); await p.waitForTimeout(800);
      const w = p.locator(".wadv").first(); await w.screenshot({ path: `${S}/adv_detail_${tag}.png` }); await w.getByRole("button", { name: "Aceptar" }).click(); await p.waitForTimeout(1000);
      if (!/Plan actualizado: 37,5 kg/.test(await w.innerText())) throw new Error(await w.innerText()); await panel(); if (await p.locator(".wadv-card").count()) throw new Error("sigue en el panel");
    });
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
