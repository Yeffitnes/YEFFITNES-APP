"use client";
// Avisos del coach (22-nov, pedido de Cristian: "a Yeff no le llegan las notificaciones"). Antes el coach solo podía activarlos
// dentro de la campana y nada le decía que estaban apagados. Ahora, si este teléfono no tiene los avisos activos, sale arriba una
// franja oscura que no se puede pasar por alto:
//  - apagados: "Activar avisos" (pide el permiso, registra el teléfono y manda una prueba);
//  - bloqueados: los pasos exactos para el teléfono que usa (una página web no puede abrir los ajustes del teléfono por sí sola);
//  - iPhone sin instalar: cómo instalarla (en iPhone los avisos solo funcionan con la app en la pantalla de inicio).
// "Ahora no" la esconde hasta mañana en este teléfono.
import { useEffect, useState } from "react";
import { enablePush, pushState, pushTestText, testPush, type PushState } from "@/lib/push-client";
import { GuideFace } from "@/components/portal/Guide";

const KEY = "yf-coach-push-later";
type Dev = "android" | "ios" | "desktop";
const devOf = (): Dev => { const u = navigator.userAgent; return /iPhone|iPad|iPod/.test(u) ? "ios" : /Android/.test(u) ? "android" : "desktop"; };
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const STEPS: Record<Dev, string[]> = {
  android: ["En Chrome, toca los tres puntos (arriba a la derecha) → Configuración → Configuración de sitios → Notificaciones.", "Busca este sitio en “Bloqueados” y cámbialo a Permitir.", "Si aun así no llegan: Ajustes del teléfono → Apps → Chrome (y también Yeffitness, si aparece) → Notificaciones → activadas.", "Vuelve aquí y toca “Ya lo hice”."],
  ios: ["Abre Ajustes del iPhone → Notificaciones → Yeffitness.", "Activa “Permitir notificaciones”.", "Vuelve aquí y toca “Ya lo hice”."],
  desktop: ["Haz clic en el candado junto a la dirección del sitio → Notificaciones → Permitir.", "Vuelve aquí y toca “Ya lo hice”."],
};
export function CoachPushBanner() {
  const [ps, setPs] = useState<PushState | null>(null), [dev, setDev] = useState<Dev>("desktop"), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [hide, setHide] = useState(true), [inst, setInst] = useState(true);
  useEffect(() => {
    setDev(devOf()); setInst(standalone());
    try { const t = Number(localStorage.getItem(KEY) ?? 0); setHide(Date.now() - t < 20 * 3600_000); } catch { setHide(false); }
    const check = () => void pushState().then(setPs).catch(() => setPs("off"));
    check(); const v = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", v); return () => document.removeEventListener("visibilitychange", v);
  }, []);
  const later = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch {} setHide(true); };
  const turnOn = async () => {
    setBusy(true); setMsg("");
    try { const s = await enablePush(); setPs(s); if (s === "on") setMsg(pushTestText(await testPush())); }
    catch { setMsg("No se pudo activar en este teléfono. Si usas Android, ábrelo en Chrome; en iPhone, desde la app instalada."); }
    finally { setBusy(false); }
  };
  const iosBrowser = dev === "ios" && !inst;
  // Ya activos (o el sitio sin claves: eso no lo arregla el coach), u ocultos por "Ahora no": no se muestra.
  if (!ps || ps === "on" || ps === "not_configured" || (hide && !msg)) return null;
  if (ps === "unsupported" && !iosBrowser) return null;
  return (
    <div className="cpb" role="region" aria-label="Avisos de este teléfono">
      <span className="cpb-face" aria-hidden><GuideFace size={40} talking /></span>
      <div className="cpb-main">
        {msg ? <><b>Avisos activados</b><p>{msg}</p></>
          : iosBrowser ? <><b>Instala la app para recibir avisos</b><p>En iPhone, los avisos solo llegan con la app en la pantalla de inicio: toca Compartir → “Añadir a pantalla de inicio”, ábrela desde el icono y actívalos allí.</p></>
          : ps === "denied" ? <><b>Los avisos están bloqueados en este {dev === "desktop" ? "equipo" : "teléfono"}</b><p>Así no te enteras de reservas, cancelaciones, mensajes ni solicitudes. Para permitirlos:</p><ol>{STEPS[dev].map((s) => <li key={s}>{s}</li>)}</ol></>
          : <><b>Activa los avisos en este {dev === "desktop" ? "equipo" : "teléfono"}</b><p>Te llegan las reservas y cancelaciones de sesiones, los mensajes, los entrenamientos terminados y las solicitudes de clientes nuevos.</p></>}
      </div>
      <div className="cpb-acts">
        {msg ? <button type="button" className="cpb-btn" onClick={() => { setMsg(""); setHide(true); }}>Listo</button>
          : ps === "off" ? <button type="button" className="cpb-btn" disabled={busy} onClick={() => void turnOn()}>{busy ? "Activando…" : "Activar avisos"}</button>
          : ps === "denied" ? <button type="button" className="cpb-btn" onClick={() => void pushState().then((s) => { setPs(s); if (s === "off") void turnOn(); })}>Ya lo hice</button> : null}
        {!msg && <button type="button" className="cpb-later" onClick={later}>Ahora no</button>}
      </div>
    </div>
  );
}
