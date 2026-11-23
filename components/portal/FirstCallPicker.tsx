"use client";
// Primera llamada guiada (22-nov; rehecha el 22-nov en la noche). Mientras el cliente no haya agendado nunca, la Agenda abre esto:
// cabecera de la marca con el personaje, que dice en una frase qué hacer y cambia según el paso (elegir, confirmar, listo); los pasos
// a la vista; los días con horario en una fila (como la semana del plan) y las horas de ese día agrupadas en mañana, tarde y noche.
// Arriba, el cambio "Horarios para ti" / "Calendario completo" (FirstCallModes): el calendario completo es la agenda de siempre y
// desde allí se puede volver aquí con el mismo cambio (antes, quien entraba al calendario no tenía cómo volver).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { KIND_LABEL, useBookSlot, type Slot } from "@/lib/queries";
import { icsHref } from "@/lib/ics";
import { useNow } from "@/lib/use-now";
import { Guide } from "./Guide";
import { Icon } from "@/components/ui/Icon";

const DAYS_AHEAD = 28;
const ampm = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?a\.?\s?m\.?/i, " a. m.").replace(/\s?p\.?\s?m\.?/i, " p. m.");
const dayKey = (iso: string) => new Date(iso).toDateString();
const offsetOf = (iso: string, now: Date) => { const t = new Date(now); t.setHours(0, 0, 0, 0); return Math.round((new Date(iso).setHours(0, 0, 0, 0) - t.getTime()) / 86_400_000); };
function dayLabel(iso: string, now: Date) {
  const k = offsetOf(iso, now), long = new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return k === 0 ? `Hoy, ${long}` : k === 1 ? `Mañana, ${long}` : long.charAt(0).toUpperCase() + long.slice(1);
}
const short = (iso: string, now: Date) => { const k = offsetOf(iso, now); return k === 0 ? "Hoy" : k === 1 ? "Mañana" : new Date(iso).toLocaleDateString("es", { weekday: "short" }).replace(".", ""); };
const PARTS = [{ k: "m", t: "Mañana" }, { k: "t", t: "Tarde" }, { k: "n", t: "Noche" }] as const;
const partOf = (iso: string) => { const h = new Date(iso).getHours(); return h < 12 ? "m" : h < 18 ? "t" : "n"; };

const useFirstSlots = () => useQuery({ queryKey: ["open-slots", "first-call"], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<Slot[]> => {
  const from = new Date(), to = new Date(Date.now() + DAYS_AHEAD * 86_400_000);
  const { data, error } = await db().rpc("list_open_slots", { p_from: from.toISOString(), p_to: to.toISOString() }); if (error) throw error;
  return (data as { id: string; starts_at: string; duration_min: number; kind: string; taken: boolean; mine: boolean; capacity: number; booked: number }[])
    .map((s) => ({ id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, taken: s.taken, mine: s.mine, capacity: s.capacity, booked: s.booked }));
} });

/** Cambio entre la lista sencilla de la primera llamada y el calendario completo (se ve en las dos). */
export function FirstCallModes({ mode, onChange }: { mode: "list" | "full"; onChange: (m: "list" | "full") => void }) {
  return (
    <div className="fcp-modes" role="tablist" aria-label="Cómo ver los horarios">
      <button type="button" role="tab" aria-selected={mode === "list"} className={mode === "list" ? "on" : ""} onClick={() => onChange("list")}><Icon name="clock" size={15} /><span><b>Horarios para ti</b><small>Lista sencilla</small></span></button>
      <button type="button" role="tab" aria-selected={mode === "full"} className={mode === "full" ? "on" : ""} onClick={() => onChange("full")}><Icon name="calendar" size={15} /><span><b>Calendario completo</b><small>Semana por semana</small></span></button>
    </div>
  );
}

