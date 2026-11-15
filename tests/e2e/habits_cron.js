// 14-nov: la tarea de la noche le recuerda los hábitos al cliente (junto con el reporte si también le falta) y la de la mañana le
// manda a Jeff quién quedó por debajo ayer. Necesita claves VAPID de prueba (como plan_cron.js). Teléfonos falsos: se prueba la ruta.
const { execSync } = require("child_process");
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const hoy = "(now() at time zone 'America/Bogota')::date";
(async () => { const CID = process.env.CLIENT_ID, sec = "e2e-cron"; let fails = 0;
  sql(`insert into app_secrets (name, value) values ('cron', '${sec}') on conflict (name) do update set value = excluded.value`);
  const key = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
  sql(`insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) select 'https://localhost:9/cli', '00000000-0000-0000-0000-00000000000a', workspace_id, '${key}', 'tBHItJI5svbpez7KI4CCXg' from clients where id='${CID}' on conflict do nothing`);
  sql(`insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) select 'https://localhost:9/jeff', '00000000-0000-0000-0000-0000000000f0', workspace_id, '${key}', 'tBHItJI5svbpez7KI4CCXg' from clients where id='${CID}' on conflict do nothing`);
  sql(`insert into habit_logs (client_id, workspace_id, day, water, steps, sleep) select id, workspace_id, ${hoy} - 1, 2, 9000, 7 from clients where id='${CID}' on conflict (client_id, day) do update set water=2`);
  sql(`insert into habit_logs (client_id, workspace_id, day, water) select id, workspace_id, ${hoy}, 6 from clients where id='${CID}' on conflict (client_id, day) do update set water=6, steps=null, sleep=null`);
  const call = async (k) => { const r = await fetch(`http://localhost:3000/api/cron/reminders?kind=${k}`, { method: "POST", headers: { "x-cron-secret": sec } }); return { status: r.status, ...(await r.json()) }; };
  const n = await call("night"); console.log("noche", JSON.stringify(n));
  const log = sql(`select count(*) from reminder_log where kind='habits' and ref like '${CID}%'`);
  if (n.status !== 200 || log !== "1") { fails++; console.log("FAIL noche: no registró el recordatorio de hábitos"); } else console.log("OK   noche: recordatorio de hábitos (junto con el reporte si falta)");
  const n2 = await call("night"); if ((n2.habits ?? 0) !== 0) { fails++; console.log("FAIL noche repitió"); } else console.log("OK   noche no repite");
  const m = await call("morning"); console.log("mañana", JSON.stringify(m));
  if (m.status !== 200 || !(m.habits >= 1)) { fails++; console.log("FAIL mañana: no avisó a Jeff"); } else console.log("OK   mañana: a Jeff, quién quedó por debajo ayer");
  const bad = await fetch("http://localhost:3000/api/cron/reminders?kind=night", { method: "POST", headers: { "x-cron-secret": "falsa" } }); console.log("Clave falsa:", bad.status);
  process.exit(fails ? 1 : 0); })();
