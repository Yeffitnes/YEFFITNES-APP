// 12-nov: en un ejercicio sin peso, el consejo al cliente habla de repeticiones, no de subir o bajar el peso. Base recién creada.
const { execSync } = require("child_process");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", CID = process.env.CLIENT_ID; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  sql(`update plan_items set target_weight=null where client_id='${CID}' and reps='10'`);
  const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs);
  await c.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await c.waitForTimeout(1500);
  const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  await c.locator(".ex-row", { hasText: "Sentadilla" }).click(); await c.waitForSelector(".ex-panel");
  await step("al abrir: explica repeticiones sin hablar de peso", async () => { const t = await c.locator(".rep-pop").innerText(); if (/peso/.test(t) || !/Jeff te ajusta las repeticiones/.test(t)) throw new Error(t); return t.slice(0, 80); });
  await step("hizo 14 de 10 sin peso: consejo de repeticiones", async () => {
    await c.getByRole("spinbutton", { name: "Repeticiones serie 1" }).fill("14"); await c.getByRole("button", { name: "Guardar serie 1" }).click(); await c.waitForTimeout(900);
    const t = await c.locator(".rep-pop").innerText(); await c.screenshot({ path: `${S}/tip_noweight.png` }); if (/peso/.test(t) || !/subirte las repeticiones/.test(t)) throw new Error(t); return t.slice(0, 90);
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
