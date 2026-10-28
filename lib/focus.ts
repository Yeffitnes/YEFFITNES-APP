"use client";
import { useEffect, useRef } from "react";
// Llevar directo a una parte de Hoy (pedido de Cristian, 28-oct): un aviso o una notificación con "/inicio#reporte"
// abre esa tarjeta, la despliega y la muestra. Sirve igual si ya estás en Hoy (evento) o si vienes de otra pantalla (#ancla).
export const FOCUS_EVT = "yf-focus";
export const ANCHORS = { report: "reporte", train: "rutina", meals: "nutricion" } as const;
export function focusAnchor(anchor: string) { try { history.replaceState(history.state, "", `${location.pathname}#${anchor}`); } catch { /* nada */ } window.dispatchEvent(new CustomEvent(FOCUS_EVT, { detail: anchor })); }
export function useFocusAnchor(anchor: string, open?: () => void) {
  const ref = useRef(open); ref.current = open;
  useEffect(() => {
    const go = () => {
      ref.current?.();
      let n = 0;
      const tryScroll = () => {
        const el = document.getElementById(anchor);
        if (!el) { if (n++ < 25) setTimeout(tryScroll, 120); return; }
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("focus-flash"); setTimeout(() => el.classList.remove("focus-flash"), 1800);
      };
      setTimeout(tryScroll, 60);
    };
    const onHash = () => { if (location.hash === `#${anchor}`) go(); };
    const onEvt = (e: Event) => { if ((e as CustomEvent<string>).detail === anchor) go(); };
    onHash();
    window.addEventListener("hashchange", onHash); window.addEventListener(FOCUS_EVT, onEvt);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener(FOCUS_EVT, onEvt); };
  }, [anchor]);
}
