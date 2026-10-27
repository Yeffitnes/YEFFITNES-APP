"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { enablePush, pushState, type PushState } from "@/lib/push-client";
import { signOut } from "@/app/login/actions";
import { Guide } from "./Guide";
import { Onboarding } from "./Onboarding";
const isIos = () => typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

// Primer arranque del cliente (decisión de Cristian, 27-oct): 1) notificaciones OBLIGATORIAS; 2) después, la bienvenida interactiva.
// Si el teléfono no admite avisos (o aún no hay claves VAPID) no se puede exigir: se sigue sin bloquear.
export function FirstRun() {
  const [ps, setPs] = useState<PushState | "check">("check");
  const check = useCallback(() => { void pushState().then(setPs).catch(() => setPs("unsupported")); }, []);
  useEffect(() => {
    check();
    const onVis = () => { if (document.visibilityState === "visible") check(); };   // vuelve de Ajustes con los avisos activados
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [check]);
  if (ps === "check") return null;
  if (ps === "off" || ps === "denied") return <NotifyGate state={ps} onState={setPs} recheck={check} />;
  return <Onboarding />;
}

function NotifyGate({ state, onState, recheck }: { state: "off" | "denied"; onState: (s: PushState) => void; recheck: () => void }) {
  const [busy, setBusy] = useState(false), [tried, setTried] = useState(false);
  const turnOn = async () => { setBusy(true); try { onState(await enablePush()); } catch { onState("off"); } finally { setBusy(false); setTried(true); } };
  return createPortal(
    <div className="nf-gate" role="dialog" aria-modal="true" aria-labelledby="nf-title">
      <div className="nf-box">
        <Guide size={72} talking />
        <h2 id="nf-title" className="nf-title">Activa las notificaciones</h2>
        <p className="nf-sub">Es lo único obligatorio para usar la app. Así te llegan los recordatorios de tu rutina y tu reporte, y las respuestas de Jeff.</p>
        {state === "off" && <>
          <button type="button" className="lk-cta nf-btn" disabled={busy} onClick={() => void turnOn()}>{busy ? "Activando…" : "Activar notificaciones"}</button>
          {tried && <p className="nf-hint">Si no apareció la pregunta del teléfono, vuelve a tocar el botón.</p>}
        </>}
        {state === "denied" && <>
          <p className="nf-hint"><b>Las notificaciones están bloqueadas en este teléfono.</b> Actívalas así y vuelve a la app:</p>
          <ol className="nf-steps">
            {isIos()
              ? <><li>Abre <b>Ajustes</b> del iPhone.</li><li>Entra a <b>Notificaciones</b> y busca <b>YEFFITNES</b>.</li><li>Activa <b>Permitir notificaciones</b>.</li></>
              : <><li>Mantén presionado el icono de <b>YEFFITNES</b> y toca <b>Información de la app</b>.</li><li>Entra a <b>Notificaciones</b>.</li><li>Activa <b>Todas las notificaciones</b>.</li></>}
          </ol>
          <button type="button" className="lk-cta nf-btn" onClick={recheck}>Ya las activé</button>
        </>}
        <form action={signOut}><button className="nf-out">Salir de la cuenta</button></form>
      </div>
    </div>, document.body);
}
