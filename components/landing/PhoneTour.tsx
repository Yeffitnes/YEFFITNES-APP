"use client";
// Celular interactivo de la landing (22-nov): pantallas REALES del portal del cliente (capturas de tools/landing/capture.js, con una
// clienta de demostración que lleva 12 semanas). Puntos rojos sobre cada parte; al tocar uno, el personaje de Yeff explica qué es.
// "Recorrido" avanza solo por todo el ecosistema; cualquier toque lo pausa. La barra de abajo cambia de pantalla como en la app.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Guide, type GuidePose } from "@/components/portal/Guide";
import { BN_ICONS } from "@/components/portal/icons";
import data from "./screens.json";

type Spot = { id: string; x: number; y: number; w: number; h: number; title: string; text: string; go?: string };
type Screen = { id: string; height: number; start: number; spots: Spot[] };
const SCREENS = new Map((data.screens as Screen[]).map((s) => [s.id, s]));
const W = data.width;
// Cada pantalla pertenece a una pestaña de la barra de abajo (las de "Hoy" se abren desde Hoy).
const TABS = [["hoy", "HOY"], ["plan", "PLAN"], ["agenda", "AGENDA"], ["progreso", "PROGRESO"], ["material", "MATERIAL"]] as const;
const TAB_OF: Record<string, string> = { hoy: "hoy", ejercicio: "hoy", resumen: "hoy", mensajes: "hoy", plan: "plan", nutricion: "plan", agenda: "agenda", progreso: "progreso", material: "material" };
const POSE: Record<string, GuidePose> = { hoy: "wave", ejercicio: "workout", resumen: "cheer", mensajes: "phone", plan: "point", nutricion: "hydrate", agenda: "clipboard", progreso: "flex", material: "study" };
const BACK: Record<string, string> = { ejercicio: "Volver a Hoy", resumen: "Volver a Hoy", mensajes: "Volver a Hoy", nutricion: "Ver entrenamiento" };
// El recorrido: en orden, todo lo que ve un cliente.
export const TOUR: [string, string][] = [
  ["hoy", "dia"], ["hoy", "rutina"], ["ejercicio", "series"], ["hoy", "reporte"], ["hoy", "resumen"], ["resumen", "titulo"], ["hoy", "nutricion"], ["hoy", "habitos"],
  ["hoy", "sesion"], ["hoy", "progreso"], ["mensajes", "chat"], ["mensajes", "respuestas"], ["plan", "semana"], ["plan", "dia"], ["plan", "nivel"], ["nutricion", "comidas"], ["nutricion", "macros"],
  ["agenda", "calendario"], ["agenda", "proximas"], ["progreso", "resumenes"], ["progreso", "semana"], ["progreso", "logros"], ["progreso", "habitos"], ["progreso", "metrica"], ["material", "lista"],
].filter(([s, p]) => SCREENS.get(s)?.spots.some((x) => x.id === p)) as [string, string][];
const AUTO_MS = 6000;
export type TourHandle = { show: (screen: string, spot?: string) => void };

