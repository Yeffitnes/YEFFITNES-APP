"use client";
import { useEffect, useState } from "react";
type Evt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let saved: Evt | null = null;
// Instalar la app: Android/Chrome da un botón nativo; iPhone solo permite hacerlo a mano (Compartir → Añadir a pantalla de inicio).
export function useInstall() {
  const [can, setCan] = useState(!!saved), [standalone, setStandalone] = useState(false), [ios, setIos] = useState(false);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = (e: Event) => { e.preventDefault(); saved = e as Evt; setCan(true); }, done = () => { saved = null; setCan(false); setStandalone(true); };
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  const install = async () => { if (!saved) return; await saved.prompt(); await saved.userChoice.catch(() => {}); saved = null; setCan(false); };
  return { canInstall: can && !standalone, iosHint: ios && !standalone, install };
}
