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
import { useHabitSpecs, useHabits, useLogHabit, useLogHabitExtra } from "@/lib/extras";
import { fmtHabit, goalText, habitStats, isLowS, valueOf, type HabitSpec } from "@/lib/habits";
import { useToast } from "@/components/Providers";

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
export type Rest = { end: number; total: number; label: string; itemId?: string };
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
      <span>{offline ? "Sin señal. Sigue: tus series, hábitos, comidas y el reporte sin vídeo quedan guardados en tu teléfono" : "Volvió la señal: enviando lo que guardaste"}{pending ? ` (${pending} pendiente${pending === 1 ? "" : "s"}).` : "."}</span>
    </div>
  );
}

// ---------- Hábitos del día ----------
// Hábitos (2-nov; desde el 12-nov los define Jeff, 0052): el cliente anota HOY los hábitos activos de Jeff, cada uno con su meta (la suya
// si Jeff se la cambió). Agua, pasos y sueño con sus controles de siempre; los que agrega Jeff: número con su unidad, o sí/no.
// Avisos: el sueño se juzga con lo de anoche (ya pasó); los demás de número con AYER, que ya terminó (hoy todavía puede cumplir).
// Récord: al superar su mejor día de agua o de pasos de los últimos 90 días. Sin señal se guarda en el teléfono (lib/offline.ts).
export function HabitsCard({ cid }: { cid: string }) {
  const h = useHabits(cid, 7), hist = useHabits(cid, 90), specs = useHabitSpecs(cid), log = useLogHabit(cid), logX = useLogHabitExtra(cid), toast = useToast(), today = localDate();
  const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return localDate(d); })();
  const cur = h.data?.find((x) => x.day === today), prev = h.data?.find((x) => x.day === yest);
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (h.isPending || specs.isPending) return <div className="card"><div className="sk" style={{ height: 120 }} /></div>;
  if (h.data === null || h.isError || !specs.data?.length) return null;   // 0043 sin correr, sin permiso, o Jeff apagó todos
  const list = specs.data, week = h.data ?? [], days7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return localDate(d); });
  const best = (k: "water" | "steps") => Math.max(0, ...(hist.data ?? []).filter((x) => x.day !== today && x[k] != null).map((x) => x[k] as number));
  const save = (v: { water?: number; steps?: number; sleep?: number }) => {
    const bw = best("water"), bs = best("steps");
    log.mutate({ day: today, ...v }, { onSuccess: (r) => {
      if (r === "queued") return;
      if (v.water != null && bw > 0 && v.water > bw && (cur?.water ?? 0) <= bw) toast(`Nuevo récord de agua: ${v.water} vasos en un día (antes ${bw}).`);   // solo al cruzar el récord
      if (v.steps != null && bs > 0 && v.steps > bs && (cur?.steps ?? 0) <= bs) toast(`Nuevo récord de pasos: ${v.steps.toLocaleString("es-CO")} en un día (antes ${bs.toLocaleString("es-CO")}).`);
    } });
  };
  const num = (s: HabitSpec) => valueOf(cur, s);
  const txt = (s: HabitSpec) => draft[s.id] ?? (num(s) != null ? String(num(s)).replace(".", ",") : "");
  const commit = (s: HabitSpec) => {
    const raw = (draft[s.id] ?? "").trim(); if (draft[s.id] === undefined) return;
    setDraft((d) => { const n = { ...d }; delete n[s.id]; return n; });
    const n = raw === "" ? null : Number(raw.replace(/\./g, s.key === "steps" ? "" : ".").replace(",", "."));
    if (n != null && (!Number.isFinite(n) || n < 0 || n > 100000)) return;
    if (n === num(s)) return;
    if (s.key === "steps") { if (n != null) save({ steps: Math.round(n) }); } else logX.mutate({ day: today, habit: s.id, value: n });
  };
  const alerts: string[] = [];
  for (const s of list) {
    if (s.kind !== "number" || s.goal == null) continue;
    const v = s.key === "sleep" ? num(s) : valueOf(prev, s);
    if (!isLowS(s, v)) continue;
    alerts.push(s.key === "sleep" ? `Anoche dormiste ${fmtHabit(s, v!)}. Tu meta es al menos ${fmtHabit(s, s.goal)}: intenta acostarte más temprano hoy.`
      : s.key === "water" ? `Ayer tomaste ${fmtHabit(s, v!)}. Tu meta es ${fmtHabit(s, s.goal)}: intenta llegar hoy.`
      : s.key === "steps" ? `Ayer diste ${fmtHabit(s, v!)}. Hoy intenta pasar de ${fmtHabit(s, s.goal)}.`
      : `${s.name}: ayer ${fmtHabit(s, v!)}. Tu meta es ${fmtHabit(s, s.goal)} al día.`);
  }
  const avgs = list.map((s) => ({ s, st: habitStats(s, week, days7) })).filter((x) => x.st.n > 0);
  const water = cur?.water ?? 0, sleep = cur?.sleep ?? null;
  return (
    <div className="card habits-card" id="habitos">
      <div className="card-tag">Hábitos de hoy</div>
      <div className="card-title" style={{ fontSize: 16 }}>{list.length <= 3 ? list.map((s) => s.name).join(list.length === 2 ? " y " : ", ").replace(/, ([^,]*)$/, " y $1") : "Tus hábitos"}</div>
      <p className="card-meta" style={{ marginBottom: 12 }}>Anótalos cada día. Jeff ve cómo vas en la semana.</p>
      {alerts.map((a) => <p key={a} className="hab-alert" role="status"><Icon name="bell" size={14} />{a}</p>)}
      {list.map((s) => {
        const meta = s.goal != null ? <small>{s.kind === "check" ? `meta: ${goalText(s)}` : `meta ${fmtHabit(s, s.goal)}`}</small> : null;
        if (s.key === "water") return (<div key={s.id}>
          <div className="hab-row"><span className="hab-lbl"><b>Agua</b><small>vasos hoy{s.goal != null ? ` · meta ${s.goal}` : ""}</small></span>
            <div className="hab-step"><button type="button" aria-label="Un vaso menos" disabled={water <= 0} onClick={() => save({ water: water - 1 })}>−</button><b aria-live="polite">{water}</b><button type="button" aria-label="Un vaso más" disabled={water >= 20} onClick={() => save({ water: water + 1 })}>+</button></div></div>
          <div className="hab-glasses" aria-hidden>{Array.from({ length: Math.max(s.goal ?? 8, Math.min(20, water)) }, (_, i) => <i key={i} className={i < water ? "on" : ""} />)}</div></div>);
        if (s.key === "sleep") return (
          <div key={s.id} className="hab-row"><span className="hab-lbl"><b>Sueño</b><small>horas anoche{s.goal != null ? ` · meta ${fmtHabit(s, s.goal)}` : ""}</small></span>
            <div className="hab-step"><button type="button" aria-label="Media hora menos" disabled={sleep == null || sleep <= 0} onClick={() => save({ sleep: Math.max(0, (sleep ?? 0) - 0.5) })}>−</button><b aria-live="polite">{sleep == null ? "—" : String(sleep).replace(".", ",")}</b><button type="button" aria-label="Media hora más" disabled={sleep != null && sleep >= 16} onClick={() => save({ sleep: sleep == null ? 7 : Math.min(16, sleep + 0.5) })}>+</button></div></div>);
        if (s.kind === "check") { const on = (num(s) ?? 0) > 0;
          return (<div key={s.id} className="hab-row"><span className="hab-lbl"><b>{s.name}</b>{meta ?? <small>hoy</small>}</span>
            <button type="button" className={`hab-check${on ? " on" : ""}`} aria-pressed={on} onClick={() => logX.mutate({ day: today, habit: s.id, value: on ? null : 1 })}>{on ? <><Icon name="check" size={14} stroke={2.4} /> Hecho</> : "Marcar hecho"}</button></div>); }
        return (<div key={s.id} className="hab-row"><span className="hab-lbl"><b>{s.name}</b><small>{s.key === "steps" ? "de hoy" : s.unit ? `${s.unit} hoy` : "hoy"}{s.goal != null ? ` · meta ${s.key === "steps" ? s.goal.toLocaleString("es-CO") : fmtHabit(s, s.goal)}` : ""}</small></span>
          <input className="hab-input" inputMode={s.key === "steps" ? "numeric" : "decimal"} value={txt(s)} placeholder="0" aria-label={`${s.name} de hoy`}
            onChange={(e) => setDraft((d) => ({ ...d, [s.id]: s.key === "steps" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value.replace(/[^\d,.]/g, "").slice(0, 7) }))}
            onBlur={() => commit(s)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></div>);
      })}
      {!!avgs.length && <div className="hab-week-box">
        <span className="card-tag" style={{ marginBottom: 6 }}>Tu semana (promedio por día)</span>
        <div className="hab-avgs">{avgs.map(({ s, st }) => <div key={s.id} className={`hab-avg${st.ok === false ? " low" : ""}`}><small>{s.name}</small>
          <b>{s.kind === "check" ? `${st.done} de 7 días` : fmtHabit(s, st.avg!)}</b><span>{s.kind === "check" ? (s.goal != null ? `meta ${s.goal}` : "") : `${st.n} ${st.n === 1 ? "día anotado" : "días anotados"}`}</span></div>)}</div>
      </div>}
    </div>
  );
}