export const PhoneTour = forwardRef<TourHandle, { compact?: boolean }>(function PhoneTour(_props, ref) {
  const [screen, setScreen] = useState("hoy"), [spot, setSpot] = useState<string | null>("dia"), [auto, setAuto] = useState(false), [seen, setSeen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null), [scale, setScale] = useState(1);
  const sc = SCREENS.get(screen)!, cur = sc.spots.find((s) => s.id === spot) ?? null;
  const idx = TOUR.findIndex(([a, b]) => a === screen && b === spot);
  // Escala de la captura (390 px) al ancho real de la pantalla del celular dibujado.
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setScale(el.clientWidth / W)); ro.observe(el); return () => ro.disconnect(); }, []);
  const scrollTo = useCallback((y: number, smooth = true) => { const el = scroller.current; if (el) el.scrollTo({ top: Math.max(0, y * scale - 70), behavior: smooth ? "smooth" : "auto" }); }, [scale]);
  const show = useCallback((s: string, p?: string, fromUser = true) => {
    if (fromUser) setAuto(false);
    const target = SCREENS.get(s); if (!target) return;
    const sp = p ? target.spots.find((x) => x.id === p) ?? null : null;
    if (s !== screen) { setScreen(s); setSpot(sp?.id ?? null); requestAnimationFrame(() => scrollTo(sp ? sp.y : target.start, false)); }
    else { setSpot(sp?.id ?? null); scrollTo(sp ? sp.y : target.start); }
  }, [screen, scrollTo]);
  useImperativeHandle(ref, () => ({ show: (s, p) => show(s, p) }), [show]);
  const step = useCallback((d: 1 | -1, fromUser = true) => { const i = idx < 0 ? (d > 0 ? 0 : TOUR.length - 1) : (idx + d + TOUR.length) % TOUR.length; show(TOUR[i][0], TOUR[i][1], fromUser); }, [idx, show]);
  // Recorrido automático: arranca la primera vez que el celular se ve en pantalla; cualquier toque lo pausa.
  useEffect(() => { if (!auto) return; const t = setTimeout(() => step(1, false), AUTO_MS); return () => clearTimeout(t); }, [auto, step]);
  useEffect(() => {
    const el = box.current; if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true); } }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [seen]);
  useEffect(() => { if (cur) scrollTo(cur.y, false); }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const tab = TAB_OF[screen];
  const sections = useMemo(() => TABS.map(([t, label]) => ({ t, label, n: TOUR.filter(([s]) => TAB_OF[s] === t).length })), []);
  return (
    <div className="lt">
      <div className="lt-phone-wrap">
        <div className="lt-phone" onPointerDown={() => setAuto(false)}>
          <div className="lt-island" aria-hidden />
          <div className="lt-status" aria-hidden><span>9:41</span><span className="lt-status-ic"><i /><i /><i /></span></div>
          <div className="lt-screen" ref={box}>
            <div className="lt-scroll" ref={scroller} key={screen}>
              <div className="lt-canvas" style={{ height: sc.height * scale }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/landing/shots/${screen}.webp`} alt={`Pantalla ${screen} de la app Yeffitness (datos de ejemplo)`} width={W} height={sc.height} draggable={false} />
                {cur && <div className="lt-focus" style={{ left: cur.x * scale - 3, top: cur.y * scale - 3, width: cur.w * scale + 6, height: cur.h * scale + 6 }} aria-hidden />}
                {sc.spots.map((s) => (
                  <button key={s.id} type="button" className={`lt-dot${s.id === spot ? " on" : ""}`} aria-label={s.title} title={s.title}
                    style={{ left: Math.min((s.x + s.w) * scale - 22, (W - 18) * scale), top: s.y * scale + Math.min(14, s.h * scale / 2 - 7) }} onClick={() => show(screen, s.id)}><i /></button>))}
              </div>
            </div>
            {BACK[screen] && <button type="button" className="lt-back" onClick={() => show(screen === "nutricion" ? "plan" : "hoy")}>{BACK[screen]}</button>}
          </div>
          <nav className="lt-nav" aria-label="Pantallas de la app">{TABS.map(([t, label], i) => (
            <button key={t} type="button" className={tab === t ? "on" : ""} aria-pressed={tab === t} onClick={() => show(t, SCREENS.get(t)?.spots[0]?.id)}>
              <span dangerouslySetInnerHTML={{ __html: BN_ICONS[i] }} style={{ display: "contents" }} /><small>{label}</small></button>))}</nav>
        </div>
        <p className="lt-note">Pantallas reales de la app con datos de ejemplo.</p>
      </div>
      <div className="lt-side">
        <div className="lt-guide" key={screen}>
          <span className="gd-pop"><Guide size={92} pose={POSE[screen] ?? "idle"} dir="left" /></span>
          <div className="lt-bubble" aria-live="polite" key={`${screen}-${spot}`}>
            {cur ? <><b>{cur.title}</b><p>{cur.text}</p>
              {cur.go && <button type="button" className="lt-go" onClick={() => show(cur.go!, SCREENS.get(cur.go!)?.spots[0]?.id)}>Verlo en la app</button>}</>
              : <><b>Toca un punto rojo</b><p>Cada punto es una parte de la app. Tócalo y te cuento para qué sirve.</p></>}
          </div>
        </div>
        <div className="lt-ctrl">
          <button type="button" onClick={() => step(-1)} aria-label="Anterior">Anterior</button>
          <button type="button" className={`lt-play${auto ? " on" : ""}`} aria-label={auto ? "Pausar el recorrido automático" : "Reproducir el recorrido automático"} onClick={() => setAuto((a) => !a)}>{auto ? "Pausar" : "Reproducir"}</button>
          <button type="button" onClick={() => step(1)} aria-label="Siguiente">Siguiente</button>
        </div>
        <div className="lt-prog" aria-label={`Paso ${idx + 1} de ${TOUR.length}`}>
          {sections.map(({ t, label, n }) => <button key={t} type="button" className={tab === t ? "on" : ""} aria-label={`${label.charAt(0) + label.slice(1).toLowerCase()}: ${n} paradas`} onClick={() => show(t, SCREENS.get(t)?.spots[0]?.id)}>{label.charAt(0) + label.slice(1).toLowerCase()}</button>)}
        </div>
        <div className="lt-count">{idx >= 0 ? `${idx + 1} de ${TOUR.length}` : `${TOUR.length} paradas`}{auto && <span className="lt-bar" key={idx} style={{ animationDuration: `${AUTO_MS}ms` }} />}</div>
      </div>
    </div>
  );
});
