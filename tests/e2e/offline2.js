// 12-nov: sin señal también se guardan hábitos, comidas y el reporte de texto, y se envían solos al volver la señal. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000/inicio", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
(async () => { const b = await chromium.launch(), errs = [], ctx = await ctxFor(b, "camila", true), c = await ctx.newPage(); watch(c, "camila", errs);
  await c.goto(U, { waitUntil: "networkidle" }); await c.waitForTimeout(1500); const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  await ctx.setOffline(true); await c.waitForTimeout(300);
  await step("sin señal: agua +1, pasos 4200, marcar una comida y enviar el reporte de texto", async () => {
    const h = c.locator("#habitos"); await h.scrollIntoViewIfNeeded(); await h.getByRole("button", { name: "Un vaso más" }).click(); await c.waitForTimeout(300);
    await h.getByLabel("Pasos de hoy").fill("4200"); await h.getByLabel("Pasos de hoy").press("Enter"); await c.waitForTimeout(300);
    await c.locator(".meal-check-btn").first().click(); await c.waitForTimeout(400);
    const r = c.locator("#reporte"); await r.scrollIntoViewIfNeeded(); const head = r.locator(".qrow-head"); if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
    await r.getByLabel("Comentario del día").fill("Entrené sin señal"); await r.getByRole("button", { name: "Enviar reporte" }).click(); await c.waitForTimeout(800);
    const t = (await c.locator("body").innerText()).replace(/\n/g, " "); await c.screenshot({ path: `${S}/off2_offline.png`, fullPage: true });
    const water = await h.locator(".hab-step b").first().innerText(), meal = await c.locator(".meal-check-btn").first().getAttribute("aria-checked");
    if (water !== "1" || meal !== "true" || !/Reporte guardado/.test(t) || !/Sin señal/.test(t)) throw new Error(`agua=${water} comida=${meal} ${t.slice(0, 200)}`);
    const db = sql(`select (select count(*) from habit_logs where client_id='${CID}' and day=${hoy}) || '|' || (select count(*) from daily_reports where client_id='${CID}' and report_date=${hoy})`); if (db !== "0|0") throw new Error("llegó a la base sin señal: " + db);
    return `en el teléfono: agua 1, comida marcada, reporte guardado`;
  });
  await step("vuelve la señal: todo llega a la base y avisa", async () => {
    await ctx.setOffline(false); await c.evaluate(() => window.dispatchEvent(new Event("online"))); await c.waitForTimeout(4000);
    const db = sql(`select (select water||'/'||steps from habit_logs where client_id='${CID}' and day=${hoy}) || '|' || (select count(*) from meal_logs where client_id='${CID}' and log_date=${hoy}) || '|' || (select comment from daily_reports where client_id='${CID}' and report_date=${hoy})`);
    if (db !== "1/4200|1|Entrené sin señal") throw new Error(db);
    const q = await c.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("yf-oq-")).map((k) => localStorage.getItem(k)).join("")); if (q) throw new Error("quedó en la cola: " + q);
    const t = (await c.locator("body").innerText()).replace(/\n/g, " "); if (!/Reporte enviado/.test(t)) throw new Error(t.slice(0, 160)); return db;
  });
  console.log(errs.length ? errs.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::/i.test(e)).join("\n") || "Solo errores de red esperados (sin señal)" : "Sin errores de consola ni de red");
  await b.close(); process.exit(fails || errs.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::/i.test(e)).length ? 1 : 0); })();
