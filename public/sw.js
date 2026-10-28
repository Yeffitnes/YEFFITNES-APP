/* YEFFITNES TRAINING — avisos push y archivos fijos en el teléfono.
   Solo guarda archivos que nunca cambian de contenido (/_next/static lleva la versión en el nombre) y, aparte, logos e iconos
   (se muestran del teléfono y se actualizan por detrás). Las pantallas y los datos SIEMPRE vienen de internet:
   así nunca se queda una versión vieja de la app. */
const STATIC = "yf-static-v1", ASSETS = "yf-assets-v1", KEEP = [STATIC, ASSETS], MAX = 400;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));
async function trim(c) { const keys = await c.keys(); for (let i = 0; i < keys.length - MAX; i++) await c.delete(keys[i]); }
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url); if (u.origin !== self.location.origin) return;
  if (u.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok) { c.put(req, r.clone()).then(() => trim(c)).catch(() => {}); } return r;
    }));
  } else if (/^\/(brand\/|icon-|apple-touch-icon)/.test(u.pathname)) {
    e.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; });
      if (hit) { net.catch(() => {}); return hit; } return net;
    }));
  }
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "YEFFITNES TRAINING", {
    body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || "yeffitnes", renotify: true, data: { url: d.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { if ("navigate" in c) c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
