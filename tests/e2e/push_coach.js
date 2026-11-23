// 22-nov: avisos del coach. Necesita claves VAPID de prueba en el build y al correr, como push.js (no está en all.sh).
//  - Franja "Activa los avisos" cuando este teléfono no los tiene; "Ahora no" la esconde; bloqueados: pasos para Android.
//  - Un cliente reserva y cancela desde su agenda: se pide el aviso a Yeff (0060) y queda marcado una sola vez.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs);
  await step("iPhone en el navegador: pide instalar la app (en iPhone los avisos solo llegan instalada)", async () => {
    await j.goto(`${U}/coach`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    const t = await j.locator(".cpb").innerText(); if (!/Instala la app/.test(t)) throw new Error(t);
  });
  await step("Android: sale la franja para activar los avisos", async () => {
    const c = await ctxFor(b, "jeff", true);
    await c.addInitScript(() => { Object.defineProperty(Notification, "permission", { get: () => "default" }); Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" }); });
    const p = await c.newPage(); watch(p, "jeff-android", errs); await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    const t = await p.locator(".cpb").innerText(); if (!/Activa los avisos/.test(t) || !/Activar avisos/.test(t)) throw new Error(t);
    await p.screenshot({ path: `${S}/push_banner_cel.png` }); await c.close();
  });
  await step("'Ahora no' la esconde y no vuelve al recargar", async () => {
    await j.getByRole("button", { name: "Ahora no" }).click(); await j.waitForTimeout(300);
    await j.reload({ waitUntil: "networkidle" }); await j.waitForTimeout(1000); if (await j.locator(".cpb").count()) throw new Error("volvió");
  });
  await step("bloqueados en Android: muestra los pasos de Chrome", async () => {
    const c = await ctxFor(b, "jeff", true);
    await c.addInitScript(() => { Object.defineProperty(Notification, "permission", { get: () => "denied" }); Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" }); });
    const p = await c.newPage(); watch(p, "jeff-denied", errs); await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    const t = await p.locator(".cpb").innerText(); if (!/bloqueados/.test(t) || !/Configuración de sitios/.test(t) || !/Ya lo hice/.test(t)) throw new Error(t);
    await p.screenshot({ path: `${S}/push_banner_bloqueado.png` }); await c.close();
  });
  await step("cliente reserva y cancela: se pide el aviso a Yeff una vez por cada cosa", async () => {
    const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
    sql(`update bookings set status='cancelled', cancelled_at=now()-interval '1 day', cancelled_by='client' where client_id='${CA}' and status='confirmed'`);
    const d = sql(`select ((now() at time zone 'America/Bogota')::date + 3)::text`);
    sql(`insert into availability_slots (workspace_id, starts_at, kind) select id, ('${d} 09:00')::timestamp at time zone 'America/Bogota', 'followup' from workspaces where slug='yeffitnes'`);
    sql(`insert into push_subscriptions values ('https://push.example/jeff-e2e', '00000000-0000-0000-0000-0000000000f0', (select id from workspaces where slug='yeffitnes'), 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', now()) on conflict (endpoint) do nothing`);
    const c = await (await ctxFor(b, "camila", false)).newPage(); watch(c, "camila", errs);   // computador: el celular de prueba tiene la pantalla obligatoria de avisos
    const calls = []; c.on("response", (r) => { if (r.url().includes("/api/push/booking-coach")) calls.push(r.status()); });
    await c.goto(`${U}/inicio/agenda`, { waitUntil: "networkidle" }); await c.waitForTimeout(1000);
    for (let i = 0; i < 2 && !(await c.locator("button.slot:not([disabled])").count()); i++) { await c.getByRole("button", { name: "Semana siguiente" }).click(); await c.waitForTimeout(1200); }
    await c.screenshot({ path: `${S}/push_agenda_cliente.png`, fullPage: true });
    await c.locator("button.slot:not([disabled])").first().click(); await c.getByRole("button", { name: /Confirmar reserva/ }).click(); await c.waitForTimeout(2500);
    const bk = sql(`select id||'|'||(coach_book_notified_at is not null) from bookings where client_id='${CA}' and status='confirmed' order by created_at desc limit 1`);
    if (!bk.endsWith("|true")) throw new Error("no se pidió el aviso de la reserva: " + bk);
    await c.getByRole("button", { name: /Cancelar/ }).first().click(); await c.waitForTimeout(600);
    const yes = c.getByRole("button", { name: /Sí, cancelar/ }); if (await yes.count()) await yes.click(); await c.waitForTimeout(2500);
    const cn = sql(`select status||'|'||(coach_cancel_notified_at is not null) from bookings where id='${bk.split("|")[0]}'`);
    if (cn !== "cancelled|true") throw new Error("cancelación: " + cn);
    return `rutas llamadas: ${calls.join(",")}`;
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
