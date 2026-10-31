// 30-oct, noche: programas, respuestas guardadas, revisar pendientes, resumen semanal (Jeff) y récords, descanso, sin señal,
// hábitos y antes/después (cliente), cruzando los dos paneles. Correr sobre una base recién creada (run.sh setup).
const { chromium, ctxFor, watch } = require("./lib.js");
const S = require("path").join(__dirname, "shots"); const log = (...a) => console.log(...a);
let fails = 0, cur = "";
const step = async (name, fn) => { cur = name; try { const r = await fn(); log("OK  ", name, r ?? ""); } catch (e) { fails++; log("FAIL", name, "→", e.message.split("\n")[0].slice(0, 180)); } };
const U = "http://localhost:3000";
(async () => {
  const b = await chromium.launch(), errs = [];
  // ---------- Cliente (Camila, celular) ----------
  const cc = await ctxFor(b, "camila", true), c = await cc.newPage(); watch(c, "camila", errs); c.on("pageerror", () => errs.push(`[camila] en ${c.url()} (paso actual: ${cur})`));
  await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(800);
  const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click();
  await step("hábitos: agua +2, pasos 5400, sueño", async () => {
    const h = c.locator("#habitos"); await h.scrollIntoViewIfNeeded();
    await h.getByRole("button", { name: "Un vaso más" }).click(); await c.waitForTimeout(250); await h.getByRole("button", { name: "Un vaso más" }).click();
    await h.getByLabel("Pasos de hoy").fill("5400"); await h.getByLabel("Pasos de hoy").press("Enter");
    await h.getByRole("button", { name: "Media hora más" }).click(); await c.waitForTimeout(1200);
    const t = (await h.innerText()).replace(/\n/g, " "); if (!/Agua.*2/.test(t) || !/7/.test(t)) throw new Error(t.slice(0, 120)); return t.slice(0, 90);
  });
  await step("rutina: guardar serie → temporizador de descanso", async () => {
    await c.locator(".ex-row", { hasText: "Sentadilla" }).click(); await c.waitForSelector(".ex-panel");
    await c.getByRole("button", { name: "Guardar serie 1" }).click(); await c.waitForSelector(".rest-bar", { timeout: 3000 });
    const t = await c.locator(".rest-bar").innerText(); await c.screenshot({ path: `${S}/x_rest.png` });
    await c.locator(".rest-bar").getByRole("button", { name: "+15 s" }).click();
    const t2 = await c.locator(".rest-bar").innerText(); await c.locator(".rest-bar").getByRole("button", { name: "Saltar" }).click();
    if (await c.locator(".rest-bar").count()) throw new Error("no se cerró"); return `${t.split("\n")[0]} → +15 → ${t2.split("\n")[0]}`;
  });
  await step("récord: 42,5 kg supera su mejor 40 kg", async () => {
    await c.getByLabel("Peso serie 2 en kilos").fill("42.5"); await c.getByRole("button", { name: "Guardar serie 2" }).click();
    await c.waitForSelector(".rec-pop", { timeout: 4000 }); await c.waitForTimeout(700); const t = (await c.locator(".rec-pop").innerText()).replace(/\n/g, " ");
    await c.screenshot({ path: `${S}/x_record.png` }); await c.locator(".rec-pop").click(); return t.slice(0, 100);
  });
  await step("sin señal: la serie se guarda en el teléfono y se envía al volver", async () => {
    await c.locator(".rest-bar").getByRole("button", { name: "Saltar" }).click().catch(() => {});
    await cc.setOffline(true); await c.waitForTimeout(300);
    await c.getByRole("button", { name: "Guardar serie 3" }).click(); await c.waitForTimeout(600);
    const banner = await c.locator(".off-banner").innerText(); const on = /3\/3/.test(await c.locator(".ex-row", { hasText: "Sentadilla" }).innerText()) ? 1 : 0;   // al completarlo, la rutina pasa sola al siguiente ejercicio
    await c.screenshot({ path: `${S}/x_offline.png` });
    if (!/Sin señal/.test(banner) || !on) throw new Error(`banner=${banner} marcada=${on}`);
    await cc.setOffline(false); await c.waitForTimeout(4000);
    const left = await c.locator(".off-banner").count();
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(800);
    const saved = /3\/3/.test(await c.locator(".ex-row", { hasText: "Sentadilla" }).innerText()) ? 1 : 0;
    if (left || !saved) throw new Error(`bannerTrasVolver=${left} guardadaEnBase=${saved}`); return "enviada al volver la señal";
  });
  await step("sin señal: terminar el entrenamiento y que llegue al volver", async () => {
    await c.getByRole("button", { name: "Esfuerzo 8" }).click();
    await cc.setOffline(true); await c.getByRole("button", { name: "Terminar entrenamiento" }).click(); await c.waitForTimeout(800);
    const folded = await c.locator(".fold-card").count(); await cc.setOffline(false); await c.waitForTimeout(4500);
    await c.reload({ waitUntil: "networkidle" }); await c.waitForTimeout(800);
    const after = await c.locator(".fold-card").count(); if (!folded || !after) throw new Error(`plegada sin señal=${folded} tras volver=${after}`); return "terminado y enviado";
  });
  await step("progreso: tu semana, récords y logros", async () => {
    await c.goto(`${U}/inicio/progreso`, { waitUntil: "networkidle" }); await c.waitForTimeout(800);
    const w = (await c.locator(".wk-card").innerText()).replace(/\n/g, " "), r = (await c.locator(".rec-card").innerText()).replace(/\n/g, " ");
    await c.screenshot({ path: `${S}/x_progreso.png`, fullPage: true });
    if (!/Agua/i.test(w) || !/Pasos/i.test(w) || !/Sentadilla/.test(r) || !/42,5/.test(r)) throw new Error(`${w.slice(0, 80)} || ${r.slice(0, 80)}`);
    return `${w.slice(0, 70)} | ${r.slice(0, 60)}`;
  });

  // ---------- Jeff (computador) ----------
  const jc = await ctxFor(b, "jeff", false), j = await jc.newPage(); watch(j, "jeff", errs);
  await step("programa: crear 'Base 3 días' (lun, mié y hoy)", async () => {
    await j.goto(`${U}/coach/catalogo/programas`, { waitUntil: "networkidle" }); await j.getByRole("button", { name: "Nuevo programa" }).click();
    await j.getByLabel("Nombre").fill("Base 3 días"); await j.getByLabel("Duración").selectOption("6");
    const wd = (new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })).getDay() + 6) % 7;
    const opt = async (i, label) => j.locator(`#prg-d${i}`).selectOption({ label });
    await opt(0, "Pierna completa"); await opt(2, "Torso"); await opt(wd, "Pierna completa");
    await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(1200);
    const t = (await j.locator(".prg-card").first().innerText()).replace(/\n/g, " "); await j.screenshot({ path: `${S}/x_programas.png` });
    if (!/Base 3 días/.test(t) || !/6 semanas/i.test(t)) throw new Error(t.slice(0, 120)); return t.slice(0, 90);
  });
  let andres = "";
  await step("programa: asignarlo a Andrés desde su ficha", async () => {
    await j.goto(`${U}/coach/clientes`, { waitUntil: "networkidle" }); await j.locator("a, .client-row", { hasText: "Andrés" }).first().click(); await j.waitForURL(/clientes\/.+/); andres = j.url().split("/clientes/")[1].split("?")[0];
    await j.locator(".tab-btn", { hasText: "Entrenamiento" }).click(); await j.getByRole("button", { name: "Asignar programa" }).click();
    await j.getByLabel("Base 3 días").check(); await j.locator(".modal-actions").getByRole("button", { name: "Asignar programa" }).click(); await j.waitForTimeout(1500);
    const t = (await j.locator("body").innerText()); if (!/Base 3 días/.test(t)) throw new Error("no aparece el plan"); return "plan Base 3 días activo";
  });
  // Andrés ve su rutina de hoy (cruce de paneles)
  const ac = await ctxFor(b, "andres", true), a = await ac.newPage(); watch(a, "andres", errs);
  await step("Andrés: ve hoy la rutina del programa", async () => {
    await a.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await a.waitForTimeout(1000); const t = await a.locator("#rutina").innerText();
    if (!/Pierna completa/.test(t)) throw new Error(t.slice(0, 80)); return "Pierna completa";
  });
  await step("Andrés: señal que falla + recargar con algo en espera (sin redibujar, error 418)", async () => {
    let e418 = false; a.on("pageerror", (e) => { if (/418|422|423|425/.test(e.message)) e418 = true; });
    await a.route("**/rest/v1/rpc/log_set", (r) => r.abort("failed"));
    await a.screenshot({ path: `${S}/x_andres_antes.png` });
    await a.locator(".ex-row", { hasText: "Sentadilla" }).click({ timeout: 8000 }); await a.waitForSelector(".ex-panel");
    await a.getByRole("button", { name: "Guardar serie 1" }).click(); await a.waitForTimeout(800);
    const b1 = await a.locator(".off-banner").innerText().catch(() => "");
    await a.reload({ waitUntil: "networkidle" }); await a.waitForTimeout(1200);
    const row = await a.locator(".ex-row", { hasText: "Sentadilla" }).innerText();
    await a.unroute("**/rest/v1/rpc/log_set"); await a.evaluate(() => window.dispatchEvent(new Event("online"))); await a.waitForTimeout(2500);
    await a.reload({ waitUntil: "networkidle" }); await a.waitForTimeout(1000);
    const row2 = await a.locator(".ex-row", { hasText: "Sentadilla" }).innerText(), b2 = await a.locator(".off-banner").count();
    if (e418 || !/pendiente/.test(b1) || !/1\/3/.test(row) || !/1\/3/.test(row2) || b2) throw new Error(`418=${e418} aviso=${b1.slice(0, 40)} trasRecargar=${row.replace(/\n/g, " ")} enviada=${row2.replace(/\n/g, " ")} avisoFinal=${b2}`);
    return "en espera tras recargar, luego enviada";
  });
  await step("respuestas guardadas: guardar y reusar en Mensajes", async () => {
    await j.goto(`${U}/coach/mensajes?c=${andres}`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
    const box = j.getByLabel("Escribe tu mensaje"); await box.fill("Vas muy bien, sigue así."); await j.getByRole("button", { name: "Guardar esta" }).click(); await j.waitForTimeout(1000);
    await box.fill(""); await j.locator(".snip", { hasText: "Vas muy bien" }).click(); const v = await box.inputValue();
    if (v !== "Vas muy bien, sigue así.") throw new Error(v); return "chip → texto";
  });
  await step("revisar pendientes: revisar el entreno de Camila y pasa al siguiente", async () => {
    await j.goto(`${U}/coach/revisar`, { waitUntil: "networkidle" }); await j.waitForTimeout(1000);
    const h = await j.locator("h1").innerText(); await j.screenshot({ path: `${S}/x_revisar.png` });
    const card = j.locator(".card", { hasText: "Camila" }).first(); await card.locator("textarea").fill("Excelente récord.");
    await j.locator(".snip", { hasText: "Vas muy bien" }).first().click();
    await j.getByRole("button", { name: "Guardar y marcar revisado" }).click(); await j.waitForTimeout(1500);
    const h2 = await j.locator("h1").innerText(); if (h === h2) throw new Error(`${h} → ${h2}`); return `${h} → ${h2}`;
  });
  await step("ficha: resumen de la semana con hábitos y récord", async () => {
    await j.goto(`${U}/coach/clientes/${process.env.CLIENT_ID}?tab=Resumen`, { waitUntil: "networkidle" }); await j.waitForTimeout(1000);
    const resumen = j.locator(".tab-btn", { hasText: "Resumen" }); if (await resumen.count()) await resumen.click();
    const t = (await j.locator(".wk-card").innerText()).replace(/\n/g, " "); await j.locator(".wk-card").screenshot({ path: `${S}/x_resumen.png` });
    if (!/Agua/i.test(t) || !/Sentadilla/.test(t)) throw new Error(t.slice(0, 160));
    const href = await j.getByRole("link", { name: /Enviarle el resumen/ }).getAttribute("href"); return decodeURIComponent(href.split("t=")[1]).slice(0, 110);
  });
  await step("Camila: ve la respuesta de Jeff (con la frase guardada)", async () => {
    await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1200); const t = await c.locator("body").innerText();
    if (!/Excelente récord\. Vas muy bien/.test(t)) throw new Error("no"); return "ok";
  });
  await step("celular de Jeff: catálogo de programas sin desborde", async () => {
    const mc = await ctxFor(b, "jeff", true), m = await mc.newPage(); await m.goto(`${U}/coach/catalogo/programas`, { waitUntil: "networkidle" });
    const o = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth); await m.screenshot({ path: `${S}/x_programas_movil.png`, fullPage: true }); await mc.close();
    if (o) throw new Error("desborde"); return "ok";
  });
  log("\n=== ERRORES DE CONSOLA/RED ===\n" + (errs.length ? errs.join("\n") : "ninguno"));
  await b.close(); process.exit(fails ? 1 : 0);
})();
