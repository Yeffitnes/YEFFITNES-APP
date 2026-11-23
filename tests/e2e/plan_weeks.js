// 15-nov (segunda ronda): programas con semanas distintas, editar un programa cuya rutina se eliminó, la ficha con semanas y
// series/repeticiones por cliente, y el editor de rutinas en el celular. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const j = await (await ctxFor(b, "jeff", false)).newPage(); watch(j, "jeff", errs);
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
  await step("programa nuevo de 2 semanas distintas: la semana 2 empieza como copia y se cambia", async () => {
    await j.goto(`${U}/coach/catalogo/programas`, { waitUntil: "networkidle" }); await j.getByRole("button", { name: "Nuevo programa" }).click();
    await j.getByLabel("Nombre").fill("Dos semanas"); await j.getByLabel("Duración").selectOption("2");
    await j.locator("#prg-d0").selectOption({ label: "Pecho y tríceps" }); await j.locator("#prg-d2").selectOption({ label: "Espalda y bíceps" });
    await j.getByRole("radio", { name: /Distinta cada semana/ }).click(); await j.getByRole("tab", { name: "Semana 2" }).click();
    if (await j.locator("#prg-d0 option:checked").innerText() !== "Pecho y tríceps") throw new Error("la semana 2 no empezó como copia");
    await j.locator("#prg-d0").selectOption({ label: "Funcional" }); await j.screenshot({ path: `${S}/pw_editor.png` });
    await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(1500);
    const r = sql(`select string_agg(d.week||'-'||d.weekday||'-'||t.name, ',' order by d.week, d.weekday) from program_days d join program_templates p on p.id=d.program_id join routine_templates t on t.id=d.template_id where p.name='Dos semanas'`);
    if (r !== "1-1-Pecho y tríceps,1-3-Espalda y bíceps,2-1-Funcional,2-3-Espalda y bíceps") throw new Error(r);
    const t = await j.locator(".cat-row", { hasText: "Dos semanas" }).innerText(); if (!/2 semanas distintas/.test(t)) throw new Error(t); return r;
  });
  await step("tarjeta del programa: se despliega y muestra las dos semanas", async () => {
    const c = j.locator(".cat-row", { hasText: "Dos semanas" }); await c.locator(".cat-row-head").click(); await j.waitForTimeout(300);
    const t = (await c.innerText()).replace(/\n/g, " "); if (!/Semana 1.*Semana 2/i.test(t) || !/Funcional/.test(t)) throw new Error(t.slice(0, 200));
    await j.screenshot({ path: `${S}/pw_programas.png` });
  });
  await step("rutina eliminada en un programa: se puede poner Descanso y se guarda", async () => {
    sql(`update routine_templates set active=false where name='Espalda y bíceps'`);
    await j.reload({ waitUntil: "networkidle" }); const c = j.locator(".cat-row", { hasText: "Dos semanas" });
    if (!/rutina eliminada/.test(await c.innerText())) throw new Error("no avisa de la rutina eliminada");
    await c.locator(".cat-row-head").click(); await c.getByRole("button", { name: "Editar", exact: true }).click(); await j.waitForTimeout(400);
    if (!/(eliminada)/.test(await j.locator("#prg-d2 option:checked").innerText())) throw new Error("el selector no muestra la eliminada");
    await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(800);
    if (!(await j.getByText(/rutina eliminada del catálogo/).count())) throw new Error("dejó guardar con la eliminada");
    await j.locator("#prg-d2").selectOption({ label: "Descanso" }); await j.getByRole("tab", { name: "Semana 2" }).click(); await j.locator("#prg-d2").selectOption({ label: "Descanso" });
    await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(1500);
    const n = sql(`select count(*) from program_days d join program_templates p on p.id=d.program_id where p.name='Dos semanas' and d.weekday=3`); if (n !== "0") throw new Error(`quedan ${n} miércoles`);
    sql(`update routine_templates set active=true where name='Espalda y bíceps'`);
  });
  await step("ficha: asignar el programa deja el plan con Semana 1 y Semana 2", async () => {
    await j.goto(`${U}/coach/clientes/${CA}`, { waitUntil: "networkidle" }); await j.locator(".tab-btn", { hasText: "Entrenamiento" }).click(); await j.waitForTimeout(600);
    await j.getByRole("button", { name: "Asignar programa" }).click(); await j.getByLabel(/Dos semanas/).check(); await j.waitForTimeout(300);
    const hint = await j.locator(".modal-cap-hint").last().innerText(); if (!/Semana 1:.*Semana 2:/s.test(hint)) throw new Error(hint);
    await j.locator(".modal-actions").getByRole("button", { name: "Asignar programa" }).click(); await j.waitForTimeout(1800);
    if (await j.getByRole("tab", { name: /Semana 2/ }).count() !== 1) throw new Error("sin pestañas de semana");
    await j.locator(".wk-chip").first().evaluate((e) => { if (!e.classList.contains("sel")) e.click(); }); await j.getByRole("tab", { name: /Semana 2/ }).click(); await j.waitForTimeout(300);
    if (!/Funcional/.test(await j.locator(".tp-dayc-name").innerText())) throw new Error("la semana 2 no tiene Funcional el lunes");
    await j.screenshot({ path: `${S}/pw_ficha.png`, fullPage: true }); return sql(`select cycle_weeks from training_plans where client_id='${CA}' and status='active'`) + " semanas";
  });
  await step("ficha: series, repeticiones, descanso y peso se guardan solo para este cliente", async () => {
    const row = j.locator(".tp-item").first(), name = (await row.locator("b").innerText()).trim();
    await row.getByLabel(`Series de ${name}`).fill("5"); await row.getByLabel(`Repeticiones de ${name}`).click();
    await row.getByLabel(`Repeticiones de ${name}`).fill("6-8"); await row.getByLabel(`Descanso de ${name} en segundos`).click();
    await row.getByLabel(`Descanso de ${name} en segundos`).fill("75"); await row.getByLabel(`Peso objetivo de ${name} en kilos`).click();
    await row.getByLabel(`Peso objetivo de ${name} en kilos`).fill("22.5"); await j.locator(".tp-dayc-name").click(); await j.waitForTimeout(1500);
    const r = sql(`select pi.sets||'|'||pi.reps||'|'||pi.rest_seconds||'|'||pi.target_weight from plan_items pi join plan_days pd on pd.id=pi.plan_day_id join training_plans tp on tp.id=pd.plan_id where tp.client_id='${CA}' and tp.status='active' and pd.week=2 and pd.weekday=1 order by pi.position limit 1`);
    if (r !== "5|6-8|75|22.50") throw new Error(r);
    const cat = sql(`select ti.sets||'|'||ti.reps from template_items ti join routine_templates t on t.id=ti.template_id where t.name='Funcional' order by ti.position limit 1`); if (cat !== "3|10") throw new Error("cambió el catálogo: " + cat);
    await j.reload({ waitUntil: "networkidle" }); return r;
  });
  await step("ficha: + Semana 3 (copia de la 2)", async () => {
    await j.locator(".tab-btn", { hasText: "Entrenamiento" }).click(); await j.waitForTimeout(500);
    await j.getByRole("button", { name: "Armar la semana" }).click(); await j.waitForTimeout(300);   // 22-nov: las semanas se agregan al armar la semana
    await j.getByRole("button", { name: /\+ Semana 3/ }).click(); await j.waitForTimeout(1500);
    const n = sql(`select cycle_weeks||'/'||(select count(*) from plan_days pd where pd.plan_id=tp.id and pd.week=3) from training_plans tp where client_id='${CA}' and status='active'`);
    if (n !== "3/1") throw new Error(n); return n;
  });
  await step("cliente: Plan dice la semana del plan", async () => {
    const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
    await c.goto(`${U}/inicio/plan`, { waitUntil: "networkidle" }); await c.waitForTimeout(1200);
    const t = await c.locator("body").innerText(); if (!/Semana del plan\s*\d de 3/.test(t)) throw new Error("no aparece la semana"); await c.close();
  });
  await step("celular de Jeff: ficha y editor de rutina ordenados, sin desborde", async () => {
    const m = await (await ctxFor(b, "jeff", true)).newPage(); watch(m, "jeff-cel", errs);
    await m.goto(`${U}/coach/clientes/${CA}`, { waitUntil: "networkidle" }); await m.locator(".tab-btn", { hasText: "Entrenamiento" }).click(); await m.waitForTimeout(800);
    await m.locator(".wk-chip").first().evaluate((e) => { if (!e.classList.contains("sel")) e.click(); }); await m.waitForTimeout(300); await m.locator(".tp-items").scrollIntoViewIfNeeded(); await m.screenshot({ path: `${S}/pw_ficha_cel.png` });
    let o = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (o) throw new Error("desborde en la ficha");
    await m.goto(`${U}/coach/catalogo/rutinas`, { waitUntil: "networkidle" }); await m.screenshot({ path: `${S}/pw_rutinas_cel.png` });
    await m.locator(".cat-row").first().locator(".cat-row-head").click(); await m.locator(".cat-row").first().getByRole("button", { name: "Editar", exact: true }).click(); await m.waitForTimeout(600);
    await m.locator(".rf-item").first().scrollIntoViewIfNeeded(); await m.screenshot({ path: `${S}/pw_editor_cel.png` });
    o = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (o) throw new Error("desborde en el editor");
    for (const l of ["Series", "Reps", "Desc. (s)"]) if (!(await m.locator(".rf-item").first().getByText(l, { exact: true }).isVisible())) throw new Error(`sin etiqueta ${l}`);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
