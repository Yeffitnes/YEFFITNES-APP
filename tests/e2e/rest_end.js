// 12-nov: el descanso sale solo entre series del mismo ejercicio. Al completar un ejercicio, o la rutina, no queda cronómetro. Base recién creada.
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; let fails = 0;
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 240)); } };
(async () => { const b = await chromium.launch(), errs = [];
  const p = await (await ctxFor(b, "camila", true)).newPage(); watch(p, "camila", errs);
  await p.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  const g = p.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  const row = (i) => p.locator(".exercise-list > div").nth(i), bar = () => p.locator(".rest-bar");
  const save = async (i, n) => {
    const r = row(i).locator(`input[aria-label="Repeticiones serie ${n}"]`); if (!(await r.inputValue())) await r.fill("13");
    const w = row(i).locator(`input[aria-label="Peso serie ${n} en kilos"]`); if (!(await w.inputValue())) await w.fill("10");
    await row(i).locator(".set-save").nth(n - 1).click(); await p.waitForTimeout(1000);
  };
  const skip = async () => { const s = bar().getByRole("button", { name: "Saltar" }); if (await s.count()) await s.click(); };
  await row(0).locator(".ex-row").click(); await p.waitForTimeout(300);
  await step("serie 1 y 2 del ejercicio 1: hay descanso", async () => { await save(0, 1); if (!(await bar().count())) throw new Error("sin descanso"); await skip(); await save(0, 2); if (!(await bar().count())) throw new Error("sin descanso en la 2"); await skip(); });
  await step("última serie del ejercicio 1: SIN descanso", async () => { await save(0, 3); await p.screenshot({ path: `${S}/rest_end_1.png` }); if (await bar().count()) throw new Error(await bar().innerText()); });
  await step("ejercicio 2 en desorden: marca la 3 (descanso), luego 1 y 2: al completarse, el descanso se va", async () => {
    await save(1, 3); if (!(await bar().count())) throw new Error("sin descanso"); await save(1, 1); await save(1, 2);
    await p.screenshot({ path: `${S}/rest_end_2.png` }); if (await bar().count()) throw new Error(await bar().innerText());
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
