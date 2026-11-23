// 22-nov: armar desde el cliente y que quede guardado en el catálogo. Desde la ficha de Camila: crear una rutina nueva en el
// miércoles (queda en Rutinas y asignada), guardar ese día como rutina, y guardar la semana como programa (queda en Programas).
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`), plan = sql(`select id from training_plans where client_id='${CA}' and status='active' limit 1`);
  const p = await (await ctxFor(b, "jeff", true)).newPage(); watch(p, "jeff", errs);
  await p.goto(`${U}/coach/clientes/${CA}?tab=Entrenamiento`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await step("crear una rutina nueva desde el miércoles: queda en Rutinas y asignada a ese día", async () => {
    await p.getByRole("button", { name: /^(Armar la|Editar) semana$/ }).click(); await p.waitForTimeout(300);
    await p.locator(".wk-day").nth(2).locator("select").selectOption("__new"); await p.waitForTimeout(400);
    if (!/miércoles de Camila/.test(await p.locator(".modal-box").innerText())) throw new Error("no dice que se asigna al miércoles");
    await p.getByLabel("Nombre", { exact: true }).fill("Rutina creada en la ficha");
    const sel = p.getByLabel("Ejercicio 1", { exact: true }), opt = await sel.locator("option").nth(1).getAttribute("value"); await sel.selectOption(opt);
    await p.getByRole("button", { name: "Guardar", exact: true }).click(); await p.waitForTimeout(2000);
    if (sql(`select count(*) from routine_templates where name='Rutina creada en la ficha' and active`) !== "1") throw new Error("no quedó en Rutinas");
    const d = sql(`select name from plan_days where plan_id='${plan}' and weekday=3 and week=1`); if (d !== "Rutina creada en la ficha") throw new Error("miércoles: " + d);
    const it = sql(`select sets||'x'||reps||'/'||rest_seconds from template_items ti join routine_templates t on t.id=ti.template_id where t.name='Rutina creada en la ficha'`);
    if (it !== "3x15-20/120") throw new Error("no usó el estándar: " + it);
  });
  await step("guardar el día como rutina con los ajustes del cliente", async () => {
    await p.getByRole("button", { name: "Listo" }).click(); await p.waitForTimeout(300);
    await p.locator(".wk-chip").nth(2).evaluate((e) => { if (!e.classList.contains("sel")) e.click(); }); await p.waitForTimeout(300);
    const row = p.locator(".tp-item").first(), nm = (await row.locator("b").innerText()).trim();
    await row.getByLabel(`Series de ${nm}`).fill("5"); await row.getByLabel(`Repeticiones de ${nm}`).click(); await p.waitForTimeout(1200);
    await p.getByRole("button", { name: /Guardar este día como rutina/ }).click(); await p.waitForTimeout(400);
    await p.getByLabel("Nombre", { exact: true }).fill("Copia ajustada de Camila"); await p.getByRole("button", { name: "Guardar", exact: true }).click(); await p.waitForTimeout(1800);
    const it = sql(`select string_agg(ti.sets::text, ',') from template_items ti join routine_templates t on t.id=ti.template_id where t.name='Copia ajustada de Camila'`);
    if (!it.startsWith("5")) throw new Error("no guardó el ajuste: " + it);
  });
  await step("guardar la semana como programa: queda en Programas con sus días", async () => {
    await p.getByRole("button", { name: /^(Armar la|Editar) semana$/ }).click(); await p.waitForTimeout(300);
    await p.getByRole("button", { name: "Guardar la semana como programa" }).click(); await p.waitForTimeout(300);
    await p.getByLabel("Nombre del programa").fill("Semana de Camila (prueba)"); await p.screenshot({ path: `${S}/wfc_programa.png` });
    await p.getByRole("button", { name: "Guardar programa" }).click(); await p.waitForTimeout(1500);
    const n = sql(`select (select count(*) from program_days pd where pd.program_id=pt.id) from program_templates pt where pt.name='Semana de Camila (prueba)'`);
    const want = sql(`select count(*) from plan_days where plan_id='${plan}'`); if (n !== want) throw new Error(`${n} días en el programa, ${want} en el plan`);
    await p.goto(`${U}/coach/catalogo/programas`, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
    if (!(await p.getByText("Semana de Camila (prueba)").count())) throw new Error("no sale en Programas");
    await p.goto(`${U}/coach/catalogo/rutinas`, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
    if (!(await p.getByText("Rutina creada en la ficha").count())) throw new Error("no sale en Rutinas");
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
