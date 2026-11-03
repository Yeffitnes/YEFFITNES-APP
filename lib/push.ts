import webpush from "web-push";
// Web Push: las claves viven solo en el servidor (VAPID_PRIVATE_KEY). Si faltan, las notificaciones push se desactivan sin romper nada.
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export type Target = { endpoint: string; p256dh: string; auth: string };
export type PushReport = { ok: number; failed: number; dead: string[]; codes: number[] };   // codes: respuesta de cada teléfono que falló (0 = sin respuesta)
// Envía y cuenta de verdad cuántas llegaron (29-oct). 404/410 = suscripción muerta (se borra). 401/403 = la suscripción se hizo con
// las claves del OTRO sitio (Netlify y Vercel tienen claves distintas): no se borra, pero tampoco cuenta como enviada.
export async function sendPushReport(targets: Target[], payload: { title: string; body: string; url: string; tag?: string }): Promise<PushReport> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contacto@yeffitnes.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const r: PushReport = { ok: 0, failed: 0, dead: [], codes: [] };
  await Promise.all(targets.map(async (t) => {
    try { await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high", timeout: 6000 }); r.ok++; }   // máx. 6 s por teléfono: uno que no responde ya no deja colgado el envío
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      r.codes.push(code ?? 0);
      if (code === 404 || code === 410) r.dead.push(t.endpoint); else { r.failed++; console.warn(`push ${code ?? "error"} ${new URL(t.endpoint).host}`); }
    }
  }));
  return r;
}
// Por qué no llegó, en una palabra que la pantalla traduce: claves de otro sitio (401/403), teléfono que ya no existe (404/410), sin respuesta.
export const failReason = (codes: number[]): "keys" | "gone" | "timeout" | "other" | null =>
  !codes.length ? null : codes.some((c) => c === 401 || c === 403) ? "keys" : codes.every((c) => c === 404 || c === 410) ? "gone" : codes.some((c) => c === 0) ? "timeout" : "other";
// Huella corta de la clave pública (no es secreta: la tienen todos los navegadores). Sirve para comparar Netlify y Vercel.
export const keyTag = () => (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").slice(0, 8);
export async function sendPush(targets: Target[], payload: { title: string; body: string; url: string; tag?: string }): Promise<string[]> {
  return (await sendPushReport(targets, payload)).dead;
}
