// 4-nov: marcar la ÚLTIMA serie sin haber marcado las de arriba NO recoge el ejercicio ni lo da por hecho.
// Prueba las dos formas de ejercicio: repeticiones fijas ("10", casilla ya llena) y rango ("12-15", casilla vacía). Base recién creada.
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots"; let fails = 0;
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 240)); } };
const state = (p) => p.evaluate(() => Array.from(document.querySelectorAll(".exercise-list > div")).map((d) => ({ name: d.querySelector(".ex-name")?.textContent, meta: d.querySelector(".ex-meta")?.textContent, done: d.querySelector(".ex-row")?.classList.contains("done"), open: !!d.querySelector(".ex-panel"), on: d.querySelectorAll(".set-save.on").length })));
(async () => { const b = await chromium.launch(), errs = [];
  const p = await (await ctxFor(b, "camila", true)).newPage(); watch(p, "camila", errs);
  await p.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  const skip = p.getByRole("button", { name: /Entendido|Omitir|Saltar/ }).first(); if (await skip.count()) await skip.click().catch(() => {});
  const row = (i) => p.locator(".exercise-list > div").nth(i);
  await step("reps fijas: abrir el ejercicio 1 y marcar solo la última serie", async () => {
    await row(0).locator(".ex-row").click(); await p.waitForTimeout(300);
    await row(0).locator(".set-save").nth(2).click(); await p.waitForTimeout(1500);
    const s = await state(p); await p.screenshot({ path: `${S}/set_order_1.png`, fullPage: true });
    if (!s[0].open || s[0].done || s[0].on !== 1 || s[1].open) throw new Error(JSON.stringify(s)); return s[0].meta;
  });
  await step("sigue abierto tras recargar datos y marca la serie 2: tampoco se recoge", async () => {
    await row(0).locator(".set-save").nth(1).click(); await p.waitForTimeout(1200);
    const s = await state(p); if (!s[0].open || s[0].done || s[0].on !== 2) throw new Error(JSON.stringify(s)); return s[0].meta;
  });
  await step("al marcar la que faltaba, sí se da por hecho y pasa al siguiente", async () => {
    await row(0).locator(".set-save").nth(0).click(); await p.waitForTimeout(1200);
    const s = await state(p); if (s[0].open || !s[0].done || !s[1].open) throw new Error(JSON.stringify(s)); return `${s[0].meta} → abre ${s[1].name}`;
  });
  await step("rango: casilla vacía en la última serie no deja guardar sin repeticiones", async () => {
    const dis = await row(1).locator(".set-save").nth(2).isDisabled(); if (!dis) throw new Error("se puede guardar vacía");
  });
  await step("rango: escribir y marcar solo la última serie no recoge el ejercicio", async () => {
    await row(1).locator('input[aria-label="Repeticiones serie 3"]').fill("13");
    const w = row(1).locator('input[aria-label="Peso serie 3 en kilos"]'); if (!(await w.inputValue())) await w.fill("10");
    await row(1).locator(".set-save").nth(2).click(); await p.waitForTimeout(1200);
    const s = await state(p); await p.screenshot({ path: `${S}/set_order_2.png`, fullPage: true });
    if (!s[1].open || s[1].done || s[1].on !== 1) throw new Error(JSON.stringify(s)); return s[1].meta;
  });
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
