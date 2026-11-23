// 22-nov (noche): sesiones agendadas. Camila tiene sesión mañana a las 7:00 a. m.
// - Yeff: "Sesiones agendadas" es lo primero del panel (computador y celular), con Recordarle (queda "Recordado"), Escribirle y Calendario.
// - Camila: arriba de Hoy, "Mañana tienes sesión con Yeff" con "Calendario" (en iPhone abre el .ics de /api/ics).
// - /api/ics devuelve un calendario con las 2 alarmas. Base recién creada (necesita la 0063).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
  sql(`update bookings set status='cancelled', cancelled_at=now(), cancelled_by='client' where status='confirmed'`);
  const d = sql(`select ((now() at time zone 'America/Bogota')::date + 1)::text`);
  const slot = sql(`insert into availability_slots (workspace_id, starts_at, kind) select id, ('${d} 07:00')::timestamp at time zone 'America/Bogota', 'followup' from workspaces where slug='yeffitnes' on conflict (workspace_id, starts_at) do update set status='open', kind='followup' returning id`).split("\n")[0];
  sql(`insert into bookings (workspace_id, slot_id, client_id, booked_by) select workspace_id, '${slot}', '${CA}', 'client' from availability_slots where id='${slot}'`);
  for (const [tag, mobile] of [["pc", false], ["cel", true]]) {
    const p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, `jeff-${tag}`, errs);
    await step(`Yeff (${tag}): la tarjeta de sesiones es lo primero del panel`, async () => {
      await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.locator(".ss-card").waitFor({ timeout: 8000 });
      const t = await p.locator(".ss-card").innerText(); if (!/Camila/.test(t) || !/Mañana/.test(t) || !/7:00/.test(t)) throw new Error(t);
      const first = await p.evaluate(() => { const c = document.querySelector(".ss-card"), r = document.querySelector(".rv-cta"); return !!c && !!r && (c.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; });
      if (!first) throw new Error("no va antes que Revisar");
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (over > 1) throw new Error(`desborda ${over}px`);
      await p.locator(".ss-card").screenshot({ path: `${S}/ss_coach_${tag}.png` });
    });
  }
  const p = await (await ctxFor(b, "jeff", true)).newPage(); watch(p, "jeff", errs);
  await step("Recordarle: queda Recordado y no se puede repetir hoy", async () => {
    await p.goto(`${U}/coach`, { waitUntil: "networkidle" }); await p.locator(".ss-card").waitFor({ timeout: 8000 });
    await p.getByRole("button", { name: /Recordarle/ }).click(); await p.getByText("Recordado").waitFor({ timeout: 6000 });
    if (sql(`select (coach_reminded_at is not null)::text from bookings where slot_id='${slot}' and status='confirmed'`) !== "true") throw new Error("no quedó en la base");
    if (await p.getByRole("button", { name: /Recordarle/ }).count()) throw new Error("sigue el botón");
  });
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await step("Camila: arriba de Hoy, mañana tiene sesión con Yeff, con Calendario", async () => {
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.locator(".sess-soon").waitFor({ timeout: 8000 }); await c.waitForTimeout(1500);
    const t = await c.locator(".sess-soon").evaluate((e) => [e.textContent, e.getBoundingClientRect().height, getComputedStyle(e).visibility, document.querySelectorAll(".sess-soon").length].join("|")); if (!/Mañana tienes sesión con Yeff/.test(t) || !/7:00/.test(t)) throw new Error(JSON.stringify(t));
    const href = await c.locator(".sess-soon a", { hasText: "Calendario" }).getAttribute("href"); if (!/^\/api\/ics\?/.test(href ?? "")) throw new Error(`enlace ${href}`);
    const r = await c.request.get(`${U}${href}`), body = await r.text();
    if (!/text\/calendar/.test(r.headers()["content-type"] ?? "") || !/TRIGGER:-P1D/.test(body) || !/TRIGGER:-PT1H/.test(body) || !/con Yeff/.test(body)) throw new Error(JSON.stringify(body.slice(0, 300)));
    const over = await c.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (over > 1) throw new Error(`desborda ${over}px`);
    await c.screenshot({ path: `${S}/ss_cliente_hoy.png` });
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
