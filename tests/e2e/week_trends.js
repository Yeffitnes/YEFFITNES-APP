// 22-nov: "Semana a semana" en Progreso. Camila empezó hace 21 días (3 semanas completas + la en curso). Reportes controlados:
// semana 1 = 2, semana 2 = 3, semana 3 = 5 → la gráfica muestra 2/3/5, "+2 · más que la semana anterior" y promedio 3,3.
// Lo ve ella en su Progreso y Yeff en la ficha; en el celular sin desbordar. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`), T = `(now() at time zone 'America/Bogota')::date`;
  sql(`update clients set activated_at = ((${T} - 21) + time '09:00') at time zone 'America/Bogota' where id='${CA}'`);
  sql(`delete from daily_reports where client_id='${CA}'`);
  sql(`insert into daily_reports (workspace_id, client_id, report_date) select c.workspace_id, c.id, ${T} - d from clients c, unnest(array[21,19, 14,12,10, 7,6,5,4,3]) d where c.id='${CA}'`);
  const check = async (p, tag) => {
    await p.locator(".wt-card").waitFor({ timeout: 10000 }); await p.locator(".wt-card").scrollIntoViewIfNeeded();
    await p.locator(".wt-chips").getByRole("button", { name: "Reportes", exact: true }).click(); await p.waitForTimeout(300);
    const vals = await p.locator(".wt-col .wt-val").allInnerTexts(); if (vals.slice(0, 3).join(",") !== "2,3,5") throw new Error("barras: " + vals.join(","));
    const x = await p.locator(".wt-x span").allInnerTexts(); if (x.join(",") !== "S1,S2,S3,Ahora") throw new Error("semanas: " + x.join(","));
    const head = await p.locator(".wt-head").innerText(); if (!/\+2 · más que la semana anterior/.test(head) || !/Promedio: 3,3/.test(head)) throw new Error(head.replace(/\n/g, " | "));
    const row = await p.locator(".wt-row.on").innerText(); if (!/Reportes\s*5/.test(row) || !/\+2/.test(row) || !/3,3/.test(row)) throw new Error("fila: " + row.replace(/\n/g, " | "));
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); if (over) throw new Error("desborda a lo ancho");
    await p.locator(".wt-card").screenshot({ path: `${S}/wt_${tag}.png` });
  };
  await step("Camila (cel): en su Progreso ve sus semanas, la comparación y el promedio", async () => {
    const p = await (await ctxFor(b, "camila", true)).newPage(); watch(p, "camila", errs);
    await p.goto(`${U}/inicio/progreso`, { waitUntil: "networkidle" }); await check(p, "cliente_cel");
    if (!/Así van tus semanas/.test(await p.locator(".wt-title").innerText())) throw new Error("título");
  });
  for (const mobile of [true, false]) await step(`Yeff (${mobile ? "cel" : "pc"}): lo mismo en la ficha, pestaña Progreso`, async () => {
    const p = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(p, "jeff", errs);
    await p.goto(`${U}/coach/clientes/${CA}?tab=Progreso`, { waitUntil: "networkidle" }); await check(p, `coach_${mobile ? "cel" : "pc"}`);
    await p.locator(".wt-chips").getByRole("button", { name: "Entrenos", exact: true }).click(); await p.waitForTimeout(200);
    if (!(await p.locator(".wt-row.on").filter({ hasText: "Entrenos" }).count())) throw new Error("elegir otra métrica no marca su fila");
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
