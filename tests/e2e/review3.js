// 2-nov (rehecho; 4-nov: lo revisado sale de la lista): Revisar cliente por cliente. Prepara: Camila con reporte de hoy sin ver y su entreno de hace 3 días sin revisar;
// Andrés con entreno de hoy YA revisado. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 240)); } };
(async () => { const b = await chromium.launch(), errs = [];
  sql(`insert into daily_reports (workspace_id, client_id, report_date, comment) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien' from clients where profile_id='00000000-0000-0000-0000-00000000000a' on conflict do nothing`);
  sql(`insert into workout_logs (workspace_id, client_id, log_date, effort, completed_at) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 7, now() from clients where profile_id='00000000-0000-0000-0000-00000000000b' on conflict do nothing`);
  sql(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f0',false); set role authenticated; update workout_logs set coach_seen_at = now(), coach_comment = 'Bien hecho' where log_date = (now() at time zone 'America/Bogota')::date and client_id = (select id from clients where profile_id='00000000-0000-0000-0000-00000000000b');`);
  for (const mobile of [false, true]) {
    const p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, mobile ? "jeff-cel" : "jeff-pc", errs); const tag = mobile ? "cel" : "pc";
    await p.goto("http://localhost:3000/coach", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await step(`[${tag}] panel: tarjeta Revisar legible y con un solo botón`, async () => {
      const c = p.locator(".rv-cta"); await c.screenshot({ path: `${S}/rv_cta_${tag}.png` });
      const st = await c.evaluate((e) => { const b = e.querySelector("b"); return { txt: e.textContent, color: getComputedStyle(b).color, bg: getComputedStyle(e).backgroundImage.slice(0, 20), links: e.tagName }; });
      if (!/Revisar: 1 entrenamiento y 1 reporte/.test(st.txt) || st.color !== "rgb(255, 255, 255)" || !/gradient/.test(st.bg)) throw new Error(JSON.stringify(st)); return st.txt.slice(0, 90);
    });
    if (mobile) await step("[cel] 'Revisar' segundo en el menú", async () => { const nav = await p.locator(".mobile-nav a").allInnerTexts(); if (nav[1] !== "Revisar") throw new Error(nav.join(",")); return nav.slice(0, 3).join(", "); });
    await p.goto("http://localhost:3000/coach/revisar", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${S}/rv_client_${tag}.png`, fullPage: true });
    if (!mobile) {
      await step("[pc] ancho limitado (no llena toda la pantalla)", async () => { const w = await p.locator(".rv-wrap").evaluate((e) => Math.round(e.getBoundingClientRect().width)); if (w > 830) throw new Error(`${w}px`); return `${w}px`; });
      continue;
    }
    await step("[cel] solo sale lo que falta: Camila, y NO Andrés (su entreno de hoy ya está revisado)", async () => {
      const h = await p.locator("h1").innerText(), t = (await p.locator(".rv-card").innerText()).replace(/\n/g, " ");
      if (!/1 cliente por revisar/.test(h) || !/Camila/.test(t) || !/Hoy me sentí bien/.test(t) || !/Pendiente de días anteriores/.test(t) || !/sin entrenamiento hoy/.test(t) || (await p.locator(".rv-sec", { hasText: "Entrenamiento de hoy" }).count()) || /Andrés/.test(await p.locator(".rv-wrap").innerText())) throw new Error(`${h} / ${t.slice(0, 300)}`);
      return h;
    });
    await step("[cel] marcar visto el reporte de HOY: desaparece al momento, sin recargar", async () => {
      await p.getByRole("button", { name: "Marcar visto" }).click(); await p.waitForTimeout(1200);
      const t = (await p.locator(".rv-card").innerText()).replace(/\n/g, " ");
      if (/Reporte de hoy/.test(t) || /Hoy me sentí bien/.test(t) || !/1 por revisar/.test(t)) throw new Error(t.slice(0, 300)); return "sale el reporte, queda 1";
    });
    await step("[cel] revisar lo último: el cliente sale y queda 'Todo revisado' con la pista de dónde volver a verlo", async () => {
      await p.locator(".rv-old-head").first().click(); await p.waitForTimeout(800);
      await p.locator(".rv-old textarea").fill("Bien, baja un poco el peso"); await p.getByRole("button", { name: "Guardar y marcar revisado" }).click(); await p.waitForTimeout(1800);
      const h = await p.locator("h1").innerText(), w = await p.locator(".rv-wrap").innerText(); await p.screenshot({ path: `${S}/rv_done.png`, fullPage: true });
      if (h !== "Todo revisado" || /Camila/.test(w) || !/ficha del cliente/.test(w)) throw new Error(`${h} / ${w.slice(0, 200)}`); return h;
    });
    await step("[cel] sigue en la ficha de Jeff: lo revisado no se perdió", async () => {
      await p.goto(`http://localhost:3000/coach/clientes/${process.env.CLIENT_ID}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      const t = (await p.locator("main, .main").first().innerText()).replace(/\n/g, " "); if (!/Hoy me sentí bien/.test(t)) throw new Error(t.slice(0, 200));
    });
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
