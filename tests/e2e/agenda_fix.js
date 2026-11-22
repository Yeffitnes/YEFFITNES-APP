// 22-nov (reporte de Cristian y Yeff): Agenda del coach.
//  - En el celular no se veían las sesiones ya reservadas (la semana muestra un día a la vez): ahora "Sesiones pendientes" lista
//    todas las que vienen, de cualquier semana, y cada día marca en rojo cuántas reservas tiene.
//  - "Publicar disponibilidad" decía publicada sin crear nada cuando esa hora se había quitado antes (0059).
//  - Eliminar un cliente por completo desde su ficha.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`), AN = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000b'`);
  // Dos reservas: Camila en 2 días y Andrés en 9 días (otra semana), a las 10:00 y 16:00 de Bogotá.
  const day = (n) => sql(`select ((now() at time zone 'America/Bogota')::date + ${n})::text`);
  const D2 = day(2), D9 = day(9);
  sql(`with w as (select id from workspaces where slug='yeffitnes'), s as (insert into availability_slots (workspace_id, starts_at, kind) select id, x, 'followup' from w,
      (values (('${D2} 10:00')::timestamp at time zone 'America/Bogota'), (('${D9} 16:00')::timestamp at time zone 'America/Bogota')) v(x) returning id, workspace_id, starts_at)
    insert into bookings (workspace_id, slot_id, client_id, booked_by) select s.workspace_id, s.id, case when s.starts_at < now() + interval '5 days' then '${CA}'::uuid else '${AN}'::uuid end, 'client' from s`);
  const j = await (await ctxFor(b, "jeff", true)).newPage(); watch(j, "jeff-cel", errs);
  await step("celular: 'Sesiones pendientes' muestra las dos reservas, también la de otra semana", async () => {
    await j.goto(`${U}/coach/agenda`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
    if (await j.locator("#pendientes").count()) throw new Error("no debería estar encima de la agenda");
    const bt = await j.locator(".ag-up-btn").innerText(); if (!/Próximas sesiones/.test(bt) || !/\b2\b/.test(bt)) throw new Error("botón: " + bt);
    await j.screenshot({ path: `${S}/agenda_boton_cel.png` });
    await j.locator(".ag-up-btn").click(); await j.waitForTimeout(500);
    const t = await j.locator("#pendientes").innerText();
    if (!/Camila/.test(t) || !/Andrés/.test(t)) throw new Error(t.slice(0, 300));
    if (!/10:00/.test(t) || !/16:00/.test(t)) throw new Error("faltan las horas: " + t.slice(0, 200));
    await j.screenshot({ path: `${S}/agenda_pendientes_cel.png` });
    await j.getByRole("button", { name: "Cerrar" }).click(); await j.waitForTimeout(300);
    if (await j.locator("#pendientes").count()) throw new Error("no se cerró");
  });
  await step("celular: el día con reserva se marca en rojo en las pestañas", async () => {
    const n = await j.locator(".day-tab-n.booked").count(); if (!n) throw new Error("ningún día marcado"); return `${n} día(s)`;
  });
  await step("publicar: una hora quitada vuelve a publicarse y la agenda salta a ese día", async () => {
    const D3 = day(3);
    sql(`insert into availability_slots (workspace_id, starts_at, kind, status) select id, ('${D3} 08:00')::timestamp at time zone 'America/Bogota', 'followup', 'cancelled' from workspaces where slug='yeffitnes'`);
    await j.getByRole("button", { name: "Publicar disponibilidad" }).click();
    await j.getByLabel("Fecha").fill(D3); await j.getByLabel("Desde").fill("08:00"); await j.locator(".modal-box input[type=time]").nth(1).fill("09:00");
    await j.getByLabel("Duración de cada hueco").selectOption("30"); await j.getByRole("button", { name: "Publicar", exact: true }).click();
    await j.getByText("2 horarios publicados").waitFor({ timeout: 6000 });
    const st = sql(`select string_agg(to_char(starts_at at time zone 'America/Bogota','HH24:MI')||' '||status, ',' order by starts_at) from availability_slots where (starts_at at time zone 'America/Bogota')::date = '${D3}'`);
    if (st !== "08:00 open,08:30 open") throw new Error(st);
    await j.waitForTimeout(800); const col = await j.locator(".day-col.active").innerText(); if (!/08:00/.test(col) || !/08:30/.test(col)) throw new Error("no saltó al día publicado: " + col.slice(0, 120));
  });
  await step("publicar lo mismo otra vez: avisa que ya existen, no dice 'publicada'", async () => {
    await j.locator(".day-col.active .add-slot-btn").click(); await j.getByLabel("Desde").fill("08:00"); await j.locator(".modal-box input[type=time]").nth(1).fill("09:00");
    await j.getByRole("button", { name: "Publicar", exact: true }).click();
    await j.getByText(/No se publicó nada: ya tienes horarios a esas horas/).waitFor({ timeout: 6000 });
    await j.screenshot({ path: `${S}/agenda_choque_cel.png` });
  });
  await step("publicar junto a una sesión reservada el mismo día: se crean las horas libres", async () => {
    await j.goto(`${U}/coach/agenda`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
    await j.getByRole("button", { name: "Publicar disponibilidad" }).click(); await j.getByLabel("Fecha").fill(D2);
    await j.getByLabel("Desde").fill("10:00"); await j.locator(".modal-box input[type=time]").nth(1).fill("11:30"); await j.getByRole("button", { name: "Publicar", exact: true }).click();
    await j.getByText(/2 horarios publicados · 1 no/).waitFor({ timeout: 6000 });
  });
  await step("eliminar a Andrés desde su ficha: pide escribir ELIMINAR, lo borra todo y sale de la lista", async () => {
    await j.goto(`${U}/coach/clientes/${AN}`, { waitUntil: "networkidle" }); await j.waitForTimeout(1000);
    await j.getByRole("button", { name: "Eliminar cliente" }).click();
    const btn = j.getByRole("button", { name: "Eliminar para siempre" }); if (await btn.isEnabled()) throw new Error("se puede sin confirmar");
    await j.getByLabel("Escribe ELIMINAR para confirmar").fill("eliminar"); await btn.click();
    await j.waitForURL(/\/coach\/clientes$/, { timeout: 8000 }); await j.waitForTimeout(800);
    if (await j.locator(".client-name", { hasText: "Andrés" }).count()) throw new Error("sigue en la lista");   // (el aviso "fue eliminado" sí lleva el nombre)
    if (sql(`select count(*) from clients where id='${AN}'`) !== "0" || sql(`select count(*) from auth.users where id='00000000-0000-0000-0000-00000000000b'`) !== "0") throw new Error("sigue en la base");
    if (sql(`select count(*) from bookings where client_id='${AN}'`) !== "0") throw new Error("quedaron sus reservas");
    await j.goto(`${U}/coach/agenda`, { waitUntil: "networkidle" }); await j.waitForTimeout(800); await j.locator(".ag-up-btn").click(); await j.waitForTimeout(400);
    if (/Andrés/.test(await j.locator("#pendientes").innerText())) throw new Error("sigue en sesiones pendientes");
  });
  await step("celular: cancelar desde el panel abre 'Cancelar sesión' encima y la quita de la lista", async () => {
    await j.locator("#pendientes .ag-x").first().click(); await j.getByRole("button", { name: "Sí, cancelar sesión" }).click(); await j.waitForTimeout(1500);
    if (!(await j.locator("#pendientes").count())) throw new Error("se cerró el panel");
    if (/Camila/.test(await j.locator("#pendientes").innerText())) throw new Error("sigue Camila");
  });
  const pc = await (await ctxFor(b, "jeff", false)).newPage(); watch(pc, "jeff-pc", errs);
  await step("computador: el botón abre el panel de próximas sesiones", async () => {
    await pc.goto(`${U}/coach/agenda`, { waitUntil: "networkidle" }); await pc.waitForTimeout(1000);
    await pc.screenshot({ path: `${S}/agenda_boton_pc.png` }); await pc.locator(".ag-up-btn").click(); await pc.waitForTimeout(500);
    if (!/Próximas sesiones/.test(await pc.locator("#pendientes").innerText())) throw new Error("no abrió"); await pc.screenshot({ path: `${S}/agenda_pendientes_pc.png` });
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
