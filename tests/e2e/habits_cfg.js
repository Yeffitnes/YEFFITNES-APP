// 12-nov: hábitos que configura Jeff. Base recién creada. Camila: 7 días con agua 3 (por debajo de 6), pasos 8.000 y sueño 7.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000", CID = process.env.CLIENT_ID;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
let fails = 0; const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 300)); } };
(async () => { const b = await chromium.launch(), errs = [];
  sql(`insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) select id, workspace_id, ${hoy} - g, 3, 8000, 7 from clients, generate_series(1,7) g where id='${CID}' on conflict (client_id, day) do update set water=3, steps=8000, sleep=7`);
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", j = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(j, `jeff-${tag}`, errs);
    const board = async () => { await j.goto(`${U}/coach/habitos`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200); };
    const cell = (name, col) => j.locator("tr", { hasText: name }).locator("td").nth(col);
    await step(`[${tag}] Jeff ve quién cumple: Camila por debajo en agua, cumple pasos y sueño`, async () => {
      await board(); await j.screenshot({ path: `${S}/hb_board_${tag}.png`, fullPage: true });
      const sum = (await j.locator(".hb-sum").innerText()).replace(/\n/g, " "), a = await cell("Camila", 0).getAttribute("class"), p = await cell("Camila", 1).getAttribute("class"), t = await cell("Camila", 0).innerText();
      if (!/agua/i.test(sum) || !/low/.test(a) || !/ok/.test(p) || !/3 vasos/.test(t) || !/7\/7 días/.test(t)) throw new Error(JSON.stringify([sum, a, p, t]));
      const sw = await j.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (sw > 1) throw new Error(`la página se sale ${sw}px`);
      return sum.slice(0, 90);
    });
    if (mobile) { await j.close(); continue; }
    await step("[pc] agrega 'Lectura' (20 min al día) y 'Estiramiento' (sí/no, 5 días por semana)", async () => {
      await j.getByRole("button", { name: "+ Agregar hábito" }).click(); const n = j.locator(".hb-new");
      await n.getByPlaceholder("Lectura").fill("Lectura"); await n.getByPlaceholder("min").fill("min"); await n.getByPlaceholder("20").fill("20"); await n.getByRole("button", { name: "Agregar" }).click(); await j.waitForTimeout(1200);
      await j.getByRole("button", { name: "+ Agregar hábito" }).click(); const m = j.locator(".hb-new");
      await m.getByPlaceholder("Lectura").fill("Estiramiento"); await m.locator("select").selectOption("check"); await m.getByPlaceholder("5").fill("5"); await m.getByRole("button", { name: "Agregar" }).click(); await j.waitForTimeout(1200);
      const r = sql("select string_agg(name||'|'||kind||'|'||coalesce(unit,'-')||'|'||goal, ', ' order by position) from habit_defs where key is null"); if (r !== "Lectura|number|min|20.0, Estiramiento|check|-|5.0") throw new Error(r);
      await j.locator("#configurar").screenshot({ path: `${S}/hb_config.png` }); return r;
    });
    await step("[pc] meta de pasos de Camila en su ficha: 10.000 → en Hábitos queda por debajo con 'su meta'", async () => {
      await j.goto(`${U}/coach/clientes/${CID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
      const c = j.locator("#metas-habitos"); await c.getByLabel("Meta de Pasos para Camila").fill("10.000"); await c.getByLabel("Meta de Pasos para Camila").press("Enter"); await j.waitForTimeout(1000);
      await c.screenshot({ path: `${S}/hb_client_goals.png` });
      const g = sql(`select g.goal from client_habit_goals g join habit_defs d on d.id=g.habit_id where d.key='steps'`); if (Number(g) !== 10000) throw new Error(g);
      await board(); const p = await cell("Camila", 1).getAttribute("class"), t = await cell("Camila", 1).innerText(); if (!/low/.test(p) || !/su meta 10\.000 pasos/.test(t)) throw new Error(`${p} ${t}`); return t.replace(/\n/g, " ");
    });
    await step("[pc] Camila: Lectura 'No aplica'; Sueño apagado para todos", async () => {
      await j.goto(`${U}/coach/clientes/${CID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1200);
      await j.locator("#metas-habitos .hb-def", { hasText: "Lectura" }).getByRole("button", { name: "Aplica" }).click(); await j.waitForTimeout(900);
      await board(); await j.locator("#configurar .hb-def", { hasText: "Sueño" }).getByRole("button", { name: "Activo" }).click(); await j.waitForTimeout(1200);
      const r = sql("select (select off from client_habit_goals g join habit_defs d on d.id=g.habit_id where d.name='Lectura')::text || '|' || (select active from habit_defs where key='sleep')::text"); if (r !== "true|false") throw new Error(r);
    });
    await j.close();
  }
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await step("cliente: ve agua, pasos y estiramiento con su meta; no ve sueño ni lectura", async () => {
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1500); const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
    const h = c.locator("#habitos"); await h.scrollIntoViewIfNeeded(); const t = (await h.innerText()).replace(/\n/g, " "); await h.screenshot({ path: `${S}/hb_client.png` });
    if (!/Estiramiento/.test(t) || /Sueño/.test(t) || /Lectura/.test(t) || !/meta 10\.000/.test(t) || !/meta 6/.test(t)) throw new Error(t); return t.slice(0, 120);
  });
  await step("cliente: marca Estiramiento hecho y queda en la base", async () => {
    await c.locator("#habitos").getByRole("button", { name: "Marcar hecho" }).click(); await c.waitForTimeout(1200);
    const v = sql(`select extra::text from habit_logs where client_id='${CID}' and day=${hoy}`); if (!/: 1/.test(v)) throw new Error(v); return v;
  });
  await step("cliente: Lectura vuelve a aplicar y la anota (25 min)", async () => {
    sql(`delete from client_habit_goals g using habit_defs d where d.id=g.habit_id and d.name='Lectura'`);
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(1500);
    const i = c.locator("#habitos").getByLabel("Lectura de hoy"); await i.fill("25"); await i.press("Enter"); await c.waitForTimeout(1200);
    const v = sql(`select (extra->>(select id::text from habit_defs where name='Lectura')) from habit_logs where client_id='${CID}' and day=${hoy}`); if (v !== "25") throw new Error(v);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
