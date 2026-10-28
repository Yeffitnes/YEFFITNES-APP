"use client";
// Avisos push en el teléfono. Requiere HTTPS y (en iPhone) que la app esté instalada en la pantalla de inicio.
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
export type PushState = "unsupported" | "not_configured" | "denied" | "off" | "on";
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "not_configured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}
// Error con un motivo entendible para mostrarle a la persona (antes un fallo dejaba el botón sin hacer nada).
export class PushError extends Error { constructor(public reason: "timeout" | "subscribe" | "server") { super(reason); } }
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new PushError("timeout")), ms))]);
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; if (!key) return "not_configured";
  const perm = await Notification.requestPermission(); if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await within(navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready), 12_000);
  let sub = await reg.pushManager.getSubscription();
  try { if (!sub) sub = await within(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }), 15_000); }
  catch (e) {
    // Si quedó una suscripción vieja hecha con otra clave, se borra y se intenta una vez más.
    if (e instanceof PushError) throw e;
    try { const old = await reg.pushManager.getSubscription(); await old?.unsubscribe(); sub = await within(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }), 15_000); }
    catch (e2) { throw e2 instanceof PushError ? e2 : new PushError("subscribe"); }
  }
  const j = sub.toJSON();
  const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) }).catch(() => null);
  if (!r?.ok) throw new PushError("server");
  return "on";
}
export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js"), sub = await reg?.pushManager.getSubscription();
  if (sub) { await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, remove: true }) }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  return "off";
}
// Si el permiso ya estaba dado (otra sesión/otro usuario en el mismo teléfono), vuelve a asociar este dispositivo con la cuenta actual.
export async function resyncPush(profileId?: string) {
  if (!pushSupported() || Notification.permission !== "granted" || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js"), sub = await reg?.pushManager.getSubscription(); if (!sub) return;
  // Solo si cambió el dispositivo o la cuenta, o pasó un día: antes se llamaba al servidor en CADA apertura de la app.
  const j = sub.toJSON(), mark = `${profileId ?? ""}|${j.endpoint}`, KEY = "yf-push-sync";
  try { const prev = JSON.parse(localStorage.getItem(KEY) ?? "null") as { m: string; t: number } | null; if (prev && prev.m === mark && Date.now() - prev.t < 86_400_000) return; } catch {}
  const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) }).catch(() => null);
  if (r?.ok) { try { localStorage.setItem(KEY, JSON.stringify({ m: mark, t: Date.now() })); } catch {} }
}
