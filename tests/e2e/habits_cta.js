// 14-nov: hábitos como llamada a la acción. Base recién creada. Camila: 7 días con agua 3 (por debajo de 6).
// Jeff: la campanita le dice quién está por debajo; en Hábitos le da "Recordarle". Camila: lo ve en Hoy y al anotar todo queda "Listo".
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
(async () => { const b = await chromium.launch(), errs = [];
  sql(`insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) select id, workspace_id, ${hoy} - g, 3, 8000, 7 from clients, generate_series(1,7) g where id='${CID}' on conflict (client_id, day) do update set water=3, steps=8000, sleep=7`);
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs);
  await step("Jeff: la campanita avisa que hay clientes por debajo en hábitos", async () => {
    await j.goto(`${U}/coach`, { waitUntil: "networkidle" }); await j.waitForTimeout(1800);
    await j.getByRole("button", { name: /^Avisos/ }).first().click(); const t = await j.locator(".act-pop").innerText();
    if (!/1 cliente por debajo en sus hábitos/.test(t)) throw new Error(t.slice(0, 300)); return "1 cliente por debajo";
  });
  await step("Jeff: 'Recordarle' en Hábitos guarda el aviso y queda 'Recordado hoy'", async () => {
    await j.goto(`${U}/coach/habitos`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    const row = j.locator("tr", { hasText: "Camila" }); await row.getByRole("button", { name: /Recordarle/ }).click(); await j.waitForTimeout(1500);
    await row.screenshot({ path: `${S}/hcta_row.png` });
    if (!/Recordado hoy/.test(await row.innerText())) throw new Error(await row.innerText());
    const n = sql(`select count(*) from nudges where client_id='${CID}' and kind='habits' and day=${hoy}`); if (n !== "1") throw new Error(n);
  });
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await step("Camila: en Hoy ve el aviso de hábitos y el botón la lleva a sus hábitos", async () => {
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1500); const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
    const row = c.locator("[id=avisos], .qrow", { hasText: "pendiente de tus hábitos" }).first(); await row.waitFor(); await row.screenshot({ path: `${S}/hcta_client.png` });
    await row.getByRole("button", { name: "Anotar mis hábitos" }).click(); await c.waitForTimeout(1200);
    const top = await c.locator("#habitos").evaluate((el) => el.getBoundingClientRect().top); if (top > 300 || top < -50) throw new Error(`no la llevó: ${top}`);
  });
  await step("Camila anota agua, pasos y sueño: el aviso queda 'Listo' y en 'Tu día' Hábitos queda hecho", async () => {
    const h = c.locator("#habitos"); await h.getByRole("button", { name: "Un vaso más" }).click(); await c.waitForTimeout(500);
    await h.getByLabel("Pasos de hoy").fill("4000"); await h.getByLabel("Pasos de hoy").press("Enter"); await c.waitForTimeout(500);
    await h.getByRole("button", { name: "Media hora más" }).click(); await c.waitForTimeout(1500);
    const t = (await c.locator("body").innerText()).replace(/\n/g, " ");
    if (!/Hábitos anotados/.test(t)) throw new Error(t.slice(0, 300));
    const chip = await c.locator(".dh-chip", { hasText: "Hábitos" }).getAttribute("class"); if (!/done/.test(chip)) throw new Error(chip);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