export function FirstCallPicker({ first, onFull }: { first: string; onFull: (at?: string) => void }) {
  const q = useFirstSlots(), book = useBookSlot(), now = useNow(30_000);
  const [sel, setSel] = useState<Slot | null>(null), [done, setDone] = useState<Slot | null>(null), [pick, setPick] = useState<string | null>(null);
  const free = useMemo(() => (q.data ?? []).filter((s) => new Date(s.startsAt) > now && !s.mine && (s.capacity > 1 ? s.booked < s.capacity : !s.taken)), [q.data, now]);
  // Primero las llamadas iniciales; si Yeff solo publicó seguimientos, se muestran esos (lo importante es que agende).
  const onlyInitial = free.some((s) => s.kind === "initial"), list = onlyInitial ? free.filter((s) => s.kind === "initial") : free;
  const days = useMemo(() => { const m = new Map<string, Slot[]>(); list.forEach((s) => m.set(dayKey(s.startsAt), [...(m.get(dayKey(s.startsAt)) ?? []), s])); return Array.from(m.values()); }, [list]);
  const day = days.find((ds) => dayKey(ds[0].startsAt) === pick) ?? days[0];
  const mins = list[0]?.duration, step = done ? 2 : sel ? 1 : 0;
  const say = done ? "¡Listo! Te espero. Después de la llamada armo tu rutina y tu nutrición."
    : q.isError ? "No pude traer mis horarios. Intenta otra vez."
    : !q.data ? "Un momento, busco mis horarios…"
    : !list.length ? "Aún no tengo horarios publicados. Escríbeme y lo coordinamos."
    : sel ? `Perfecto: ${dayLabel(sel.startsAt, now).toLowerCase()}, ${ampm(sel.startsAt)}. Ahora toca “Confirmar mi llamada”.`
    : "Elige el día y la hora que te sirvan. Ahí hablamos de tu objetivo, tu tiempo y cómo empezamos.";
  return (
    <div className="fcp">
      <section className="fcp-hero">
        <div className="fcp-hero-top">
          <div className="fcp-hero-txt">
            <div className="fcp-eyebrow">{done ? "Llamada agendada" : `Tu primera llamada${mins ? ` · ${mins} min` : ""}`}</div>
            <h1>{done ? `Nos vemos pronto, ${first}` : `Conozcámonos, ${first}`}</h1>
            <p aria-live="polite">{say}</p>
          </div>
          <span className="fcp-stage gd-pop" key={done ? "c" : sel ? "s" : "w"}><Guide size={64} pose={done ? "cheer" : sel ? "point" : !q.data ? "phone" : list.length ? "clipboard" : "phone"} dir="down-left" /></span>
        </div>
        <ol className="fcp-steps" aria-label="Pasos">
          {["Elige la hora", "Confírmala", "Listo"].map((t, i) => <li key={t} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}><i>{i < step ? <Icon name="check" size={11} /> : i + 1}</i>{t}</li>)}
        </ol>
      </section>

      {/* El calendario completo abre en la semana del día elegido (antes abría en la semana actual, a veces vacía). */}
      {!done && <FirstCallModes mode="list" onChange={(m) => m === "full" && onFull(sel?.startsAt ?? day?.[0].startsAt)} />}

      {done ? (
        <div className="fcp-card fcp-done">
          <div className="fcp-done-when"><span className="fcp-done-ic"><Icon name="calendar" size={18} /></span><span><b>{dayLabel(done.startsAt, now)}</b><small>{ampm(done.startsAt)} · {KIND_LABEL[done.kind] ?? "Llamada"}{done.duration ? ` · ${done.duration} min` : ""}</small></span></div>
          <p>Te llega un recordatorio antes de la llamada. Si necesitas cambiarla, escríbeme desde Mensajes.</p>
          <div className="fcp-done-acts"><Link href="/inicio" className="fcp-btn">Ir a Hoy</Link><a className="fcp-btn ghost" href={icsHref(done)} download="llamada-yeffitness.ics"><Icon name="bell" size={14} /> Guardar en mi calendario</a></div>
        </div>
      ) : q.isError ? (
        <div className="fcp-card"><p role="alert" className="fcp-note">No pudimos cargar los horarios.</p><button type="button" className="fcp-btn ghost" onClick={() => q.refetch()}>Reintentar</button></div>
      ) : !q.data ? (
        <div className="fcp-card"><div className="sk" style={{ height: 64, borderRadius: 14 }} /><div className="sk" style={{ height: 96, borderRadius: 14, marginTop: 14 }} /></div>
      ) : !list.length ? (
        <div className="fcp-card fcp-empty"><b>Aún no hay horarios disponibles</b><p>En cuanto Yeff publique sus horarios aparecen aquí. Vuelve en un rato o escríbele y lo coordinan.</p><Link href="/inicio/mensajes" className="fcp-btn ghost"><Icon name="message" size={14} /> Escribirle a Yeff</Link></div>
      ) : (
        <div className="fcp-card fcp-pick">
          <div className="fcp-label"><span>1</span>Elige el día</div>
          <div className="fcp-dstrip" role="tablist" aria-label="Días con horarios">
            {days.map((ds) => { const iso = ds[0].startsAt, on = day === ds, d = new Date(iso);
              return (
                <button key={ds[0].id} type="button" role="tab" aria-selected={on} aria-label={`${dayLabel(iso, now)}: ${ds.length} horario${ds.length === 1 ? "" : "s"}`} className={`fcp-dchip${on ? " on" : ""}`} onClick={() => setPick(dayKey(iso))}>
                  <small>{short(iso, now)}</small><b>{d.getDate()}</b><span>{d.toLocaleDateString("es", { month: "short" }).replace(".", "")}</span><i>{ds.length} {ds.length === 1 ? "hora" : "horas"}</i>
                </button>); })}
          </div>
          {day && <>
            <div className="fcp-label"><span>2</span>Elige la hora<em>{dayLabel(day[0].startsAt, now)}</em></div>
            {PARTS.map((p) => { const hs = day.filter((s) => partOf(s.startsAt) === p.k); if (!hs.length) return null;
              return (
                <div key={p.k} className="fcp-part"><div className="fcp-part-t">{p.t}</div>
                  <div className="fcp-hours">{hs.map((s) => <button key={s.id} type="button" aria-pressed={sel?.id === s.id} className={`fcp-hour${sel?.id === s.id ? " on" : ""}`} onClick={() => setSel(sel?.id === s.id ? null : s)}>{ampm(s.startsAt)}</button>)}</div>
                </div>); })}
          </>}
          {!onlyInitial && <p className="fcp-note">Yeff aún no publica horarios de llamada inicial: estos son sus horarios de seguimiento, también sirven para empezar.</p>}
        </div>
      )}

      {sel && !done && (
        <div className="fcp-bar">
          <div className="fcp-bar-txt"><small>Tu llamada</small><b>{dayLabel(sel.startsAt, now)} · {ampm(sel.startsAt)}</b></div>
          <button type="button" className="fcp-confirm" disabled={book.isPending} onClick={() => book.mutate(sel.id, { onSuccess: () => { setDone(sel); setSel(null); } })}>{book.isPending ? "Reservando…" : "Confirmar mi llamada"}</button>
        </div>
      )}
    </div>
  );
}
