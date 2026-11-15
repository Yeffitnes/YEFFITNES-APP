// 2-nov: la fila "Jeff te está esperando" (aviso "no ha registrado nada") se abría vacía. Debe mostrar el mensaje y botones.
// Antes: insert into nudges (workspace_id, client_id, kind, day) select workspace_id, id, 'nothing', (now() at time zone 'America/Bogota')::date from clients where profile_id='00000000-0000-0000-0000-00000000000a';
const { chromium, ctxFor, watch } = require("./lib.js");
(async () => { const b = await chromium.launch(), errs = []; const p = await (await ctxFor(b, "camila", true)).newPage(); watch(p, "camila", errs); let bad = 0;
  await p.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  const g = p.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  const row = p.locator("#avisos"); await row.scrollIntoViewIfNeeded();
  const head = row.locator(".qrow-head");
  if ((await head.getAttribute("aria-expanded")) !== "true") await head.click();
  await p.waitForTimeout(400);
  const body = await row.locator(".qrow-body").innerText().catch(() => "");
  const btns = await row.locator(".qrow-body button").allInnerTexts();
  await row.screenshot({ path: __dirname + "/shots/nudge_row.png" });
  if (!/Hoy aún no registras nada/.test(body) || btns.length < 2) bad++;
  // Tocar un botón lleva a la sección
  if (btns.includes("Ir a mi rutina")) { await row.getByRole("button", { name: "Ir a mi rutina" }).click(); await p.waitForTimeout(800); const y = await p.locator("#rutina").evaluate((e) => Math.round(e.getBoundingClientRect().top)); if (y > 400 || y < -50) { bad++; console.log("no bajó a la rutina", y); } }
  // Cerrar y volver a abrir: el contenido vuelve
  await head.click(); await p.waitForTimeout(200); await head.click(); await p.waitForTimeout(300);
  const again = await row.locator(".qrow-body").innerText().catch(() => "");
  if (!/Hoy aún no registras nada/.test(again)) bad++;
  console.log(bad ? "FAIL" : "OK", JSON.stringify({ texto: body.split("\n")[0], botones: btns }), errs.length ? errs.join("\n") : "sin errores");
  await b.close(); process.exit(bad ? 1 : 0); })();
