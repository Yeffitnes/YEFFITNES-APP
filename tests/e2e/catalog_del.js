// 15-nov: Editar y Eliminar visibles en cada rutina y programa (pedido de Jeff en la demo), en celular y computador.
// Eliminar pide confirmación, saca la tarjeta del catálogo y no toca el plan de los clientes que ya la tenían. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  // dos programas de prueba con la rutina "Torso"
  sql(`with w as (select id from workspaces limit 1), t as (select id from routine_templates where name='Torso' limit 1),
    p as (insert into program_templates (workspace_id, name, weeks) select id, x, 4 from w, (values ('Programa A'), ('Programa B')) v(x) returning id, workspace_id)
    insert into program_days (program_id, workspace_id, weekday, template_id) select p.id, p.workspace_id, 1, t.id from p, t`);
  const items0 = sql(`select count(*) from plan_items`);
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc", p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, `jeff-${tag}`, errs);
    await step(`[${tag}] cada rutina muestra Editar y Eliminar a la vista`, async () => {
      await p.goto(`${U}/coach/catalogo/rutinas`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      const cards = p.locator(".routine-card"), n = await cards.count(); if (!n) throw new Error("sin rutinas");
      for (let i = 0; i < n; i++) for (const t of ["Editar", "Eliminar"]) { const bt = cards.nth(i).getByRole("button", { name: t, exact: true }); if (!(await bt.isVisible())) throw new Error(`${t} oculto en la tarjeta ${i}`); }
      await p.screenshot({ path: `${S}/catdel_rutinas_${tag}.png` }); return `${n} rutinas`;
    });
    await step(`[${tag}] Editar abre la rutina`, async () => {
      await p.locator(".routine-card").first().getByRole("button", { name: "Editar", exact: true }).click(); await p.waitForTimeout(500);
      if (!(await p.getByText("Editar rutina").count())) throw new Error("no abrió"); await p.getByRole("button", { name: "Cancelar" }).click(); await p.waitForTimeout(300);
    });
    await step(`[${tag}] Eliminar pide confirmar; Cancelar no borra nada`, async () => {
      const c = p.locator(".routine-card").first(); await c.getByRole("button", { name: "Eliminar", exact: true }).click(); await p.waitForTimeout(300);
      const t = await c.locator(".cat-confirm").innerText(); if (!/no pierden su plan/.test(t)) throw new Error(t);
      await c.getByRole("button", { name: "Cancelar" }).click(); await p.waitForTimeout(300); if (await c.locator(".cat-confirm").count()) throw new Error("sigue la pregunta");
    });
    await step(`[${tag}] Sí, eliminar: sale del catálogo, no vuelve al recargar y el plan de los clientes no cambia`, async () => {
      const before = await p.locator(".routine-card").count(), c = p.locator(".routine-card").first(), name = (await c.locator(".routine-name").innerText()).trim(), same = await p.locator(".routine-name", { hasText: name }).count();
      await c.getByRole("button", { name: "Eliminar", exact: true }).click(); await c.getByRole("button", { name: "Sí, eliminar" }).click(); await p.waitForTimeout(1200);
      if (await p.locator(".routine-card").count() !== before - 1) throw new Error("no salió");
      await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000); if (await p.locator(".routine-name", { hasText: name }).count() !== same - 1) throw new Error("volvió");   // puede haber dos con el mismo nombre (0055 + semilla)
      if (sql(`select count(*) from plan_items`) !== items0) throw new Error("cambió el plan de algún cliente"); return name;
    });
    await step(`[${tag}] programas: Editar y Eliminar a la vista; eliminar quita uno`, async () => {
      await p.goto(`${U}/coach/catalogo/programas`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
      const cards = p.locator(".prg-card"), n = await cards.count(); if (!n) throw new Error("sin programas");
      if (!(await cards.first().getByRole("button", { name: "Editar", exact: true }).isVisible()) || !(await cards.first().getByRole("button", { name: "Eliminar", exact: true }).isVisible())) throw new Error("botones ocultos");
      await cards.first().getByRole("button", { name: "Editar", exact: true }).click(); await p.waitForTimeout(500); if (!(await p.getByText("Editar programa").count())) throw new Error("Editar no abrió"); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
      await p.screenshot({ path: `${S}/catdel_programas_${tag}.png` });
      await cards.first().getByRole("button", { name: "Eliminar", exact: true }).click(); await cards.first().getByRole("button", { name: "Sí, eliminar" }).click(); await p.waitForTimeout(1500);
      await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000); const m = await p.locator(".prg-card").count(); if (m !== n - 1) throw new Error(`${n} → ${m}`); return `${n} → ${m}`;
    });
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
