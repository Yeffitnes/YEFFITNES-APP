// 22-nov (pedido de Cristian): ficha del cliente con más diseño.
//  - Entrenamiento: "Arma la semana" con los 7 días y su selector: se asigna la rutina de varios días seguidos sin salir de ahí.
//  - Nutrición: "Editar" y "Quitar" ya no se salen de la tarjeta en el celular.
//  - Progreso: cabecera oscura con el cambio de peso y cintura; nada verde.
// Base recién creada (semilla de pruebas).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
  const plan = sql(`select id from training_plans where client_id='${CA}' and status='active' limit 1`);
  const routines = sql(`select string_agg(name, '|' order by created_at) from routine_templates where active`).split("|");
  const days = () => sql(`select coalesce(string_agg(weekday||':'||name, ',' order by weekday), '') from plan_days where plan_id='${plan}' and week=1`);
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, `jeff-${tag}`, errs);
    await step(`[${tag}] Entrenamiento: cabecera oscura y los 7 días con su selector`, async () => {
      await p.goto(`${U}/coach/clientes/${CA}?tab=Entrenamiento`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      const bg = await p.locator(".tp-hero").evaluate((e) => getComputedStyle(e).backgroundColor + " " + getComputedStyle(e).backgroundImage); if (!/rgb\(10, 9, 16\)/.test(bg)) throw new Error("la cabecera no es oscura: " + bg.slice(0, 120));
      if (await p.locator(".wk-day select").count()) throw new Error("los selectores deberían estar plegados");
      if (await p.locator(".wk-chip").count() !== 7) throw new Error("faltan los 7 días");
      await p.getByRole("button", { name: /^(Armar|Editar) semana$|^Armar la semana$/ }).click(); await p.waitForTimeout(300);
      const n = await p.locator(".wk-day select").count(); if (n !== 7) throw new Error(`${n} selectores`);
      await p.screenshot({ path: `${S}/ficha_entreno_${tag}.png`, fullPage: true });
    });
    await step(`[${tag}] armar la semana: martes, jueves y sábado seguidos, sin salir`, async () => {
      for (const [w, r] of [[2, routines[0]], [4, routines[1] ?? routines[0]], [6, routines[0]]]) {
        await p.locator(".wk-day").nth(w - 1).locator("select").selectOption({ label: r });
        await p.waitForFunction((i) => !document.querySelectorAll(".wk-day")[i].classList.contains("busy"), w - 1, { timeout: 8000 }); await p.waitForTimeout(500);
      }
      const d = days(); for (const w of ["2:", "4:", "6:"]) if (!d.includes(w)) throw new Error("falta el día " + w + " en " + d);
      if (/^Descanso$/m.test(await p.locator(".wk-day").nth(5).locator(".wk-top b").innerText())) throw new Error("el sábado sigue de descanso en pantalla");
      await p.getByRole("button", { name: "Listo" }).click(); await p.waitForTimeout(300);
      if (!/sábado/i.test(await p.locator(".tp-dayc-when").innerText())) throw new Error("no muestra desplegado el día que se acaba de armar");
      await p.screenshot({ path: `${S}/ficha_semana_${tag}.png`, fullPage: true });
      await p.getByRole("button", { name: "Plegar el día" }).click(); await p.waitForTimeout(200); if (await p.locator(".tp-dayc").count()) throw new Error("no se plegó");
      await p.getByRole("button", { name: /^(Armar|Editar) semana$|^Armar la semana$/ }).click(); await p.waitForTimeout(300);
      return d;
    });
    await step(`[${tag}] dejar un día de descanso pide confirmar y lo quita`, async () => {
      await p.locator(".wk-day").nth(5).locator("select").selectOption("");
      await p.locator(".wk-day").nth(5).getByRole("button", { name: "Sí" }).click(); await p.waitForTimeout(1200);
      if (days().includes("6:")) throw new Error("el sábado sigue con rutina");
      sql(`delete from plan_days where plan_id='${plan}' and weekday in (2,4)`);   // deja la semilla como estaba para la otra vuelta
    });
    await step(`[${tag}] día de descanso: texto al lado del muñeco y el botón debajo`, async () => {
      await p.getByRole("button", { name: "Listo" }).click().catch(() => {}); await p.waitForTimeout(200);
      await p.locator(".wk-chip").nth(2).evaluate((e) => { if (!e.classList.contains("sel")) e.click(); }); await p.waitForTimeout(300);
      const t = await p.locator(".tp-rest2 p").boundingBox(), bt = await p.locator(".tp-rest2-btn").boundingBox();
      if (!t || !bt || bt.y < t.y + t.height - 2) throw new Error("el botón no quedó debajo del texto");
      if (t.width < 150) throw new Error(`texto apretado: ${Math.round(t.width)}px`);
      await p.screenshot({ path: `${S}/ficha_descanso_${tag}.png` });
    });
    await step(`[${tag}] vídeo de YouTube de la rutina: se ve dentro de la app (sin enlace afuera)`, async () => {
      sql(`update plan_days set video_ref='dQw4w9WgXcQ' where plan_id='${plan}' and weekday=7`);
      await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(900);
      await p.locator(".wk-chip").nth(6).evaluate((e) => { if (!e.classList.contains("sel")) e.click(); }); await p.waitForTimeout(300);
      if (await p.locator(".tp-dayc a[target=_blank]").count()) throw new Error("hay un enlace que saca de la app");
      await p.locator(".tp-dayc").getByRole("button", { name: "Ver", exact: true }).first().click(); await p.waitForTimeout(600);
      if (!(await p.locator(".video-modal iframe[src*='youtube-nocookie']").count())) throw new Error("no abrió el reproductor");
      if (await p.locator(".video-modal a[href*='youtube.com']").count()) throw new Error("el reproductor tiene enlace a YouTube");
      const pos = await p.locator(".video-modal-backdrop").evaluate((e) => getComputedStyle(e).position); if (pos !== "fixed") throw new Error("sin estilos del reproductor");
      await p.screenshot({ path: `${S}/ficha_yt_${tag}.png` }); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      sql(`update plan_days set video_ref=null where plan_id='${plan}' and weekday=7`);
    });
    await step(`[${tag}] el botón dice "Editar semana" cuando ya hay rutinas`, async () => {
      if (!(await p.getByRole("button", { name: "Editar semana" }).count())) throw new Error("no dice Editar semana");
    });
    await step(`[${tag}] menú del plan: Eliminar cliente está ahí (y no suelto en la ficha)`, async () => {
      if (await p.locator(".del-client-btn").count()) throw new Error("sigue el botón suelto");
      await p.locator(".plan-pill").click(); if (!(await p.locator(".plan-menu").getByRole("button", { name: "Eliminar cliente" }).isVisible())) throw new Error("no está en el menú");
      await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    });
    await step(`[${tag}] Nutrición: los botones caben en la tarjeta`, async () => {
      await p.goto(`${U}/coach/clientes/${CA}?tab=${encodeURIComponent("Nutrición")}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      if (!(await p.locator(".nt-hero .tp-glass").count())) return "sin plan de nutrición en la semilla (no hay botones que revisar)";
      const card = await p.locator(".nt-hero").boundingBox();
      for (const t of ["Editar", "Quitar"]) { const bb = await p.locator(".nt-hero").getByRole("button", { name: t }).boundingBox(); if (bb.x + bb.width > card.x + card.width - 4) throw new Error(`${t} se sale`); }
      await p.screenshot({ path: `${S}/ficha_nutri_${tag}.png`, fullPage: true });
    });
    await step(`[${tag}] Progreso: cabecera oscura y nada verde`, async () => {
      await p.goto(`${U}/coach/clientes/${CA}?tab=Progreso`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      if (!(await p.locator(".pg-hero").count())) throw new Error("sin cabecera");
      const greens = await p.evaluate(() => { const out = []; for (const e of document.querySelectorAll("main *")) { for (const prop of ["color", "backgroundColor", "borderTopColor"]) { const m = getComputedStyle(e)[prop].match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && Number(m[4]) < 0.05)) continue; const [r, g, bl] = [+m[1], +m[2], +m[3]]; if (g > 120 && g > r + 40 && g > bl + 20) out.push(`${e.className || e.tagName} ${prop} ${m[0]}`); } } return out.slice(0, 5); });
      if (greens.length) throw new Error("verde: " + greens.join(" | "));
      await p.screenshot({ path: `${S}/ficha_progreso_${tag}.png`, fullPage: true });
    });
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
