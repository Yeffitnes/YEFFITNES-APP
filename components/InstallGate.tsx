"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
// Obliga a usar la app instalada en celulares y tablets. Solo actúa si NEXT_PUBLIC_REQUIRE_INSTALL=1.
// Computador: sin bloqueo (coach). Es un bloqueo suave: guía a la instalación; no es un control de seguridad.
const ON = process.env.NEXT_PUBLIC_REQUIRE_INSTALL === "1";
type Mode = "check" | "ok" | "ios" | "android" | "inapp" | "other" | "installed";
// 16-nov (Android): al terminar de instalar, la pestaña del navegador quedaba abierta y usable ("appinstalled" la dejaba pasar).
// Ahora esa pestaña muestra "ya está instalada, ábrela desde el icono" y se recuerda en el teléfono para las próximas veces.
const DONE = "yf-installed";
const wasInstalled = () => { try { return localStorage.getItem(DONE) === "1"; } catch { return false; } };
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
    const m = detect(); setMode(m !== "ok" && m !== "inapp" && m !== "other" && wasInstalled() ? "installed" : m);
    // Si Chrome ofrece instalar, la app NO está instalada (p. ej. la borraron): se olvida la marca y se vuelve a guiar la instalación.
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvt); try { localStorage.removeItem(DONE); } catch {} setMode((m) => (m === "installed" ? "android" : m)); };
    const onInstalled = () => { try { localStorage.setItem(DONE, "1"); } catch {} setMode("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  // Rapidez: mientras revisa ("check", también en el servidor) se muestra la app de una vez. Antes salía una pantalla vacía
  // hasta que el teléfono terminaba de cargar todo el código, y eso era buena parte de la espera al abrir.
  if (!ON || mode === "ok" || mode === "check" || path.startsWith("/auth")) return <>{children}</>;
  return (
    <main className="ig">
      <img src="/brand/logo.svg" alt="Yeffitness" width={190} height={46} className="ig-logo" />
      <h1>{mode === "installed" ? "Abre la app desde su icono" : "Instala la app para continuar"}</h1>
      <p className="ig-sub">{mode === "installed" ? "Yeffitness ya está instalada en este celular. Ciérrala aquí en el navegador y ábrela desde el icono Yeffitness de tu pantalla de inicio." : "Yeffitness se usa desde la app instalada en tu celular, no desde el navegador."}</p>
      {mode === "installed" && (
        <ol className="ig-steps">
          <li>Busca el icono <b>Yeffitness</b> en tu pantalla de inicio o en el cajón de apps.</li>
          <li>Si no lo encuentras, toca el menú <b>⋮</b> de Chrome y elige <b>Abrir app</b> o <b>Instalar app</b>.</li>
        </ol>
      )}
      {mode === "ios" && (
        <ol className="ig-steps">
          <li>Abre esta dirección en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <b>Añadir a pantalla de inicio</b> y confirma.</li>
          <li>Abre <b>Yeffitness</b> desde el icono nuevo.</li>
        </ol>
      )}
      {mode === "android" && (
        <>
          {evt && <button className="ig-btn" onClick={async () => { await evt.prompt(); setEvt(null); }}>Instalar la app</button>}
          <ol className="ig-steps">
            {!evt && <li>Toca el menú <b>⋮</b> de Chrome y elige <b>Instalar app</b>. Si sale <b>Añadir a pantalla de inicio</b>, tócalo y elige <b>Instalar</b>, no “Crear acceso directo” (el acceso directo queda con el logo de Chrome encima).</li>}
            <li>Abre <b>Yeffitness</b> desde el icono nuevo.</li>
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
