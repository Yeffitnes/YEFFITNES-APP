const { chromium } = require("playwright");
const { session } = require("./proxy.js");
const IDS = { jeff: "00000000-0000-0000-0000-0000000000f0", camila: "00000000-0000-0000-0000-00000000000a", andres: "00000000-0000-0000-0000-00000000000b", laura: "00000000-0000-0000-0000-00000000000c" };
async function ctxFor(browser, who, mobile) {
  const ctx = await browser.newContext(mobile ? { timezoneId: "America/Bogota", locale: "es-CO", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } : { timezoneId: "America/Bogota", locale: "es-CO", viewport: { width: 1280, height: 860 } });
  const val = "base64-" + Buffer.from(JSON.stringify(session(IDS[who]))).toString("base64url");
  await ctx.addCookies([{ name: "sb-localhost-auth-token", value: val, domain: "localhost", path: "/" }]);
  // Sin avisos push en el entorno de prueba: que la pantalla obligatoria no tape todo en el celular.
  await ctx.addInitScript(() => { try { localStorage.setItem("yf-push-desktop-skip", "1"); } catch {} });
  return ctx;
}
function watch(page, tag, out) {
  page.on("pageerror", (e) => out.push(`[${tag}] PAGEERROR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/WebSocket|realtime|Failed to load resource|favicon/.test(m.text())) out.push(`[${tag}] console ${m.text().slice(0, 200)}`); });
  page.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && (u.includes("/rest/v1/") || u.includes("/api/")) ) out.push(`[${tag}] HTTP ${r.status()} ${r.request().method()} ${u.replace("http://localhost:54321", "").slice(0, 160)}`); });
}
module.exports = { chromium, ctxFor, watch, IDS };
