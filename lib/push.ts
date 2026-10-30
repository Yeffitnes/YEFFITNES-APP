import webpush from "web-push";
// Web Push: las claves viven solo en el servidor (VAPID_PRIVATE_KEY). Si faltan, las notificaciones push se desactivan sin romper nada.
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export type Target = { endpoint: string; p256dh: string; auth: string };
export type PushReport = { ok: number; failed: number; dead: string[] };
// Envía y cuenta de verdad cuántas llegaron (29-oct). 404/410 = suscripción muerta (se borra). 401/403 = la suscripción se hizo con
// las claves del OTRO sitio (Netlify y Vercel tienen claves distintas): no se borra, pero tampoco cuenta como enviada.
export async function sendPushReport(targets: Target[], payload: { title: string; body: string; url: string; tag?: string }): Promise<PushReport> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contacto@yeffitnes.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const r: PushReport = { ok: 0, failed: 0, dead: [] };
  await Promise.all(targets.map(async (t) => {
    try { await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" }); r.ok++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) r.dead.push(t.endpoint); else { r.failed++; console.warn(`push ${code ?? "error"} ${new URL(t.endpoint).host}`); }
    }
  }));
  return r;
}
export async function sendPush(targets: Target[], payload: { title: string; body: string; url: string; tag?: string }): Promise<string[]> {
  return (await sendPushReport(targets, payload)).dead;
}
