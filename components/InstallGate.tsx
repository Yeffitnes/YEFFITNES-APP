"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
// Obliga a usar la app instalada en celulares y tablets. Solo actúa si NEXT_PUBLIC_REQUIRE_INSTALL=1.
// Computador: sin bloqueo (coach). Es un bloqueo suave: guía a la instalación; no es un control de seguridad.
const ON = process.env.NEXT_PUBLIC_REQUIRE_INSTALL === "1";
type Mode = "check" | "ok" | "ios" | "android" | "inapp" | "other";
type InstallEvt = Event & { prompt: () => Promise<void> };
function detect(): Mode {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true || document.referrer.startsWith("android-app://");
  if (standalone) return "ok";
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipad;
  const android = /Android/.test(ua);
  if (!ios && !android) return "ok"; // computador
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|Messenger/i.test(ua)) return "inapp";
  return ios ? "ios" : /Chrome|CriOS|SamsungBrowser|EdgA|OPR/.test(ua) ? "android" : "other";
}
export function InstallGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [mode, setMode] = useState<Mode>(ON ? "check" : "ok");
  const [evt, setEvt] = useState<InstallEvt | null>(null);
  // El service worker guarda en el teléfono los archivos fijos de la app (código y logos) para abrirla más rápido la próxima vez.
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  useEffect(() => {
    if (!ON) return;
    setMode(detect());
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvt); };
    const onInstalled = () => setMode("ok");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  // Rapidez: mientras revisa ("check", también en el servidor) se muestra la app de una vez. Antes salía una pantalla vacía
  // hasta que el teléfono terminaba de cargar todo el código, y eso era buena parte de la espera al abrir.
  if (!ON || mode === "ok" || mode === "check" || path.startsWith("/auth")) return <>{children}</>;
  return (
    <main className="ig">
      <img src="/brand/logo.svg" alt="YEFFITNES TRAINING" width={190} height={46} className="ig-logo" />
      <h1>Instala la app para continuar</h1>
      <p className="ig-sub">YEFFITNES se usa desde la app instalada en tu celular, no desde el navegador.</p>
      {mode === "ios" && (
        <ol className="ig-steps">
          <li>Abre esta dirección en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <b>Añadir a pantalla de inicio</b> y confirma.</li>
          <li>Abre <b>YEFFITNES</b> desde el icono nuevo.</li>
        </ol>
      )}
      {mode === "android" && (
        <>
          {evt && <button className="ig-btn" onClick={async () => { await evt.prompt(); setEvt(null); }}>Instalar la app</button>}
          <ol className="ig-steps">
            {!evt && <li>Toca el menú <b>⋮</b> de tu navegador y elige <b>Instalar app</b> (o <b>Añadir a pantalla de inicio</b>).</li>}
            <li>Abre <b>YEFFITNES</b> desde el icono nuevo.</li>
          </ol>
        </>
      )}
      {(mode === "inapp" || mode === "other") && (
        <ol className="ig-steps">
          <li>Abre esta dirección en <b>Safari</b> (iPhone) o <b>Chrome</b> (Android). Este navegador no permite instalar la app.</li>
          <li>Instálala desde ahí y ábrela desde el icono.</li>
        </ol>
      )}
    </main>
  );
}
