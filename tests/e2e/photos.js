// Fotos de progreso (30-oct, noche: "el antes y después no me deja subir ninguna foto"). Cliente nuevo sin permiso de fotos:
// pide el permiso, abre el selector, sube, y con dos fotos compara "A la par" y "Deslizar". Usa el Storage en memoria del proxy.
const { chromium, ctxFor, watch } = require("./lib.js");
const fs = require("fs"), path = require("path"), S = path.join(__dirname, "shots");
const IMG = fs.readFileSync(path.join(__dirname, "../../public/ex", fs.readdirSync(path.join(__dirname, "../../public/ex")).find((f) => f.endsWith(".webp"))));
let fails = 0; const step = async (n, fn) => { try { const r = await fn(); console.log("OK  ", n, r ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 200)); } };
(async () => {
  const b = await chromium.launch(), errs = [], ctx = await ctxFor(b, "camila", true), p = await ctx.newPage(); watch(p, "camila", errs);
  p.on("response", async (r) => { if (r.url().includes("/storage/") && r.status() >= 400) errs.push(`storage ${r.status()} ${await r.text().catch(() => "")}`); });
  await p.goto("http://localhost:3000/inicio/progreso", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await step("primera foto: permiso y selector", async () => {
    await p.getByRole("button", { name: "Subir foto de hoy" }).click();
    const chooser = p.waitForEvent("filechooser", { timeout: 6000 });
    await p.getByText("Acepto y elegir foto").click();   // toque directo sobre el selector (como lo exige el iPhone)
    const fc = await chooser; await fc.setFiles({ name: "foto1.webp", mimeType: "image/webp", buffer: IMG }); await p.waitForTimeout(2500);
    const n = await p.locator(".photo-thumb").count(); const t = await p.locator(".toast").innerText().catch(() => "");
    if (n < 1) throw new Error(`fotos=${n} aviso=${t}`); return `fotos=${n}`;
  });
  await step("segunda foto: directo al selector", async () => {
    const chooser = p.waitForEvent("filechooser", { timeout: 6000 }); await p.getByRole("button", { name: "Subir foto de hoy" }).click();
    const fc = await chooser; await fc.setFiles({ name: "foto2.webp", mimeType: "image/webp", buffer: IMG }); await p.waitForTimeout(2500);
    const n = await p.locator(".photo-thumb").count(); if (n < 2) throw new Error(`fotos=${n}`); return `fotos=${n}`;
  });
  await step("comparar: deslizar", async () => {
    await p.getByRole("button", { name: "Deslizar" }).click(); await p.locator(".ph-range").fill("30"); await p.waitForTimeout(300);
    const imgs = await p.locator(".ph-slide img").count(); await p.locator(".ph-slide").screenshot({ path: `${S}/x_slide.png` });
    const ok = await p.locator(".ph-slide img").evaluateAll((els) => els.every((e) => e.naturalWidth > 0));
    if (imgs !== 2 || !ok) throw new Error(`imgs=${imgs} cargadas=${ok}`); return "2 fotos cargadas";
  });
  await step("tras recargar siguen ahí", async () => { await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800); const n = await p.locator(".photo-thumb").count(); if (n < 2) throw new Error(`fotos=${n}`); return `fotos=${n}`; });
  console.log("\n=== ERRORES ===\n" + (errs.length ? errs.join("\n") : "ninguno"));
  await b.close(); process.exit(fails ? 1 : 0);
})();
