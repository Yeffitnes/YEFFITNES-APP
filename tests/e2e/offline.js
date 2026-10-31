// Entrar y salir de la app SIN SEÑAL (30-oct, noche: "que entre o salga se quede guardado así no tenga señal").
// 1) Con señal se abre una vez (se guarda la pantalla). 2) Sin señal: abrir, registrar una serie, cerrar, volver a abrir: sigue ahí.
// 3) Vuelve la señal: se envía sola y queda en la base. Para saber que la pantalla sin señal vino de la COPIA y no de internet,
// se cambia el nombre de la rutina en la base mientras está sin señal: la copia debe mostrar el nombre viejo.
const { chromium, ctxFor, watch } = require("./lib.js");
const { execSync } = require("child_process");
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c ${JSON.stringify(q)}`).toString().trim();
const S = require("path").join(__dirname, "shots"), U = "http://localhost:3000/inicio";
let fails = 0; const step = async (n, fn) => { try { const r = await fn(); console.log("OK  ", n, r ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 200)); } };
(async () => {
  const b = await chromium.launch(), errs = [], ctx = await ctxFor(b, "camila", true);
  const open = async () => { const p = await ctx.newPage(); watch(p, "camila", errs); await p.goto(U, { waitUntil: "domcontentloaded" }); await p.waitForSelector("#rutina", { timeout: 15000 }); await p.waitForTimeout(1200); return p; };
  const day = sql("select pd.id from plan_days pd join clients c on c.id=pd.client_id where c.profile_id='00000000-0000-0000-0000-00000000000a' and pd.weekday = extract(isodow from (now() at time zone 'America/Bogota'))");
  await step("con señal: abrir una vez (se guarda la pantalla)", async () => {
    const p = await ctx.newPage(); await p.goto(U, { waitUntil: "networkidle" }); await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload({ waitUntil: "networkidle" }); const g = p.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
    const ctl = await p.evaluate(() => !!navigator.serviceWorker.controller); await p.close(); if (!ctl) throw new Error("sin service worker"); return "guardada";
  });
  sql(`update plan_days set name = 'NOMBRE NUEVO' where id = '${day}'`);
  await ctx.setOffline(true);
  await step("sin señal: abre la app (copia guardada) y registra una serie", async () => {
    const p = await open(); const t = await p.locator("#rutina").innerText();
    if (/NOMBRE NUEVO/.test(t) || !/Pierna completa/.test(t)) throw new Error("no vino de la copia: " + t.slice(0, 60));
    await p.locator(".ex-row", { hasText: "Sentadilla" }).click(); await p.waitForSelector(".ex-panel");
    await p.getByRole("button", { name: "Guardar serie 1" }).click(); await p.waitForTimeout(600);
    const banner = await p.locator(".off-banner").innerText(); await p.screenshot({ path: `${S}/x_sin_senal.png` }); await p.close();
    if (!/Sin señal/.test(banner)) throw new Error(banner); return banner.slice(0, 70);
  });
  await step("sin señal: salir y volver a entrar, la serie sigue ahí", async () => {
    const p = await open(); const row = await p.locator(".ex-row", { hasText: "Sentadilla" }).innerText(); await p.close();
    if (!/1\/3/.test(row)) throw new Error(row.replace(/\n/g, " ")); return row.replace(/\n/g, " ").slice(0, 40);
  });
  await step("vuelve la señal: se envía sola y queda en la base", async () => {
    await ctx.setOffline(false); const p = await ctx.newPage(); watch(p, "camila", errs); await p.goto(U, { waitUntil: "networkidle" }); await p.waitForTimeout(3500);
    const n = sql("select count(*) from set_logs sl join clients c on c.id=sl.client_id where c.profile_id='00000000-0000-0000-0000-00000000000a' and sl.workout_log_id in (select id from workout_logs where log_date = (now() at time zone 'America/Bogota')::date)");
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000);   // ya con señal: la pantalla viene de internet, al día
    const t = await p.locator("#rutina").innerText(), banner = await p.locator(".off-banner").count();
    if (n !== "1" || banner || !/NOMBRE NUEVO/.test(t)) throw new Error(`series=${n} aviso=${banner} nombre=${/NOMBRE NUEVO/.test(t) ? "nuevo" : "viejo"}`); return "1 serie en la base, pantalla al día";
  });
  sql(`update plan_days set name = 'Pierna completa' where id = '${day}'`);
  const real = errs.filter((e) => !/418|422|423|425|Failed to fetch RSC payload|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e));   // sin señal: los enlaces no pueden precargar otras pantallas   // sin señal, una copia de otro momento puede redibujarse: no es error
  console.log("\n=== ERRORES ===\n" + (real.length ? real.join("\n") : "ninguno") + (errs.length - real.length ? `\n(redibujos sin señal: ${errs.length - real.length})` : ""));
  await b.close(); process.exit(fails ? 1 : 0);
})();
