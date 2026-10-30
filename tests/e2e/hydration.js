const { chromium, ctxFor } = require("./lib.js");
(async () => { const b = await chromium.launch();
  for (let k = 0; k < 10; k++) for (const who of ["andres", "camila"]) {
    const ctx = await ctxFor(b, who, k % 2 === 1), p = await ctx.newPage(); let err = false; p.on("pageerror", () => (err = true));
    let html = ""; p.on("response", async (r) => { if (r.url().endsWith("/inicio") && r.request().resourceType() === "document") html = await r.text().catch(() => ""); });
    await p.goto("http://localhost:3000/inicio", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    console.log(who, k, err ? "ERROR" : "ok"); if (!err) { await ctx.close(); continue; }
    const leaves = (root) => { const out = []; const w = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t && !n.parentElement.closest("script,style")) { let e = n.parentElement, path = []; for (let i = 0; i < 4 && e && e !== root; i++) { path.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "")); e = e.parentElement; } out.push(path.join(">") + " :: " + t.slice(0, 60)); } } return out; };
    const res = await p.evaluate(({ h, src }) => { const leaves = eval(src); const d = new DOMParser().parseFromString(h, "text/html"); return { s: leaves(d.querySelector("main") || d.body), c: leaves(document.querySelector("main")) }; }, { h: html, src: "(" + leaves.toString() + ")" });
    const sOnly = res.s.filter((x) => !res.c.includes(x)), cOnly = res.c.filter((x) => !res.s.includes(x));
    console.log(`== ${who} ${k}\n  SERVIDOR:\n   ` + sOnly.slice(0, 10).join("\n   ") + "\n  CLIENTE:\n   " + cOnly.slice(0, 10).join("\n   "));
    await ctx.close(); }
  await b.close(); })();
