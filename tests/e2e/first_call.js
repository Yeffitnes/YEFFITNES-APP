// 22-nov: primera llamada guiada. Un cliente activo que nunca agendó entra a la app → va directo a la agenda guiada: el personaje
// le dice qué hacer, días en una fila y horas por mañana/tarde/noche, confirmar abajo. "Calendario completo" lleva a la agenda de
// siempre y desde allí se vuelve con el mismo cambio (22-nov, noche). Sin horarios: lo dice, y a Yeff le sale "N clientes esperan"
// en su Agenda. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const LA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000c'`);
  sql(`update clients set status='active', plan_id=(select id from plans where name='Completo' limit 1), onboarded_at=now(), activated_at=now() where id='${LA}'`);
  sql(`delete from bookings where client_id='${LA}'`);
  sql(`update availability_slots set status='cancelled' where starts_at > now() and not exists (select 1 from bookings bk where bk.slot_id=availability_slots.id and bk.status='confirmed')`);
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff", errs);
  await step("sin horarios de llamada inicial: a Yeff le sale que Laura espera, con 'Publicar horarios'", async () => {
    await j.goto(`${U}/coach/agenda`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    const t = await j.locator(".ag-wait").innerText(); if (!/Laura/.test(t) || !/Publicar horarios/.test(t)) throw new Error(t);
    await j.screenshot({ path: `${S}/fc_coach_espera.png` });
  });
  const l = await (await ctxFor(b, "laura", true)).newPage(); watch(l, "laura", errs);
  await step("Laura entra a la app y la lleva a la agenda guiada; sin horarios lo dice", async () => {
    await l.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await l.waitForURL(/\/inicio\/agenda/, { timeout: 8000 }); await l.waitForTimeout(1000);
    if (!/Aún no hay horarios/.test(await l.locator(".fcp").innerText())) throw new Error("no dice que no hay horarios");
  });
  await step("con horarios: lista grande por día, eligir y confirmar con el botón grande", async () => {
    const d = sql(`select ((now() at time zone 'America/Bogota')::date + 2)::text`);
    sql(`insert into availability_slots (workspace_id, starts_at, kind) select id, x, 'initial' from workspaces, (values (('${d} 07:00')::timestamp at time zone 'America/Bogota'), (('${d} 18:30')::timestamp at time zone 'America/Bogota')) v(x) where slug='yeffitnes' on conflict (workspace_id, starts_at) do update set status='open', kind='initial'`);
    await l.reload({ waitUntil: "networkidle" }); await l.waitForTimeout(1200);
    const hours = await l.locator(".fcp-hour").allInnerTexts(); if (hours.length < 2 || !/7:00 a\. m\./.test(hours.join("|")) || !/6:30 p\. m\./.test(hours.join("|"))) throw new Error(hours.join("|"));
    if (!/Elige el día y la hora/.test(await l.locator(".fcp-hero p").innerText())) throw new Error("el personaje no explica");
    const parts = await l.locator(".fcp-part-t").allInnerTexts(); if (parts.join("|") !== "Mañana|Noche") throw new Error(`partes del día: ${parts.join("|")}`);
    if ((await l.locator(".fcp-dchip").count()) < 1) throw new Error("sin fila de días");
    await l.screenshot({ path: `${S}/fc_lista.png`, fullPage: true });
    await l.locator(".fcp-hour").first().click(); await l.waitForTimeout(300);
    if (!/Confirmar mi llamada/.test(await l.locator(".fcp-hero p").innerText())) throw new Error("el personaje no dice el siguiente paso");
    if (!/now/.test(await l.locator(".fcp-steps li").nth(1).getAttribute("class"))) throw new Error("el paso 2 no está marcado");
    await l.screenshot({ path: `${S}/fc_elegido.png` });
    await l.locator(".fcp-hour").first().click(); await l.waitForTimeout(200);
    // Calendario completo y volver a la lista sencilla con el mismo cambio
    await l.getByRole("tab", { name: /Calendario completo/ }).click(); await l.locator(".cal-grid").waitFor({ timeout: 5000 });
    if (await l.locator(".fcp-hero").count()) throw new Error("sigue la lista al pedir el calendario");
    await l.waitForTimeout(800); if (!(await l.locator(".cal-grid .slot").count())) throw new Error("el calendario no abrió en la semana del horario");
    await l.screenshot({ path: `${S}/fc_calendario.png` });
    await l.getByRole("tab", { name: /Horarios para ti/ }).click(); await l.locator(".fcp-hero").waitFor({ timeout: 5000 });
    await l.locator(".fcp-hour").first().click(); await l.waitForTimeout(300);
    await l.getByRole("button", { name: "Confirmar mi llamada" }).click(); await l.locator(".fcp-done").waitFor({ timeout: 8000 });
    if (sql(`select count(*) from bookings where client_id='${LA}' and status='confirmed'`) !== "1") throw new Error("no quedó la reserva");
    await l.screenshot({ path: `${S}/fc_listo.png` });
  });
  await step("ya agendada: al entrar se queda en Hoy y la agenda es la de siempre", async () => {
    await l.evaluate(() => sessionStorage.clear()); await l.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await l.waitForTimeout(1500);
    if (/\/inicio\/agenda/.test(l.url())) throw new Error("la volvió a llevar a la agenda");
    await l.goto(`${U}/inicio/agenda`, { waitUntil: "networkidle" }); await l.waitForTimeout(1000); if (await l.locator(".fcp").count()) throw new Error("sigue la agenda guiada");
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
