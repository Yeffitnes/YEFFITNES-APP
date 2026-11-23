const { chromium, ctxFor } = require("./lib.js");
const { execSync } = require("child_process");
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q}"`).toString().trim();
(async () => { const b = await chromium.launch();
  const VA = sql("select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'"), MA = sql("select id from clients where profile_id='00000000-0000-0000-0000-0000000000d5'");
  for (const m of [true, false]) { const p = await (await ctxFor(b, "jeff", m)).newPage(), t = m ? "cel" : "pc";
    for (const [id, tab] of [[VA, "Entrenamiento"], [VA, "Nutrición"], [VA, "Progreso"], [MA, "Entrenamiento"]]) {
      await p.goto(`http://localhost:3000/coach/clientes/${id}?tab=${encodeURIComponent(tab)}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1800);
      await p.screenshot({ path: `/tmp/claude-0/fx/${t}_${id === VA ? "va" : "ma"}_${tab.slice(0, 5)}.png`, fullPage: true }); }
  }
  await b.close(); })();
