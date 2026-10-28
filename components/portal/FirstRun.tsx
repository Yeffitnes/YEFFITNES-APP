"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { enablePush, pushState, resyncPush, PushError, type PushState } from "@/lib/push-client";
import { SignOutButton } from "@/components/SignOutButton";
import { Guide } from "./Guide";
import { Onboarding } from "./Onboarding";
import { useProfile } from "@/components/Providers";
const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);
const isIos = () => /iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
const isMobile = () => isIos() || /Android/.test(ua());
const isMac = () => /Macintosh/.test(ua()) && !isIos();
const isSafari = () => /Safari/.test(ua()) && !/Chrome|CriOS|Edg|OPR|Firefox/.test(ua());
// En el COMPUTADOR los avisos no bloquean la app (28-oct): en el celular sí son obligatorios. Si en el computador no se pueden activar,
// la persona puede seguir sin ellos; se recuerda en ese navegador y no se vuelve a preguntar.
const DESK_KEY = "yf-push-desktop-skip";
const deskSkipped = () => { try { return !isMobile() && localStorage.getItem(DESK_KEY) === "1"; } catch { return false; } };

// Primer arranque del cliente (decisión de Cristian): 1) notificaciones OBLIGATORIAS, sin poder tocar nada antes; 2) la bienvenida.
// Casos:
//  - "on": este teléfono ya tiene avisos (aunque los haya activado otra cuenta): se pasan a ESTA cuenta (resyncPush) y sigue.
//  - "off" / "denied": pantalla que no se puede saltar.
//  - "unsupported" en celular: casi siempre es iPhone/Android en el navegador sin instalar la app → pide instalarla (sin la app no hay avisos).
//  - "unsupported" en computador o "not_configured" (sin claves VAPID): no se puede exigir; sigue.
export function FirstRun() {
  const [ps, setPs] = useState<PushState | "check">("check"), { profileId } = useProfile();
  const check = useCallback(() => { void pushState().then((s) => { setPs(s); if (s === "on") void resyncPush(profileId); }).catch(() => setPs("unsupported")); }, [profileId]);
  useEffect(() => {
    check();
    const onVis = () => { if (document.visibilityState === "visible") check(); };   // vuelve de Ajustes con los avisos activados (o desactivados)
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [check]);
  if (ps === "check") return <div className="nf-gate nf-wait" aria-busy="true" />;   // mientras revisa (también al cargar en el servidor), nada se puede tocar
  if ((ps === "off" || ps === "denied") && !deskSkipped()) return <NotifyGate state={ps} onState={setPs} recheck={check} onSkip={() => { try { localStorage.setItem(DESK_KEY, "1"); } catch { /* nada */ } setPs("not_configured"); }} />;
  if (ps === "unsupported" && isMobile()) return <NotifyGate state="install" onState={setPs} recheck={check} />;
  return <Onboarding />;
}

function NotifyGate({ state, onState, recheck, onSkip }: { state: "off" | "denied" | "install"; onState: (s: PushState) => void; recheck: () => void; onSkip?: () => void }) {
  // Pedido de Cristian (28-oct): el botón de activar está SIEMPRE ahí, y también el personaje lo activa al tocarlo.
  // Si el teléfono las tiene bloqueadas, el sistema ya no muestra la pregunta: entonces salen los pasos para Ajustes.
  const [busy, setBusy] = useState(false), [tried, setTried] = useState(false), [blocked, setBlocked] = useState(state === "denied"), [fail, setFail] = useState("");
  const turnOn = async () => {
    if (busy) return; setBusy(true); setFail("");
    try { const r = await enablePush(); onState(r); if (r === "denied") setBlocked(true); }
    catch (e) {
      const why = e instanceof PushError ? e.reason : "subscribe";
      setFail(why === "server" ? "Se activaron en este equipo, pero no pudimos guardarlas. Revisa tu conexión y vuelve a tocar el botón."
        : why === "timeout" ? "El navegador tardó demasiado en responder. Vuelve a tocar el botón; si sigue igual, recarga la página."
        : "Este navegador no dejó activarlas." + (!isMobile() ? " Prueba con Chrome o sigue sin avisos en este computador." : " Vuelve a intentarlo."));
    } finally { setBusy(false); setTried(true); }
  };
  const ios = isIos();
  return createPortal(
    <div className="nf-gate" role="dialog" aria-modal="true" aria-labelledby="nf-title">
      <div className="nf-box">
        {state === "install"
          ? <Guide size={110} pose="wave" />
          : <button type="button" className="nf-guide" aria-label="Activar notificaciones" onClick={() => void turnOn()}><Guide size={110} pose={busy ? "cheer" : "wave"} /></button>}
        <h2 id="nf-title" className="nf-title">{state === "install" ? "Instala la app para seguir" : "Activa las notificaciones"}</h2>
        <p className="nf-sub">{state === "install"
          ? "Las notificaciones son obligatorias y en el celular solo funcionan con la app instalada. Instálala y ábrela desde el icono."
          : isMobile() ? "Es lo único obligatorio para usar la app. Así te llegan los recordatorios de tu rutina y tu reporte, y las respuestas de Jeff."
          : "Así te llegan los recordatorios y las respuestas de Jeff también en este computador. En el celular son obligatorias; aquí puedes seguir sin ellas."}</p>
        {state !== "install" && <>
          <button type="button" className="lk-cta nf-btn" disabled={busy} onClick={() => void turnOn()}>{busy ? "Activando…" : "Activar notificaciones"}</button>
          {fail && <p className="nf-hint nf-fail" role="alert">{fail}</p>}
          {tried && !blocked && !fail && <p className="nf-hint">Si no apareció la pregunta {isMobile() ? "del teléfono" : "del navegador"}, vuelve a tocar el botón y elige <b>Permitir</b>.</p>}
          {blocked && <>
            <p className="nf-hint"><b>{isMobile() ? "Tu teléfono las tiene bloqueadas" : "Este navegador las tiene bloqueadas"}</b> y ya no deja preguntar desde la app. Actívalas así y vuelve:</p>
            <ol className="nf-steps">
              {!isMobile()
                ? isSafari()
                  ? <><li>En el menú de arriba: <b>Safari → Ajustes</b> (o Preferencias) → <b>Sitios web</b>.</li><li>A la izquierda, <b>Notificaciones</b>. Busca esta dirección y elige <b>Permitir</b>.</li>{isMac() && <li>Si aun así no llegan: <b>Ajustes del Sistema → Notificaciones → Safari</b> y activa <b>Permitir notificaciones</b>.</li>}</>
                  : <><li>Toca el <b>candado</b> (o el icono de ajustes) a la izquierda de la dirección, arriba.</li><li>En <b>Notificaciones</b>, elige <b>Permitir</b> y recarga la página.</li>{isMac() && <li>Si aun así no llegan: <b>Ajustes del Sistema → Notificaciones → Google Chrome</b> y activa <b>Permitir notificaciones</b>.</li>}</>
              : ios
                ? <><li>Abre <b>Ajustes</b> del iPhone.</li><li>Entra a <b>Notificaciones</b> y busca <b>YEFFITNES</b>.</li><li>Activa <b>Permitir notificaciones</b>.</li></>
                : <><li>Mantén presionado el icono de <b>YEFFITNES</b> y toca <b>Información de la app</b>.</li><li>Entra a <b>Notificaciones</b>.</li><li>Activa <b>Todas las notificaciones</b>.</li></>}
            </ol>
            <button type="button" className="nf-again" onClick={recheck}>{isMobile() ? "Ya las activé en Ajustes" : "Ya las permití"}</button>
          </>}
        </>}
        {state === "install" && <>
          <ol className="nf-steps">
            {ios
              ? <><li>Abre esta dirección en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li><li>Elige <b>Añadir a pantalla de inicio</b> y abre <b>YEFFITNES</b> desde el icono nuevo.</li></>
              : <><li>Abre esta dirección en <b>Chrome</b>.</li><li>Toca el menú (los tres puntos) y elige <b>Instalar app</b>.</li><li>Abre <b>YEFFITNES</b> desde el icono nuevo.</li></>}
          </ol>
          <button type="button" className="lk-cta nf-btn" onClick={recheck}>Ya la instalé</button>
        </>}
        {onSkip && !isMobile() && state !== "install" && <button type="button" className="nf-skip" onClick={onSkip}>Seguir sin avisos en este computador</button>}
        <SignOutButton className="nf-out" label="Salir de la cuenta" />
      </div>
    </div>, document.body);
}
