"use client";
import { useState } from "react";
import { Guide } from "./Guide";
import Link from "next/link";
import { changeSessionLink } from "@/lib/features";
import { icsHref } from "@/lib/ics";
import { PendingSection } from "./LockedPanel";
import { CANCEL_WINDOW_MS, KIND_COLOR, KIND_LABEL, upcomingOnly, useBookSlot, useCancelBooking, useMe, useMyBookings, useOpenSlots, weekBounds, type MyBooking, type Slot } from "@/lib/queries";
import { useNow } from "@/lib/use-now";
import { useProfile } from "@/components/Providers";
import { DAY3, hhmm, sameDay, weekDays, weekLabel } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
// Cuánto le queda al cliente para cancelar (decisión de Cristian, 29-oct): 10 min desde que reservó, y solo lo que reservó él.
const cancelLeft = (b: MyBooking, now: Date) => (b.bookedBy !== "client" || !b.createdAt ? 0 : Math.max(0, new Date(b.createdAt).getTime() + CANCEL_WINDOW_MS - now.getTime()));
export function AgendaClientView() {
  const { profileId } = useProfile(), me = useMe(profileId), cid = me.data?.id ?? "";
  const [off, setOff] = useState(0), [filter, setFilter] = useState("all"), [sel, setSel] = useState<Slot | null>(null), [done, setDone] = useState<Slot | null>(null);
  const slots = useOpenSlots(off), mine = useMyBookings(cid), book = useBookSlot(), cancel = useCancelBooking();
  const { from } = weekBounds(off), days = weekDays(from), now = useNow(15_000);
  const list = (slots.data ?? []).filter((s) => new Date(s.startsAt) > now && (filter === "all" || s.kind === filter));
  const when = (iso: string) => `${new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} · ${hhmm(iso)}`;
  const upcoming = upcomingOnly(mine.data, now);
  if (me.data?.status === "pending") return <PendingSection eyebrow="Agenda" title="Tus sesiones con Jeff" panels={[
    { tag: "Agenda", title: "Horarios disponibles", sub: "Jeff publica sus horarios y tú eliges el que te sirva." },
    { tag: "Reservas", title: "Tus próximas sesiones", sub: "Tus llamadas reservadas, con recordatorio antes de empezar." },
  ]} />;
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Agenda</div><h1>Reserva tu próxima sesión</h1><p className="greeting-sub">Tu coach publica horarios cada semana. Elige el que te sirve y confirma al instante. Puedes tener una sesión reservada a la vez. Si te equivocaste, tienes 10 minutos para cancelarla; después, escríbele a Jeff para cambiarla.</p></div></div>
      <div className="week-nav"><button className="week-nav-btn" aria-label="Semana anterior" disabled={off <= 0} onClick={() => { setOff(off - 1); setSel(null); }}><Icon name="chevronLeft" size={16} /></button>
        <div className="week-nav-label"><div className="week-nav-range">{weekLabel(from)}</div><div className="week-nav-tag">{off === 0 ? "Semana actual" : off === 1 ? "Próxima semana" : `En ${off} semanas`}</div></div>
        <button className="week-nav-btn" aria-label="Semana siguiente" disabled={off >= 6} onClick={() => { setOff(off + 1); setSel(null); }}><Icon name="chevron" size={16} /></button></div>
      <div className="filter-row">{[["all", "Todas"], ["initial", "Llamada inicial"], ["followup", "Seguimiento"]].map(([k, t]) => <button key={k} className={`filter-chip${filter === k ? " active" : ""}`} onClick={() => setFilter(k)}><span className="fdot" style={{ background: k === "all" ? "linear-gradient(135deg,#F7254B,#F2406B)" : KIND_COLOR[k] }} />{t}</button>)}</div>
      <div className="agenda-grid">
        <div className="card cal-card">
          <div className="cal-legend"><span><i className="dot-avail" /> Disponible</span><span><i className="dot-booked" /> Ocupado</span><span><i className="dot-selected" /> Seleccionado</span><span><i className="dot-confirmed" /> Tuya</span></div>
          {slots.isPending && <div className="sk" style={{ height: 220 }} />}
          {slots.isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los horarios. <button className="filter-chip" onClick={() => slots.refetch()}>Reintentar</button></p>}
          {slots.data && !slots.data.length && <p className="empty-note" style={{ marginBottom: 14 }}>Tu coach aún no ha publicado horarios para esta semana. Vuelve pronto o escríbele desde Mensajes.</p>}
          {slots.data && <div className="cal-grid">{days.map((d, i) => {
            const ds = list.filter((s) => sameDay(new Date(s.startsAt), d));
            return (
              <div key={i} className={`cal-day-col${sameDay(d, now) ? " is-today" : ""}`}><div className="cal-day-label">{DAY3[i]}</div><div className="cal-day-num">{d.getDate()}</div>
                {!ds.length && <div className="cal-empty-day">—</div>}
                {ds.map((s) => { const st = s.mine ? "confirmed" : s.taken ? "booked" : sel?.id === s.id ? "selected" : "available";
                  return <button key={s.id} className={`slot ${st}`} disabled={st === "booked" || st === "confirmed"} aria-label={`${hhmm(s.startsAt)} ${st === "booked" ? "ocupado" : st === "confirmed" ? "tuya" : "disponible"}`} onClick={() => { setSel(s); setDone(null); }}>
                    {(st === "available" || st === "selected") && <span className="sdot" style={{ background: st === "selected" ? "#fff" : KIND_COLOR[s.kind] }} />}{hhmm(s.startsAt)}{s.capacity > 1 && <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 5 }}>{s.capacity - s.booked}/{s.capacity} cupos</span>}</button>; })}
              </div>);
          })}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card summary-card"><div className="summary-label">Tu selección</div>
            {!sel && <div className="summary-empty">Elige un horario disponible en el calendario.</div>}
            {sel && <div><div className="summary-datetime">{when(sel.startsAt)}</div><p style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", margin: "8px 0 0" }}>{KIND_LABEL[sel.kind]} · {sel.duration} min{sel.capacity > 1 ? ` · Clase grupal (quedan ${sel.capacity - sel.booked} de ${sel.capacity} cupos)` : ""}</p>
              <button className="summary-confirm" disabled={book.isPending} onClick={() => book.mutate(sel.id, { onSuccess: () => { setDone(sel); setSel(null); } })}>{book.isPending ? "Reservando…" : "Confirmar reserva"}</button></div>}
            {done && <div className="book-done" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}><span className="gd-pop"><Guide size={44} pose="cheer" talking={false} /></span><span><Icon name="check" size={15} style={{ marginRight: 6 }} />Reservaste el {when(done.startsAt)}. Si te equivocaste, puedes cancelarla en los próximos 10 minutos.<> <a href={icsHref(done)} download="sesion-yeffitnes.ics" style={{ color: "#fff", fontWeight: 700, textDecoration: "underline" }}>Añadir alarma a mi calendario</a></></span></div>}
          </div>
          <div className="card"><div className="card-tag">Tus próximas sesiones</div>
            {mine.isPending && <div className="sk" style={{ height: 56, marginTop: 8 }} />}
            {mine.data && !upcoming.length && <div className="sess-empty-note">Aún no tienes sesiones reservadas. Elige un horario en el calendario.</div>}
            <div style={{ marginTop: 6 }}>{upcoming.map((b) => { const d = new Date(b.startsAt), left = cancelLeft(b, now), live = d.getTime() <= now.getTime();
              return (<div key={b.id} className="sess-row"><div className="sess-date"><div className="dow">{DAY3[(d.getDay() + 6) % 7]}</div><div className="dnum">{d.getDate()}</div></div>
                <div className="sess-body"><div className="sess-time">{hhmm(d)} — {b.duration} min</div><div className="sess-type">{KIND_LABEL[b.kind]}{b.bookedBy === "coach" ? " · Agendada por Jeff" : ""}</div></div><span className="sess-tag">{live ? "Ahora" : "Confirmada"}</span>
                <a className="mini-btn ghost" href={icsHref(b)} download="sesion-yeffitnes.ics"><Icon name="bell" size={14} /> Alarma</a>
                {left > 0 ? <button className="mini-btn ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(b.id)} title="Solo puedes cancelar en los 10 minutos siguientes a reservar">Cancelar ({Math.ceil(left / 60_000)} min)</button>
                  : !live && <Link className="mini-btn ghost" href={changeSessionLink(when(b.startsAt))}>Pedir cambio a Jeff</Link>}</div>); })}</div>
          </div>
        </div>
      </div>
    </>
  );
}
