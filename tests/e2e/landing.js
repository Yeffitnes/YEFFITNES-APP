// 22-nov: landing pública (/landing) con el celular interactivo. Sin sesión, en celular y computador.
// 23-nov: portada nueva, desfile de ejercicios, progreso (capturas reales) y agenda con avisos; ecosistema con los dibujos.
const { chromium } = require("playwright");
const U = "http://localhost:3000"; let fails = 0;
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
(async () => { const b = await chromium.launch(), errs = [];
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc";
    const c = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "reduce" } : { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await c.newPage();
    p.on("pageerror", (e) => errs.push(`[${tag}] ${e.message}`)); p.on("console", (m) => { if (m.type() === "error") errs.push(`[${tag}] console ${m.text().slice(0, 160)}`); });
    p.on("response", (r) => { if (r.status() >= 400) errs.push(`[${tag}] HTTP ${r.status()} ${r.url().slice(0, 120)}`); });
    await step(`[${tag}] abre sin sesión, sin pedir instalar ni iniciar sesión`, async () => {
      await p.goto(`${U}/landing`, { waitUntil: "networkidle" });
      if (!p.url().endsWith("/landing")) throw new Error("redirigió a " + p.url());
      if (await p.locator("input[type=password]").count()) throw new Error("salió el login");
      const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > (mobile ? 390 : 1440)) throw new Error(`se desborda: ${w}px`);
    });
    await step(`[${tag}] todas las capturas cargan`, async () => {
      for (const t of ["HOY", "PLAN", "AGENDA", "PROGRESO", "MATERIAL"]) { await p.locator(".lt-nav button", { hasText: t }).click(); await p.waitForTimeout(500);
        const ok = await p.locator(".lt-canvas img").evaluate((i) => i.complete && i.naturalWidth > 0); if (!ok) throw new Error(`no cargó ${t}`); }
    });
    await step(`[${tag}] tocar un punto cambia lo que dice Yeff`, async () => {
      await p.locator(".lt-nav button", { hasText: "HOY" }).click(); await p.waitForTimeout(500);
      await p.locator(".lt-dot[aria-label='Reporte diario']").click(); await p.waitForTimeout(400);
      const t = await p.locator(".lt-bubble b").innerText(); if (t !== "Reporte diario") throw new Error(t);
      if (!(await p.locator(".lt-focus").count())) throw new Error("no resalta la tarjeta");
    });
    await step(`[${tag}] "Verlo en la app" abre la pantalla de adentro y "Volver a Hoy" regresa`, async () => {
      await p.locator(".lt-dot[aria-label='Resumen de cada semana']").click(); await p.getByRole("button", { name: "Verlo en la app" }).click(); await p.waitForTimeout(500);
      if (!/resumen\.webp/.test(await p.locator(".lt-canvas img").getAttribute("src"))) throw new Error("no abrió el resumen");
      await p.getByRole("button", { name: "Volver a Hoy" }).click(); await p.waitForTimeout(400);
      if (!/hoy\.webp/.test(await p.locator(".lt-canvas img").getAttribute("src"))) throw new Error("no volvió");
    });
    await step(`[${tag}] Siguiente y Anterior recorren las paradas`, async () => {
      await p.locator(".lt-dot[aria-label='Tu día de un vistazo']").click();
      const a = await p.locator(".lt-count").innerText(); await p.getByRole("button", { name: "Siguiente" }).click(); await p.waitForTimeout(400);
      const b2 = await p.locator(".lt-count").innerText(); await p.getByRole("button", { name: "Anterior" }).click(); await p.waitForTimeout(400);
      if (!/^1 de/.test(a) || !/^2 de/.test(b2) || !/^1 de/.test(await p.locator(".lt-count").innerText())) throw new Error(`${a} → ${b2}`);
    });
    await step(`[${tag}] una tarjeta del ecosistema lo muestra en el celular`, async () => {
      await p.locator(".lp-part", { hasText: "Agenda con avisos" }).click(); await p.waitForTimeout(1200);
      if (!/agenda\.webp/.test(await p.locator(".lt-canvas img").getAttribute("src"))) throw new Error("no cambió a agenda");
    });
    await step(`[${tag}] portada: titular, llamado a WhatsApp a la vista y sin texto montado`, async () => {
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      const h = await p.locator(".lp-hero h1").innerText(); if (!/MIRA CÓMO/i.test(h)) throw new Error(h);
      const cta = await p.locator(".lp-hero .lp-cta a").first().boundingBox(); if (!cta || cta.y + cta.height > (mobile ? 844 : 900)) throw new Error(`el botón queda fuera de la primera pantalla (${cta && Math.round(cta.y)})`);
    });
    await step(`[${tag}] todas las imágenes de la página cargan (dibujos, gráfica y resumen)`, async () => {
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
      await p.waitForTimeout(800);
      const bad = await p.locator("main img").evaluateAll((is) => is.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("src")));
      if (bad.length) throw new Error(bad.join(" "));
      for (const id of ["#progreso", "#agenda"]) if (!(await p.locator(id).count())) throw new Error(`falta ${id}`);
      if ((await p.locator(".lp-exc").count()) < 20) throw new Error("faltan dibujos en el desfile");
      if (await p.locator(".lp-part .gd").count()) throw new Error("siguen los muñequitos pequeños en el ecosistema");
      return `${await p.locator("main img").count()} imágenes`;
    });
    await step(`[${tag}] todos los botones de contacto van a WhatsApp con el mensaje escrito; paquetes sin precio`, async () => {
      const hrefs = await p.locator("a[href*='wa.me']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      if (hrefs.length < 4 || hrefs.some((h) => !/^https:\/\/wa\.me\/\d*\?text=/.test(h))) throw new Error(hrefs.join(" "));
      const pk = await p.locator("#paquetes").innerText(); if (/\$|COP|precio:/i.test(pk.replace(/Preguntar precio|Los precios/gi, ""))) throw new Error("hay un precio");
      if (await p.locator("a[href^='/login'], a[href^='/inicio']").count()) throw new Error("enlaza a la app");
      return `${hrefs.length} enlaces`;
    });
    await c.close();
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
