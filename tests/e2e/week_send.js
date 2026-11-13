// 13-nov: Jeff envía el resumen de la semana con estadísticas, comparación y gráficas; el cliente lo abre. Base recién creada.
// Camila empezó hace 14 días: semana 1 (2 entrenos, sentadilla 40 kg, sueño 6 h) y semana 2 completa (3 entrenos, 42,5 kg, sueño 7 h, agua 3).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
const workout = (ago, w) => sql(`with l as (insert into workout_logs (workspace_id, client_id, log_date, effort, completed_at) select workspace_id, id, ${hoy} - ${ago}, 7, now() from clients where id='${CID}' on conflict do nothing returning id, workspace_id, client_id) insert into set_logs (workspace_id, client_id, workout_log_id, exercise_name, set_number, kind, reps, weight) select l.workspace_id, l.client_id, l.id, 'Sentadilla', g, 'work', 10, ${w} from l, generate_series(1,3) g`);
(async () => { const b = await chromium.launch(), errs = [];
  sql(`delete from workout_logs where client_id='${CID}' and log_date >= ${hoy} - 14; update clients set activated_at = now() - interval '14 days' where id='${CID}'`);
  [13, 11].forEach((d) => workout(d, 40)); [6, 4, 2].forEach((d) => workout(d, 42.5));
  sql(`insert into habit_logs (client_id, workspace_id, day, sleep, water) select id, workspace_id, ${hoy} - g, case when g >= 8 then 6 else 7 end, case when g >= 8 then 6 else 3 end from clients, generate_series(1,14) g where id='${CID}' on conflict (client_id, day) do update set sleep = excluded.sleep, water = excluded.water`);
  const j = await (await ctxFor(b, "jeff", false)).newPage(); watch(j, "jeff", errs);
  await step("Jeff: vista previa con logros, comparación, gráficas y progreso por ejercicio", async () => {
    await j.goto(`${U}/coach/clientes/${CID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1500);
    await j.getByRole("button", { name: /Enviarle el resumen/ }).click(); const m = j.locator(".wr"); await m.waitFor();
    await j.locator(".wr-note-in textarea").fill("Camila, gran semana. Ahora a tomar más agua.");
    const t = (await m.innerText()).replace(/\n/g, " "); await j.locator(".modal, [role=dialog]").first().screenshot({ path: `${S}/ws_preview.png` }).catch(() => j.screenshot({ path: `${S}/ws_preview.png`, fullPage: true }));
    const need = [/semana 2/i, /más entrenamientos/, /más peso movido/, /dormiste más/, /Entrenamientos 3/, /\+1/, /Peso movido por día/, /Hábitos día a día/, /Sentadilla 40 → 42,5 kg/, /tomar más agua/, /gran semana/];
    const miss = need.filter((r) => !r.test(t)); if (miss.length) throw new Error(miss.join(" ") + " :: " + t.slice(0, 400)); return t.slice(0, 120);
  });
  await step("Jeff envía: queda guardado, con mensaje en su chat, y la ficha dice que aún no lo abre", async () => {
    await j.getByRole("button", { name: "Enviar resumen" }).click(); await j.waitForTimeout(1500);
    const r = sql(`select week_n || '|' || (note is not null) || '|' || (select count(*) from messages where id = message_id and body like '%resumen de tu semana 2%') from week_summaries where client_id='${CID}'`); if (r !== "2|true|1") throw new Error(r);
    const n = await j.locator(".wk-card .wk-note").innerText(); if (!/aún no lo abre/.test(n)) throw new Error(n); return r;
  });
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await step("cliente: en Hoy le aparece el resumen y lo abre", async () => {
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1500); const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
    const row = c.locator(".qrow", { hasText: "resumen de tu semana 2" }); await row.waitFor(); await row.screenshot({ path: `${S}/ws_hoy.png` });
    await row.getByRole("link", { name: /Ver mi resumen/ }).click(); await c.waitForSelector(".wr-hero"); await c.waitForTimeout(1500);
    const t = (await c.locator(".wr").innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/ws_client.png`, fullPage: true });
    if (!/gran semana/.test(t) || !/Peso movido/.test(t) || !/tu meta/.test(t)) throw new Error(t.slice(0, 300));
    const sw = await c.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (sw > 1) throw new Error(`la página se sale ${sw}px`);
    const seen = sql(`select seen_at is not null from week_summaries where client_id='${CID}'`); if (seen !== "t") throw new Error("no quedó visto"); return t.slice(0, 90);
  });
  await step("cliente: en Progreso queda la lista; y en Hoy ya no sale", async () => {
    await c.goto(`${U}/inicio/progreso`, { waitUntil: "networkidle" }); await c.waitForTimeout(1200); if (!(await c.locator(".wr-list-row", { hasText: "Semana 2" }).count())) throw new Error("sin lista");
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1200); if (await c.locator(".qrow", { hasText: "resumen de tu semana 2" }).count()) throw new Error("sigue en Hoy");
  });
  await step("Jeff ve que ya lo vio", async () => { await j.reload({ waitUntil: "networkidle" }); await j.waitForTimeout(1500); const n = await j.locator(".wk-card .wk-note").innerText(); if (!/ya lo vio/.test(n)) throw new Error(n); });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
