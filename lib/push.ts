import webpush from "web-push";
// Web Push: las claves viven solo en el servidor (VAPID_PRIVATE_KEY). Si faltan, las notificaciones push se desactivan sin romper nada.
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export type Target = { endpoint: string; p256dh: string; auth: string };
export async function sendPush(targets: Target[], payload: { title: string; body: string; url: string; tag?: string }): Promise<string[]> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contacto@yeffitnes.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const dead: string[] = [];
  await Promise.all(targets.map(async (t) => {
    try { await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" }); }
    catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) dead.push(t.endpoint); }
  }));
  return dead;
}
