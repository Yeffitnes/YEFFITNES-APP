// 21-nov: en rutinas y ejercicios del catálogo, Yeff pone un enlace de YouTube O sube el vídeo desde el celular (0057).
// Bunny no existe en local: se simula la firma (/api/video/upload-url), la subida TUS y el enlace de reproducción. Lo que sí es real:
// el formulario, la subida en segundo plano, lo que se guarda en la base, que el vídeo llega al plan de Camila y que ella lo ve.
const { execSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const { chromium, ctxFor, watch } = require("./lib.js");
const S = __dirname + "/shots", U = "http://localhost:3000"; let fails = 0;
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const step = async (n, fn) => { try { console.log("OK  ", n, (await fn()) ?? ""); } catch (e) { fails++; console.log("FAIL", n, "→", e.message.split("\n")[0].slice(0, 260)); } };
const MP4 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "catvid-")), "entreno.mp4");
execSync(`ffmpeg -loglevel error -y -f lavfi -i testsrc=size=320x240:rate=15 -t 2 -pix_fmt yuv420p ${MP4}`);
const VIDS = ["c1000000-0000-4000-8000-000000000001", "c1000000-0000-4000-8000-000000000002"]; let next = 0;
const WS = sql(`select id from workspaces where slug='yeffitnes'`);
// Simula Bunny: firma (y registra el vídeo como lo hace el servidor), TUS y reproducción.
async function fakeBunny(p) {
  await p.route("**/api/video/upload-url", async (r) => { const v = VIDS[next++ % VIDS.length]; sql(`insert into video_uploads (video_id, workspace_id, client_id) values ('${v}', '${WS}', null) on conflict do nothing`);
    await r.fulfill({ json: { endpoint: `${U}/fake-tus/`, libraryId: "1", videoId: v, expire: 9999999999, signature: "x" } }); });
  await p.route("**/fake-tus/**", async (r) => { const m = r.request().method(), h = { "Tus-Resumable": "1.0.0", "Access-Control-Expose-Headers": "Location, Upload-Offset" };
    if (m === "POST") return r.fulfill({ status: 201, headers: { ...h, Location: `${U}/fake-tus/up1` } });
    if (m === "HEAD") return r.fulfill({ status: 200, headers: { ...h, "Upload-Offset": "0", "Upload-Length": String(fs.statSync(MP4).size) } });
    return r.fulfill({ status: 204, headers: { ...h, "Upload-Offset": String(fs.statSync(MP4).size) } }); });
  await p.route("**/api/video/play?*", (r) => r.fulfill({ json: { url: "about:blank", processing: false } }));
}
(async () => { const b = await chromium.launch(), errs = [];
  const CA = sql(`select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'`);
  // Rutina de hoy de Camila (la que se le asignó desde el catálogo) y su primer ejercicio.
  const today = sql(`select d.id||'|'||d.source_template_id||'|'||(select e.id||'|'||e.name from plan_items i join exercises e on e.id=i.exercise_id where i.plan_day_id=d.id order by i.position limit 1)
    from plan_days d join training_plans p on p.id=d.plan_id where p.client_id='${CA}' and p.status='active' and d.source_template_id is not null
      and d.weekday = extract(isodow from (now() at time zone 'America/Bogota'))::int and d.week = plan_week(p.starts_on, p.cycle_weeks, (now() at time zone 'America/Bogota')::date) limit 1`);
  const [DAY, TPL, EX, EXNAME] = today.split("|"); if (!DAY) throw new Error("Camila no tiene rutina de catálogo hoy (revisa la semilla)");
  const RNAME = sql(`select name from routine_templates where id='${TPL}'`);
  for (const mobile of [true]) {
    const tag = mobile ? "cel" : "pc", j = await (await ctxFor(b, "jeff", mobile)).newPage(); watch(j, `jeff-${tag}`, errs); await fakeBunny(j);
    await step(`[${tag}] rutina: elegir "Subir desde el celular", escoger un vídeo y guardar; queda subido`, async () => {
      await j.goto(`${U}/coach/catalogo/rutinas`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
      const card = j.locator(".cat-row", { hasText: RNAME }).first(); await card.locator(".cat-row-head").click(); await card.getByRole("button", { name: "Editar", exact: true }).click();
      if (!(await j.getByRole("radio", { name: "Enlace de YouTube" }).count())) throw new Error("no salen las dos opciones");
      await j.getByRole("radio", { name: "Subir desde el celular" }).click();
      await j.getByLabel(/Vídeo de la rutina.*elegir vídeo/).setInputFiles(MP4); await j.getByText("Listo para subir").waitFor({ timeout: 10000 });
      await j.screenshot({ path: `${S}/catvid_rutina_${tag}.png` });
      await j.getByRole("button", { name: "Guardar" }).click();
      for (let k = 0; k < 30 && sql(`select coalesce(video_id,'') from routine_templates where id='${TPL}'`) !== VIDS[0]; k++) await j.waitForTimeout(500);
      if (sql(`select coalesce(video_id,'') from routine_templates where id='${TPL}'`) !== VIDS[0]) throw new Error("no quedó el vídeo en la rutina");
      if (sql(`select coalesce(video_id,'') from plan_days where id='${DAY}'`) !== VIDS[0]) throw new Error("no llegó al plan de Camila");
      await j.waitForTimeout(800); if (!(await j.locator(".cat-row", { hasText: RNAME }).first().locator(".cat-vid.has").count())) throw new Error("la tarjeta no muestra el vídeo");
      return `portada: ${sql(`select case when video_poster is null then 'no' else 'sí' end from routine_templates where id='${TPL}'`)}`;
    });
    await step(`[${tag}] al volver a editar dice "Vídeo subido" y se puede ver`, async () => {
      const card = j.locator(".cat-row", { hasText: RNAME }).first(); if (!(await card.getByRole("button", { name: "Editar", exact: true }).count())) await card.locator(".cat-row-head").click();
      await card.getByRole("button", { name: "Editar", exact: true }).click(); await j.getByText("Vídeo subido").waitFor({ timeout: 4000 });
      await j.getByRole("button", { name: "Ver", exact: true }).click(); await j.waitForTimeout(800);
      if (!(await j.locator("iframe[src='about:blank']").count())) throw new Error("no abrió el reproductor"); await j.keyboard.press("Escape"); await j.waitForTimeout(300);
      if (!(await j.getByText("Editar rutina").count())) throw new Error("Escape cerró también la edición");   // solo se cierra el vídeo
      await j.getByRole("button", { name: "Cancelar" }).click(); await j.waitForTimeout(300);
    });
    await step(`[${tag}] ficha de Camila: el día muestra el vídeo como de catálogo, no como personal`, async () => {
      await j.goto(`${U}/coach/clientes/${CA}`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
      await j.locator(".tab-btn", { hasText: "Entrenamiento" }).click(); await j.waitForTimeout(800);
      const t = await j.locator("main").innerText(); if (!/Vídeo de catálogo/.test(t)) throw new Error("no sale como vídeo de catálogo");
      if (!/Subir vídeo/.test(t)) throw new Error("debería ofrecer subir uno personal"); await j.screenshot({ path: `${S}/catvid_ficha_${tag}.png` });
    });
    await step(`[${tag}] ejercicio: subir el vídeo de técnica desde el celular`, async () => {
      await j.goto(`${U}/coach/catalogo/ejercicios`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
      await j.locator(".ex-card", { hasText: EXNAME }).first().click(); await j.getByRole("radio", { name: "Subir desde el celular" }).click();
      await j.getByLabel(/Vídeo de técnica.*elegir vídeo/).setInputFiles(MP4); await j.getByText("Listo para subir").waitFor({ timeout: 10000 });
      await j.getByRole("button", { name: "Guardar" }).click();
      const want = `bunny|${VIDS[1]}`; for (let k = 0; k < 30 && sql(`select video_provider||'|'||video_ref from exercises where id='${EX}'`) !== want; k++) await j.waitForTimeout(500);
      const got = sql(`select coalesce(video_provider,'')||'|'||coalesce(video_ref,'') from exercises where id='${EX}'`); if (got !== want) throw new Error(got);
    });
    // Camila lo ve en Hoy: el vídeo de la rutina arriba y la técnica del ejercicio con el reproductor de Yeffitness (no YouTube).
    const c = await (await ctxFor(b, "camila", true)).newPage(); watch(c, "camila", errs); await fakeBunny(c);
    await step("Camila: en Hoy ve el vídeo de la rutina y la técnica subida", async () => {
      await c.goto(`${U}/inicio`, { waitUntil: "networkidle" }); await c.waitForTimeout(1000);
      await c.getByRole("button", { name: "Ver vídeo de la rutina" }).click(); await c.waitForTimeout(800);
      if (!(await c.locator("iframe[src='about:blank']").count())) throw new Error("el vídeo de la rutina no abrió"); await c.keyboard.press("Escape"); await c.waitForTimeout(400);
      await c.locator(".ex-row", { hasText: EXNAME }).first().click(); await c.getByRole("button", { name: "Ver técnica" }).click(); await c.waitForTimeout(800);
      if (await c.locator("iframe[src*='youtube']").count()) throw new Error("abrió YouTube con un vídeo subido");
      if (!(await c.locator("iframe[src='about:blank']").count())) throw new Error("la técnica no abrió"); await c.screenshot({ path: `${S}/catvid_cliente.png` }); await c.keyboard.press("Escape");
    });
    await step(`[${tag}] volver a YouTube: se quita el vídeo subido y queda el enlace, también en el plan de Camila`, async () => {
      await j.goto(`${U}/coach/catalogo/rutinas`, { waitUntil: "networkidle" }); await j.waitForTimeout(800);
      const card = j.locator(".cat-row", { hasText: RNAME }).first(); await card.locator(".cat-row-head").click(); await card.getByRole("button", { name: "Editar", exact: true }).click();
      await j.getByRole("radio", { name: "Enlace de YouTube" }).click(); await j.getByLabel(/enlace de YouTube/).fill("https://youtu.be/dQw4w9WgXcQ");
      await j.getByRole("button", { name: "Guardar" }).click(); await j.waitForTimeout(1500);
      const r = sql(`select coalesce(video_id,'-')||'|'||coalesce(video_ref,'-') from routine_templates where id='${TPL}'`), d = sql(`select coalesce(video_id,'-')||'|'||coalesce(video_ref,'-') from plan_days where id='${DAY}'`);
      if (r !== "-|dQw4w9WgXcQ" || d !== "-|dQw4w9WgXcQ") throw new Error(`rutina ${r} · plan ${d}`);
    });
  }
  console.log(errs.length ? errs.join("\n") : "Sin errores de consola ni de red"); await b.close(); process.exit(fails || errs.length ? 1 : 0); })();
