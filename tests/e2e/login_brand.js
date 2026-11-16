// 15-nov: marca Yeffitness y login nuevo. El login muestra la marca bien escrita, cambia entre Entrar y Crear cuenta,
// "Mostrar" deja ver la contraseña, un error se ve, y en ninguna pantalla pública queda "YEFFITNES" ni "Jeff". Base recién creada.
const { chromium } = require("playwright");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 240)); } };
(async () => { const b = await chromium.launch();
  for (const mobile of [true, false]) {
    const tag = mobile ? "cel" : "pc";
    const p = await (await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })).newPage();
    await step(`[${tag}] login con la marca Yeffitness, sin YEFFITNES ni Jeff`, async () => {
      await p.goto(`${U}/login`, { waitUntil: "networkidle" }); await p.waitForTimeout(600); await p.screenshot({ path: `${S}/login_${tag}.png` });
      const t = await p.locator("body").innerText(); if (!/Yeffitness/.test(t) || /YEFFITNES\b/.test(t) || /\bJeff\b/.test(t)) throw new Error(t.slice(0, 160));
      if (!/Yeffitness/.test(await p.title())) throw new Error("título: " + (await p.title()));
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("desborde");
    });
    await step(`[${tag}] Crear cuenta pide el nombre; Mostrar enseña la contraseña`, async () => {
      await p.getByRole("tab", { name: "Crear cuenta" }).click(); if (!(await p.getByPlaceholder("Nombre y apellido").isVisible())) throw new Error("sin nombre");
      await p.getByPlaceholder("Mínimo 8 caracteres").fill("secreta123"); await p.getByRole("button", { name: "Mostrar" }).click();
      if (await p.getByPlaceholder("Mínimo 8 caracteres").getAttribute("type") !== "text") throw new Error("no la muestra");
      await p.getByRole("tab", { name: "Entrar" }).click();
    });
    await step(`[${tag}] un error de acceso se ve en el formulario`, async () => {
      await p.getByPlaceholder("tu@correo.com").fill("nadie@x.com"); await p.getByPlaceholder("Tu contraseña").fill("incorrecta1"); await p.getByRole("button", { name: "Entrar", exact: true }).last().click();
      await p.waitForSelector("[role=alert]", { timeout: 8000 }); return await p.locator("[role=alert]").innerText();
    });
    await step(`[${tag}] portada: Yeffitness`, async () => { await p.goto(`${U}/`, { waitUntil: "networkidle" }); const t = await p.locator("body").innerText(); if (/YEFFITNES\b|\bJeff\b/.test(t)) throw new Error(t.slice(0, 120)); });
  }
  await b.close(); process.exit(fails ? 1 : 0); })();
