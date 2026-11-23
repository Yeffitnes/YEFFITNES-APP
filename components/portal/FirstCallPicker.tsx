"use client";
// Primera llamada guiada (22-nov, pedido de Cristian: los clientes nuevos "se pierden" y no saben cómo agendar). Mientras el
// cliente no haya agendado nunca, la Agenda es esto: el personaje le dice qué hacer en una frase, los horarios de llamada inicial
// de las próximas 4 semanas en una lista grande por día (sin calendario semanal ni filtros: pensado también para personas mayores),
// y un botón grande para confirmar. "Ver el calendario completo" lleva a la agenda de siempre.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useBookSlot, type Slot } from "@/lib/queries";
import { icsHref } from "@/lib/ics";
import { useNow } from "@/lib/use-now";
import { Guide } from "./Guide";
import { Icon } from "@/components/ui/Icon";

const DAYS_AHEAD = 28;
const ampm = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?a\.?\s?m\.?/i, " a. m.").replace(/\s?p\.?\s?m\.?/i, " p. m.");
const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string, now: Date) {
  const d = new Date(iso), t = new Date(now); t.setHours(0, 0, 0, 0);
  const k = Math.round((new Date(d).setHours(0, 0, 0, 0) - t.getTime()) / 86_400_000);
  const long = d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return k === 0 ? `Hoy, ${long}` : k === 1 ? `Mañana, ${long}` : long.charAt(0).toUpperCase() + long.slice(1);
}
const useFirstSlots = () => useQuery({ queryKey: ["open-slots", "first-call"], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<Slot[]> => {
  const from = new Date(), to = new Date(Date.now() + DAYS_AHEAD * 86_400_000);
  const { data, error } = await db().rpc("list_open_slots", { p_from: from.toISOString(), p_to: to.toISOString() }); if (error) throw error;
  return (data as { id: string; starts_at: string; duration_min: number; kind: string; taken: boolean; mine: boolean; capacity: number; booked: number }[])
    .map((s) => ({ id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, taken: s.taken, mine: s.mine, capacity: s.capacity, booked: s.booked }));
} });

export function FirstCallPicker({ first, onFull }: { first: string; onFull: () => void }) {
  const q = useFirstSlots(), book = useBookSlot(), now = useNow(30_000), [sel, setSel] = useState<Slot | null>(null), [done, setDone] = useState<Slot | null>(null);
  const free = useMemo(() => (q.data ?? []).filter((s) => new Date(s.startsAt) > now && !s.mine && (s.capacity > 1 ? s.booked < s.capacity : !s.taken)), [q.data, now]);
  // Primero las llamadas iniciales; si Yeff solo publicó seguimientos, se muestran esos (lo importante es que agende).
  const list = free.some((s) => s.kind === "initial") ? free.filter((s) => s.kind === "initial") : free;
  const days = useMemo(() => { const m = new Map<string, Slot[]>(); list.forEach((s) => m.set(dayKey(s.startsAt), [...(m.get(dayKey(s.startsAt)) ?? []), s])); return Array.from(m.values()); }, [list]);
  const say = done ? "¡Listo! Ya tienes tu llamada conmigo." : !q.data ? "Un momento, busco mis horarios…" : !list.length ? "Estoy organizando mis horarios." : sel ? "Perfecto. Ahora toca “Confirmar mi llamada”." : "Toca la hora que te sirva para nuestra primera llamada.";
  return (
    <div className="fcp">
      <div className="fcp-head">
        <span className="fcp-stage gd-pop" key={done ? "c" : sel ? "s" : "w"}><Guide size={78} pose={done ? "cheer" : sel ? "point" : "clipboard"} dir="down" /></span>
        <div className="fcp-bubble" aria-live="polite">
          <div className="fcp-step">{done ? "Hecho" : "Paso 1 · tu primera llamada"}</div>
          <b>{say}</b>
          {!done && !!list.length && <p>Ahí nos conocemos, {first}: tu objetivo, tu tiempo y cómo empezamos. Después armo tu rutina y tu nutrición.</p>}
        </div>
      </div>

      {done ? (
        <div className="fcp-done fcp-card">
          <div className="fcp-done-when"><Icon name="calendar" size={18} /> {dayLabel(done.startsAt, now)} · {ampm(done.startsAt)}</div>
          <p>Te llega un recordatorio antes de la llamada. Si necesitas cambiarla, escríbeme desde Mensajes.</p>
          <div className="fcp-done-acts"><Link href="/inicio" className="fcp-btn">Ir a Hoy</Link><a className="fcp-btn ghost" href={icsHref(done)} download="llamada-yeffitness.ics"><Icon name="bell" size={14} /> Guardar en mi calendario</a></div>
        </div>
      ) : q.isError ? (
        <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los horarios. <button className="filter-chip" onClick={() => q.refetch()}>Reintentar</button></p></div>
      ) : q.data && !list.length ? (
        <div className="fcp-card fcp-empty"><b>Aún no hay horarios disponibles</b><p>En cuanto publique mis horarios aparecen aquí. Vuelve en un rato o escríbeme y lo coordinamos.</p><Link href="/inicio/mensajes" className="fcp-btn ghost">Escribirle a Yeff</Link></div>
      ) : (
        <div className="fcp-days">{!q.data && <div className="sk" style={{ height: 180, borderRadius: 18 }} />}
          {days.map((ds) => (
            <section key={ds[0].id} className="fcp-day" aria-label={dayLabel(ds[0].startsAt, now)}>
              <h3>{dayLabel(ds[0].startsAt, now)}</h3>
              <div className="fcp-hours">{ds.map((s) => <button key={s.id} type="button" aria-pressed={sel?.id === s.id} className={`fcp-hour${sel?.id === s.id ? " on" : ""}`} onClick={() => setSel(sel?.id === s.id ? null : s)}>{ampm(s.startsAt)}</button>)}</div>
            </section>))}
        </div>
      )}
      {!done && <button type="button" className="fcp-full" onClick={onFull}>Ver el calendario completo</button>}
      {sel && !done && (
        <div className="fcp-bar">
          <div className="fcp-bar-txt"><small>Tu llamada</small><b>{dayLabel(sel.startsAt, now)} · {ampm(sel.startsAt)}</b></div>
          <button type="button" className="fcp-confirm" disabled={book.isPending} onClick={() => book.mutate(sel.id, { onSuccess: () => { setDone(sel); setSel(null); } })}>{book.isPending ? "Reservando…" : "Confirmar mi llamada"}</button>
        </div>
      )}
    </div>
  );
}
