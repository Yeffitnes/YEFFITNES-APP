const { chromium, ctxFor, watch } = require("./lib.js");
const S = require("path").join(__dirname, "shots"); const log = (...a) => console.log(...a);
const step = async (name, fn) => { try { const r = await fn(); log("OK  ", name, r ?? ""); } catch (e) { log("FAIL", name, "→", e.message.split("\n")[0].slice(0, 160)); } };
(async () => {
  const b = await chromium.launch(), errs = [];
  // ---------- CLIENTE (Camila, celular) ----------
  const cc = await ctxFor(b, "camila", true), c = await cc.newPage(); watch(c, "camila", errs);
  await c.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" });
  await step("cliente: cerrar guía de registro", async () => { const g = c.getByRole("button", { name: "Entendido" }); if (await g.count()) await g.first().click(); });
  await step("rutina: abrir Sentadilla", async () => { await c.locator(".ex-row", { hasText: "Sentadilla" }).click(); await c.waitForSelector(".ex-panel"); });
  await step("rutina: marcar SOLO la serie 3 no avanza", async () => {
    await c.getByRole("button", { name: "Guardar serie 3" }).click(); await c.waitForTimeout(1200);
    const open = await c.locator(".ex-row", { hasText: "Sentadilla" }).getAttribute("aria-expanded"), done = await c.locator(".ex-row.done").count();
    if (open !== "true" || done) throw new Error(`abierto=${open} hechos=${done}`); return "sigue abierto, 0 hechos";
  });
  await step("rutina: serie 1 con 7 reps → consejo", async () => {
    const r = c.getByRole("spinbutton", { name: "Repeticiones serie 1" }); await r.fill("7"); await c.getByRole("button", { name: "Guardar serie 1" }).click(); await c.waitForTimeout(900);
    const t = await c.locator(".rep-pop").innerText().catch(() => ""); if (!/7/.test(t)) throw new Error("sin consejo: " + t); return t.slice(0, 90);
  });
  await step("rutina: serie 2 completa → pasa al siguiente", async () => {
    await c.getByRole("button", { name: "Guardar serie 2" }).click(); await c.waitForTimeout(1500);
    const curl = await c.locator(".ex-row", { hasText: "Curl" }).getAttribute("aria-expanded"); if (curl !== "true") throw new Error("no abrió Curl"); return "abrió Curl";
  });
  await step("rutina: terminar con esfuerzo 8", async () => {
    await c.getByRole("button", { name: "Esfuerzo 8" }).click(); await c.getByRole("button", { name: "Terminar entrenamiento" }).click(); await c.waitForTimeout(1500);
    if (!(await c.locator(".fold-card").count())) throw new Error("no se plegó"); return "plegada";
  });
  await step("nutrición: marcar Desayuno", async () => { await c.locator(".meal-row", { hasText: "Desayuno" }).first().click(); await c.waitForTimeout(1000); });
  await c.screenshot({ path: `${S}/f_camila_hoy.png`, fullPage: true });
  // Agenda: reservar y cancelar dentro de los 10 min
  await c.goto("http://localhost:3000/inicio/agenda", { waitUntil: "networkidle" });
  await step("agenda: reservar un horario", async () => {
    let slot = c.locator(".slot.available").first(); if (!(await slot.count())) { await c.getByRole("button", { name: "Semana siguiente" }).click(); await c.waitForTimeout(1200); slot = c.locator(".slot.available").first(); }
    await slot.click(); await c.getByRole("button", { name: "Confirmar reserva" }).click(); await c.waitForTimeout(1500);
    return (await c.locator(".sess-row").first().innerText()).replace(/\n/g, " | ");
  });
  await step("agenda: ve botón cancelar con minutos", async () => { const t = await c.getByRole("button", { name: /Cancelar \(\d+ min\)/ }).innerText(); return t; });
  await c.screenshot({ path: `${S}/f_camila_agenda.png`, fullPage: true });
  await step("mensajes: enviar texto", async () => {
    await c.goto("http://localhost:3000/inicio/mensajes", { waitUntil: "networkidle" });
    await c.locator("textarea").first().fill("Hola Jeff, hoy me costó la sentadilla"); await c.getByRole("button", { name: /Enviar/ }).first().click(); await c.waitForTimeout(1500);
  });
  // ---------- COACH (Jeff, escritorio) ----------
  const jc = await ctxFor(b, "jeff", false), j = await jc.newPage(); watch(j, "jeff", errs);
  await j.goto("http://localhost:3000/coach", { waitUntil: "networkidle" });
  await j.screenshot({ path: `${S}/f_jeff_dash.png`, fullPage: true });
  await step("coach: sugerencia de peso de hoy aparece", async () => { const t = await j.locator("#ajustes").innerText(); if (!/Sentadilla/.test(t)) throw new Error(t.slice(0, 120)); return t.split("\n").slice(3, 6).join(" | "); });
  await step("coach: Avisar a Andrés (urgente)", async () => { await j.locator(".attn-line", { hasText: "Andrés" }).getByRole("button", { name: /Avisar/ }).click(); await j.waitForTimeout(1500); return await j.locator(".attn-line", { hasText: "Andrés" }).innerText(); });
  await step("coach: Escribir lleva mensaje listo", async () => {
    await j.locator(".attn-line", { hasText: "Camila" }).getByRole("link", { name: "Escribir" }).click(); await j.waitForURL(/mensajes/); await j.waitForTimeout(1500);
    const v = await j.locator("textarea").first().inputValue(); if (!v.startsWith("Hola Camila")) throw new Error("texto: " + v); return v.slice(0, 60);
  });
  await step("coach: revisar entrenamiento con comentario", async () => {
    const id = j.url().match(/c=([0-9a-f-]+)/)[1]; await j.goto(`http://localhost:3000/coach/clientes/${id}`, { waitUntil: "networkidle" });
    const box = j.locator(".today-sec", { hasText: "Entrenamiento de hoy" }); await box.locator("textarea").fill("Baja a 37,5 kg en sentadilla y controla la bajada.");
    await box.getByRole("button", { name: /Guardar y marcar revisado/ }).click(); await j.waitForTimeout(1500); return (await box.innerText()).split("\n").slice(0, 3).join(" | ");
  });
  await j.screenshot({ path: `${S}/f_jeff_ficha.png`, fullPage: true });
  await step("coach: cancelar la sesión de Camila desde la ficha", async () => {
    await j.getByRole("button", { name: "Agenda", exact: true }).click(); await j.waitForTimeout(1000);
    await j.locator(".bk-row.confirmed").first().getByRole("button", { name: "Cancelar" }).click();
    await j.locator("#cw").fill("Me surgió un imprevisto"); await j.getByRole("button", { name: "Sí, cancelar sesión" }).click(); await j.waitForTimeout(1500);
    return (await j.locator(".bk-row").first().innerText()).replace(/\n/g, " | ");
  });
  // Material: dos destacados a la vez y eliminar
  await j.goto("http://localhost:3000/coach/material", { waitUntil: "networkidle" });
  for (const [per, title, url] of [["day", "Hidratación", "https://youtu.be/dQw4w9WgXcQ"], ["week", "Semana 3", "https://youtu.be/9bZkp7q19f0"]]) {
    await step(`material: vídeo del ${per}`, async () => {
      await j.locator(".fv-slot").nth(per === "day" ? 0 : 1).getByRole("button", { name: /Subir|Cambiar/ }).click();
      await j.locator("#mt").fill(title); await j.getByRole("button", { name: "YouTube" }).click(); await j.locator("#mv").fill(url);
      await j.getByRole("button", { name: /Publicar y destacar/ }).click(); await j.waitForTimeout(1500);
    });
  }
  await step("material: los dos destacados a la vez", async () => { const n = await j.locator(".fv-slot.on").count(); if (n !== 2) throw new Error("activos " + n); return "2 activos"; });
  await step("material: abrir vídeo de YouTube desde la tarjeta", async () => { await j.locator(".content-card", { hasText: "Semana 3" }).locator(".content-open").click(); await j.waitForSelector(".video-modal", { timeout: 4000 }); await j.keyboard.press("Escape"); });
  await step("material: eliminar contenido", async () => {
    const card = j.locator(".content-card", { hasText: "Hidratación" }); await card.hover(); await card.getByRole("button", { name: /Eliminar/ }).click();
    await j.getByRole("button", { name: "Eliminar", exact: true }).click(); await j.waitForTimeout(1500); const n = await j.locator(".content-card", { hasText: "Hidratación" }).count(); if (n) throw new Error("sigue ahí"); return "eliminado";
  });
  await j.screenshot({ path: `${S}/f_jeff_material.png`, fullPage: true });
  await step("catálogo: filtro músculo", async () => {
    await j.goto("http://localhost:3000/coach/catalogo/ejercicios", { waitUntil: "networkidle" });
    await j.locator(".fdrop-main").first().click(); await j.locator(".fdrop-opt").nth(1).click(); await j.waitForTimeout(400); return await j.locator(".ex-count").innerText();
  });
  // ---------- De vuelta al cliente: ve lo de Jeff ----------
  await c.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await c.waitForTimeout(1200);
  await step("cliente: ve la respuesta de Jeff", async () => { const t = await c.locator("body").innerText(); if (!/Jeff respondió/.test(t)) throw new Error("no"); });
  await step("cliente: ve la sesión cancelada con motivo", async () => { const t = await c.locator("body").innerText(); if (!/Jeff canceló tu sesión/.test(t) || !/imprevisto/.test(t)) throw new Error("no"); });
  await step("cliente: ve vídeo del día y de la semana", async () => { const t = await c.locator(".fv-stack").innerText().catch(() => ""); if (!/Vídeo de la semana/.test(t)) throw new Error(t.slice(0, 80)); });
  await c.screenshot({ path: `${S}/f_camila_hoy2.png`, fullPage: true });
  const ac = await ctxFor(b, "andres", true), a = await ac.newPage(); watch(a, "andres", errs);
  await a.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" });
  await step("Andrés: ve el aviso de Jeff", async () => { const t = await a.locator("body").innerText(); if (!/Jeff te está esperando/.test(t)) throw new Error("no"); });
  await a.screenshot({ path: `${S}/f_andres.png`, fullPage: true });
  await b.close();
  console.log("\n=== ERRORES DE CONSOLA/RED ===\n" + (errs.length ? [...new Set(errs)].join("\n") : "ninguno"));
})();
