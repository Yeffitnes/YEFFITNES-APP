// 16-nov: en Android, después de instalar, la pestaña de Chrome seguía usable. Ahora queda en "Abre la app desde su icono"
// (también al volver a abrir Chrome) y, si Chrome vuelve a ofrecer instalar (la borraron), vuelve a guiar la instalación.
// Necesita el build con NEXT_PUBLIC_REQUIRE_INSTALL=1:  NEXT_PUBLIC_REQUIRE_INSTALL=1 bash tests/e2e/run.sh setup
const { chromium } = require("playwright");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 240)); } };
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID }), p = await c.newPage();
  const txt = async () => (await p.locator("body").innerText()).replace(/\s+/g, " ");
  await step("Chrome en Android sin instalar: pide instalar", async () => { await p.goto(`${U}/login`, { waitUntil: "networkidle" }); await p.waitForTimeout(800); const t = await txt(); if (!/Instala la app para continuar/.test(t) || /Crear cuenta/.test(t)) throw new Error(t.slice(0, 120)); if (!/no “Crear acceso directo”/.test(t)) throw new Error("sin el aviso del acceso directo"); });
  await step("al terminar de instalar, la pestaña NO deja usar la app: manda al icono", async () => { await p.evaluate(() => window.dispatchEvent(new Event("appinstalled"))); await p.waitForTimeout(400); const t = await txt(); if (!/Abre la app desde su icono/.test(t) || /Bienvenido de vuelta/.test(t)) throw new Error(t.slice(0, 120)); await p.screenshot({ path: `${S}/gate_instalada.png` }); });
  await step("al volver a abrir Chrome sigue mandando al icono", async () => { await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800); if (!/Abre la app desde su icono/.test(await txt())) throw new Error("se olvidó"); });
  await step("si Chrome vuelve a ofrecer instalar (la borraron), vuelve a guiar la instalación", async () => {
    await p.evaluate(() => { const e = new Event("beforeinstallprompt", { cancelable: true }); e.prompt = async () => {}; window.dispatchEvent(e); }); await p.waitForTimeout(400);
    const t = await txt(); if (!/Instala la app para continuar/.test(t) || !/Instalar la app/.test(t)) throw new Error(t.slice(0, 120)); });
  await step("computador: sin bloqueo", async () => { const d = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); await d.goto(`${U}/login`, { waitUntil: "networkidle" }); if (!/Bienvenido de vuelta/.test(await d.locator("body").innerText())) throw new Error("bloqueado"); });
  await b.close(); process.exit(fails ? 1 : 0); })();
