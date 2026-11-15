// 4-nov: la tarea de la mañana manda los avisos de plan por vencer (0048) y no los repite. Necesita claves VAPID de prueba, como push.js:
// compilar con NEXT_PUBLIC_VAPID_PUBLIC_KEY y correr con esa y VAPID_PRIVATE_KEY. El teléfono es falso: se prueba la ruta, no la llegada.
const { execSync } = require("child_process");
const sql = (q) => execSync(`runuser -u postgres -- psql -d e2e -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
(async () => { const CID = process.env.CLIENT_ID, sec = "e2e-cron"; let fails = 0;
  sql(`insert into app_secrets (name, value) values ('cron', '${sec}') on conflict (name) do update set value = excluded.value`);
  sql(`update clients set plan_since = (now() at time zone 'America/Bogota')::date - 23 where id = '${CID}'`);
  sql(`insert into push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) select 'https://localhost:9/fake', '00000000-0000-0000-0000-0000000000f0', workspace_id, 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg' from clients where id = '${CID}' on conflict do nothing`);
  const call = async () => { const r = await fetch("http://localhost:3000/api/cron/reminders?kind=morning", { method: "POST", headers: { "x-cron-secret": sec } }); return { status: r.status, ...(await r.json()) }; };
  const a = await call(), c = await call(); console.log(JSON.stringify(a), JSON.stringify(c));
  if (a.status !== 200 || a.plans !== 1) { fails++; console.log("FAIL no avisó el plan a 7 días"); } else console.log("OK   aviso a 7 días");
  if (c.plans !== 0) { fails++; console.log("FAIL repitió el aviso"); } else console.log("OK   no lo repite");
  const bad = await fetch("http://localhost:3000/api/cron/reminders?kind=morning", { method: "POST", headers: { "x-cron-secret": "falsa" } });
  console.log("Clave falsa:", bad.status, JSON.stringify(await bad.json())); process.exit(fails ? 1 : 0); })();
