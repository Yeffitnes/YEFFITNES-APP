// 31-oct: ejercicios alternativos (0044). Jeff aprueba 2 sustitutos para el primer ejercicio de la rutina de hoy de Camila;
// Camila lo cambia en Hoy (celular), registra una serie y ya no puede cambiarlo; Jeff ve "en lugar de …" en la ficha.
// Correr sobre base recién creada (run.sh setup).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = require("path").join(__dirname, "shots"); const log = (...a) => console.log(...a);
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0;
const step = async (name, fn) => { try { const r = await fn(); log("OK  ", name, r ?? ""); } catch (e) { fails++; log("FAIL", name, "→", e.message.split("\n")[0].slice(0, 200)); } };
const U = "http://localhost:3000";
(async () => {
  const b = await chromium.launch(), errs = [];
  const wd = Number(sql("select extract(isodow from (now() at time zone 'America/Bogota'))::int"));
  const orig = sql(`select e.name from plan_items pi join plan_days pd on pd.id = pi.plan_day_id join exercises e on e.id = pi.exercise_id where pi.client_id = '${process.env.CLIENT_ID}' and pd.weekday = ${wd} order by pi.position limit 1`);
  let alt = "";
  // ---------- Jeff (computador): aprueba 2 sustitutos ----------
  const jc = await ctxFor(b, "jeff", false), j = await jc.newPage(); watch(j, "jeff", errs);
  await step(`Jeff aprueba 2 sustitutos para ${orig}`, async () => {
    await j.goto(`${U}/coach/catalogo/ejercicios`, { waitUntil: "networkidle" }); await j.waitForTimeout(600);
    await j.getByLabel("Buscar ejercicio").fill(orig); await j.locator(".ex-card", { has: j.locator(".ex-name", { hasText: new RegExp(`^${orig}$`) }) }).first().click();
    const pick = j.getByLabel("Agregar sustituto");
    const first = await pick.locator("option").nth(1).getAttribute("value"); await pick.selectOption(first);
    const second = await pick.locator("option").nth(1).getAttribute("value"); await pick.selectOption(second);
    const chips = await j.locator(".exm-alt").allInnerTexts(); alt = chips[0];
    await j.screenshot({ path: `${S}/sw_modal.png` });
    await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(1200);
    const tag = await j.locator(".ex-card", { hasText: orig }).first().locator(".ex-tag.alt").innerText();
    if (chips.length !== 2 || !/2 sustitutos/.test(tag)) throw new Error(`chips=${chips} tag=${tag}`); return chips.join(" + ");
  });
  // ---------- Camila (celular): cambia el ejercicio ----------
  const cc = await ctxFor(b, "camila", true), c = await cc.newPage(); watch(c, "camila", errs);
  await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(800);
  const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  await step("Camila ve 'Cambiar ejercicio' y elige el sustituto", async () => {
    await c.locator(".ex-row", { hasText: orig }).click(); await c.waitForSelector(".ex-panel");
    await c.getByRole("button", { name: /Cambiar ejercicio/ }).click(); await c.waitForSelector(".swap-opt");
    await c.screenshot({ path: `${S}/sw_choose.png` });
    await c.locator(".swap-opt", { hasText: alt }).click(); await c.waitForSelector(".swap-bar.on", { timeout: 4000 });
    const row = (await c.locator(".ex-row").first().innerText()).replace(/\n/g, " ");
    await c.screenshot({ path: `${S}/sw_swapped.png` });
    if (!row.includes(alt) || !row.includes(`en lugar de ${orig}`)) throw new Error(row); return row.slice(0, 90);
  });
  await step("tras registrar una serie ya no se puede volver", async () => {
    await c.getByLabel("Peso serie 1 en kilos").fill("30"); await c.getByRole("button", { name: "Guardar serie 1" }).click(); await c.waitForTimeout(1500);
    const skip = c.locator(".rest-bar").getByRole("button", { name: "Saltar" }); if (await skip.count()) await skip.click();
    const back = await c.getByRole("button", { name: `Volver a ${orig}` }).count();
    const name = sql(`select exercise_name from set_logs s join workout_logs w on w.id = s.workout_log_id where w.client_id = '${process.env.CLIENT_ID}' and w.log_date = (now() at time zone 'America/Bogota')::date and s.set_number = 1 order by s.created_at desc limit 1`);
    if (back || name !== alt) throw new Error(`volver=${back} serieGuardadaComo=${name}`); return `serie guardada como ${name}`;
  });
  await step("al recargar sigue el sustituto", async () => {
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1200);
    const row = (await c.locator(".ex-row").first().innerText()).replace(/\n/g, " ");
    if (!row.includes(alt)) throw new Error(row); return row.slice(0, 80);
  });
  // ---------- Jeff ve el cambio ----------
  await step("Jeff ve 'en lugar de' en la ficha (Hoy)", async () => {
    await j.goto(`${U}/coach/clientes/${process.env.CLIENT_ID}`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    const t = await j.locator(".swap-tag").first().innerText(); await j.screenshot({ path: `${S}/sw_ficha.png`, fullPage: true });
    if (!t.includes(orig)) throw new Error(t); return t;
  });
  log(errs.length ? `ERRORES:\n${errs.join("\n")}` : "Sin errores de consola ni de red");
  await b.close(); process.exit(fails || errs.length ? 1 : 0);
})();
