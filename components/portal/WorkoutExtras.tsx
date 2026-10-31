"use client";
// Pedido de Cristian (30-oct, noche): temporizador de descanso, celebración de récords, aviso de "sin señal" y hábitos del día.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// El temporizador y el récord se dibujan en el <body>: dentro de la tarjeta de la rutina "fixed" quedaba pegado a la tarjeta, no a la pantalla.
const toBody = (n: React.ReactNode) => (typeof document === "undefined" ? null : createPortal(n, document.body));
import { Icon } from "@/components/ui/Icon";
import { GuideFace } from "./Guide";
import { useOfflineState } from "@/lib/offline";
import { localDate } from "@/lib/fetchers";
import { useHabits, useLogHabit } from "@/lib/extras";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
export const kgTxt = (n: number) => `${String(n).replace(".", ",")} kg`;

// ---------- Temporizador de descanso ----------
// Se calcula con la hora de fin (no con un contador): sigue bien aunque el teléfono bloquee la pantalla un rato.
let audio: AudioContext | null = null;
/** Se llama en el toque de guardar la serie (un gesto del usuario): así el navegador deja sonar el aviso al final. */
export function primeSound() {
  try { const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; audio = audio ?? new AC(); if (audio.state === "suspended") void audio.resume(); } catch { audio = null; }
}
function beep() {
  try { if (!audio) return; const t0 = audio.currentTime;
    [0, 0.22].forEach((d) => { const o = audio!.createOscillator(), g = audio!.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audio!.destination);
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.16); o.start(t0 + d); o.stop(t0 + d + 0.18); });
  } catch { /* sin sonido */ }
}
export type Rest = { end: number; total: number; label: string };
export function RestTimer({ rest, onChange }: { rest: Rest | null; onChange: (r: Rest | null) => void }) {
  const [now, setNow] = useState(() => Date.now()), [done, setDone] = useState(false), fired = useRef<number | null>(null);
  useEffect(() => { if (!rest) return; setDone(false); const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [rest]);
  // Mientras se ve la barra, la página gana espacio abajo para que la barra no tape lo último (p. ej. "Terminar entrenamiento").
  useEffect(() => { if (!rest) return; document.body.classList.add("has-rest"); return () => document.body.classList.remove("has-rest"); }, [rest]);
  const left = rest ? Math.ceil((rest.end - now) / 1000) : 0;
  useEffect(() => {
    if (!rest || left > 0 || fired.current === rest.end) return;
    fired.current = rest.end; setDone(true); beep();
    try { navigator.vibrate?.([220, 120, 220]); } catch { /* sin vibración */ }
    const t = setTimeout(() => onChange(null), 3500); return () => clearTimeout(t);
  }, [left, rest, onChange]);
  if (!rest) return null;
  const pct = Math.min(100, Math.max(0, ((rest.total - Math.max(0, left)) / rest.total) * 100));
  return toBody(
    <div className={`rest-bar${done ? " done" : ""}`} role="timer" aria-live="polite" aria-label={done ? "Descanso terminado" : `Descanso: quedan ${mmss(left)}`}>
      <i className="rest-fill" style={{ width: `${pct}%` }} />
      <span className="rest-ico"><Icon name="clock" size={16} /></span>
      <span className="rest-txt"><b>{done ? "¡A la siguiente serie!" : mmss(left)}</b><small>{done ? rest.label : `Descanso · ${rest.label}`}</small></span>
      {!done && <button type="button" onClick={() => onChange({ ...rest, end: rest.end + 15_000, total: rest.total + 15 })}>+15 s</button>}
      <button type="button" onClick={() => onChange(null)}>{done ? "Cerrar" : "Saltar"}</button>
    </div>
  );
}

// ---------- Récord ----------
export type RecordHit = { exercise: string; weight: number; prev: number; at: number };
export function RecordPop({ hit, onClose }: { hit: RecordHit | null; onClose: () => void }) {
  useEffect(() => { if (!hit) return; const t = setTimeout(onClose, 6000); try { navigator.vibrate?.(60); } catch { /* nada */ } return () => clearTimeout(t); }, [hit, onClose]);
  if (!hit) return null;
  return toBody(
    <button type="button" className="rec-pop gd-pop" role="status" onClick={onClose} aria-label="Cerrar">
      <span className="rec-face" aria-hidden><GuideFace size={46} /></span>
      <span className="rec-txt"><small>Nuevo récord</small><b>{hit.exercise}: {kgTxt(hit.weight)}</b><span>Tu mejor marca era {kgTxt(hit.prev)}. Jeff lo verá en tu resumen de la semana.</span></span>
    </button>
  );
}

// ---------- Sin señal ----------
export function OfflineBanner({ cid }: { cid: string }) {
  const { pending, offline } = useOfflineState(cid);
  if (!pending && !offline) return null;
  return (
    <div className="off-banner" role="status">
      <Icon name={offline ? "lock" : "clock"} size={14} />
      <span>{offline ? "Sin señal. Sigue entrenando: lo que registres queda guardado en tu teléfono" : "Volvió la señal: enviando lo que guardaste"}{pending ? ` (${pending} pendiente${pending === 1 ? "" : "s"}).` : "."}</span>
    </div>
  );
}

// ---------- Hábitos del día ----------
export function HabitsCard({ cid }: { cid: string }) {
  const h = useHabits(cid, 7), log = useLogHabit(cid), today = localDate();
  const cur = h.data?.find((x) => x.day === today), [steps, setSteps] = useState("");
  useEffect(() => { setSteps(cur?.steps != null ? String(cur.steps) : ""); }, [cur?.steps]);
  if (h.isPending) return <div className="card"><div className="sk" style={{ height: 120 }} /></div>;
  if (h.data === null || h.isError) return null;   // migración 0043 sin correr, o sin permiso: no se muestra
  const water = cur?.water ?? 0, sleep = cur?.sleep ?? null;
  const saveSteps = () => { const n = Math.round(Number(steps.replace(/\D/g, ""))); if (steps.trim() === "" || !(n >= 0) || n > 100000 || n === (cur?.steps ?? -1)) return; log.mutate({ day: today, steps: n }); };
  const weekWater = (h.data ?? []).filter((x) => x.water != null), avgW = weekWater.length ? weekWater.reduce((a, x) => a + (x.water ?? 0), 0) / weekWater.length : null;
  return (
    <div className="card habits-card" id="habitos">
      <div className="card-tag">Hábitos de hoy</div>
      <div className="card-title" style={{ fontSize: 16 }}>Agua, pasos y sueño</div>
      <p className="card-meta" style={{ marginBottom: 12 }}>Un toque cada uno. Jeff los ve en tu resumen de la semana.</p>
      <div className="hab-row">
        <span className="hab-lbl"><b>Agua</b><small>vasos hoy</small></span>
        <div className="hab-step"><button type="button" aria-label="Un vaso menos" disabled={water <= 0} onClick={() => log.mutate({ day: today, water: water - 1 })}>−</button><b aria-live="polite">{water}</b><button type="button" aria-label="Un vaso más" disabled={water >= 20} onClick={() => log.mutate({ day: today, water: water + 1 })}>+</button></div>
      </div>
      <div className="hab-glasses" aria-hidden>{Array.from({ length: Math.max(8, Math.min(20, water)) }, (_, i) => <i key={i} className={i < water ? "on" : ""} />)}</div>
      <div className="hab-row">
        <span className="hab-lbl"><b>Pasos</b><small>de hoy</small></span>
        <input className="hab-input" inputMode="numeric" value={steps} placeholder="0" aria-label="Pasos de hoy" onChange={(e) => setSteps(e.target.value.replace(/\D/g, "").slice(0, 6))} onBlur={saveSteps} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      </div>
      <div className="hab-row">
        <span className="hab-lbl"><b>Sueño</b><small>horas anoche</small></span>
        <div className="hab-step"><button type="button" aria-label="Media hora menos" disabled={sleep == null || sleep <= 0} onClick={() => log.mutate({ day: today, sleep: Math.max(0, (sleep ?? 0) - 0.5) })}>−</button><b aria-live="polite">{sleep == null ? "—" : String(sleep).replace(".", ",")}</b><button type="button" aria-label="Media hora más" disabled={sleep != null && sleep >= 16} onClick={() => log.mutate({ day: today, sleep: sleep == null ? 7 : Math.min(16, sleep + 0.5) })}>+</button></div>
      </div>
      {avgW != null && weekWater.length > 1 && <p className="hab-week">Esta semana: {avgW.toFixed(1).replace(".", ",")} vasos al día en promedio.</p>}
    </div>
  );
}
