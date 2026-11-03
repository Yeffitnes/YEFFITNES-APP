// 2-nov: botones de la respuesta sin montarse en el celular (en Revisar) y logros por rutinas completas. El filtro se quitó (ver review3.js).
// Antes: insert into daily_reports (workspace_id, client_id, report_date, comment) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien' from clients where profile_id='00000000-0000-0000-0000-00000000000a';
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 220)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs);
  await j.goto("http://localhost:3000/coach/revisar", { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
  await step("botones de la respuesta no se montan (celular)", async () => {
    await j.locator(".rv-old-head").first().click().catch(() => {}); const acts = j.locator(".fb-acts").first(); await acts.scrollIntoViewIfNeeded(); await acts.screenshot({ path: `${S}/rv_btns.png` });
    const r = await acts.locator("button").evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim(), x: b.x, y: b.y, w: b.width, h: b.height, over: e.scrollWidth > e.clientWidth + 1 }; }));
    const overlap = r.some((a, i) => r.some((c, k) => k > i && a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1));
    if (overlap || r.some((x) => x.over)) throw new Error(JSON.stringify(r)); return r.map((x) => x.t).join(" | ");
  });
  await step("logros: el entrenamiento a medias no cuenta como rutina completa", async () => {
    const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
    await c.goto("http://localhost:3000/inicio/progreso", { waitUntil: "networkidle" }); await c.waitForTimeout(1500);
    const t1 = await c.locator(".rec-card .card-title").innerText();
    // completar la rutina de ese día: las 3 series del segundo ejercicio
    sql(`insert into set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps, weight) select w.workspace_id, w.client_id, w.id, pi.id, 'Curl', g, 'work', 12, 20 from workout_logs w join plan_items pi on pi.plan_day_id = w.plan_day_id and pi.reps <> '10', generate_series(1,3) g where w.client_id = '${process.env.CLIENT_ID}' and w.completed_at is not null on conflict do nothing`);
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1500);
    const t2 = await c.locator(".rec-card .card-title").innerText(); await c.locator(".rec-card").screenshot({ path: `${S}/logros.png` });
    if (!/^0 rutinas completas/.test(t1) || !/^1 rutina completa/.test(t2)) throw new Error(`${t1} → ${t2}`); return `${t1} → ${t2}`;
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
