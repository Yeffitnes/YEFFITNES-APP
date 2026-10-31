/* YEFFITNES TRAINING — avisos push y archivos fijos en el teléfono.
   Solo guarda archivos que nunca cambian de contenido (/_next/static lleva la versión en el nombre) y, aparte, logos e iconos
   (se muestran del teléfono y se actualizan por detrás). Las pantallas y los datos SIEMPRE vienen de internet:
   así nunca se queda una versión vieja de la app.
   30-oct (noche): para entrenar SIN SEÑAL, las pantallas del cliente (/inicio…) se guardan cada vez que abren bien. Si no hay
   internet (o tarda más de 8 s y ya hay una copia), se muestra la última copia guardada; con internet siempre se usa la nueva.
   Al cerrar sesión se borran (components/SignOutButton.tsx). Las del coach nunca se guardan. */
const STATIC = "yf-static-v1", ASSETS = "yf-assets-v1", PAGES = "yf-pages-v1", KEEP = [STATIC, ASSETS, PAGES], MAX = 400;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));
async function trim(c) { const keys = await c.keys(); for (let i = 0; i < keys.length - MAX; i++) await c.delete(keys[i]); }
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url); if (u.origin !== self.location.origin) return;
  if (req.mode === "navigate" && /^\/inicio(\/|$)/.test(u.pathname)) { e.respondWith(page(req, u.pathname)); return; }
  if (u.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok) { c.put(req, r.clone()).then(() => trim(c)).catch(() => {}); } return r;
    }));
  } else if (/^\/(brand\/|ex\/|icon-|apple-touch-icon)/.test(u.pathname)) {   // ex/: imágenes de los ejercicios
    e.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; });
      if (hit) { net.catch(() => {}); return hit; } return net;
    }));
  }
});
async function page(req, key) {
  const c = await caches.open(PAGES), net = fetch(req).then((r) => {
    if (r.ok && !r.redirected && (r.headers.get("content-type") || "").includes("text/html")) c.put(key, r.clone()).catch(() => {});
    return r;
  });
  const saved = () => c.match(key).then((h) => h || c.match("/inicio"));
  try {
    // Señal muy lenta: a los 8 s, si hay copia, se muestra la copia (la app vuelve a pedir los datos cuando la señal mejore).
    const slow = new Promise((ok) => setTimeout(() => saved().then((h) => h && ok(h)), 8000));
    return await Promise.race([net, slow]);
  } catch {
    const h = await saved(); if (h) return h;
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:system-ui;padding:32px;text-align:center'><h2>Sin conexión</h2><p>Abre la app una vez con internet para poder usarla después sin señal.</p></body>", { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
self.addEventListener("message", (e) => { if (e.data === "yf-clear-pages") e.waitUntil(caches.delete(PAGES)); });
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
