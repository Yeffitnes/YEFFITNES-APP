"use client";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import { KIND_LABEL, useCancelBooking, useClients, useCoachBook, useCoachSlots, usePublishSlots, useRemoveSlot, weekBounds, type CoachSlot } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { DAYLONG, DAY3, dayIdx, hhmm, sameDay, weekDays, weekLabel } from "@/lib/dates";
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function AgendaView() {
  const [off, setOff] = useState(0), [sel, setSel] = useState(dayIdx(new Date())), [pub, setPub] = useState<string | null>(null), [assign, setAssign] = useState(false), [cancel, setCancel] = useState<CoachSlot | null>(null);
  const { data, isPending, isError, refetch } = useCoachSlots(off), remove = useRemoveSlot();
  const { from } = weekBounds(off), days = weekDays(from), now = new Date();
  const slots = data ?? [], conf = slots.reduce((a, s) => a + s.bookings.length, 0), free = slots.filter((s) => s.bookings.length < s.capacity && new Date(s.startsAt) > now).length;
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Agenda</div><h1>Agenda</h1><p className="greeting-sub">{data ? `${conf} sesión${conf === 1 ? "" : "es"} confirmada${conf === 1 ? "" : "s"} · ${free} hueco${free === 1 ? "" : "s"} disponible${free === 1 ? "" : "s"} sin reservar` : "Cargando…"}</p></div>
        <div className="topbar-actions"><button className="ghost-btn" onClick={() => setAssign(true)}>Agendar cliente</button><button className="primary-btn" onClick={() => setPub(ymd(new Date()))}>Publicar disponibilidad</button></div></div>
      <div className="week-nav"><button className="week-nav-btn" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><Icon name="chevronLeft" size={16} /></button><div className="week-nav-label">{weekLabel(from)}</div><button className="week-nav-btn" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><Icon name="chevron" size={16} /></button><button className="week-today-btn" onClick={() => { setOff(0); setSel(dayIdx(new Date())); }}>Hoy</button></div>
      <div className="day-tab-row">{days.map((d, i) => <div key={i} role="button" tabIndex={0} className={`day-tab${sel === i ? " active" : ""}`} onClick={() => setSel(i)} onKeyDown={(e) => e.key === "Enter" && setSel(i)}>{DAY3[i]} {d.getDate()}</div>)}</div>
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar la agenda. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && (
        <div className="card">
          {!slots.length && <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 14 }}>Esta semana no tienes horarios publicados. Usa “Publicar disponibilidad” para que tus clientes puedan reservar.</p>}
          <div className="week-grid">{days.map((d, i) => {
            const ds = slots.filter((s) => sameDay(new Date(s.startsAt), d));
            return (
              <div key={i} className={`day-col${sameDay(d, now) ? " today" : ""}${sel === i ? " active" : ""}`} data-day={i}>
                <div className="day-col-head"><div><div className="day-col-name">{DAYLONG[i]}</div><div className="day-col-num">{d.getDate()}</div></div></div>
                <div className="day-col-body">
                  {ds.map((s) => s.capacity > 1
                    ? <div key={s.id} className="slot-card confirmed"><div className="slot-time">{hhmm(s.startsAt)} · {s.bookings.length}/{s.capacity} cupos</div>
                        {s.bookings.map((b) => <div key={b.id} className="slot-client" style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>{b.clientName}<button title="Quitar de la clase" aria-label={`Quitar a ${b.clientName} de la clase`} style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setCancel({ ...s, booking: b })}>×</button></div>)}
                        {!s.bookings.length && <div className="slot-client" style={{ opacity: 0.6 }}>Sin inscritos</div>}
                        <div className="slot-type">Clase grupal · {KIND_LABEL[s.kind]} · {s.duration} min</div>
                        {!s.bookings.length && <div className="slot-actions"><button aria-label="Quitar horario" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>×</button></div>}</div>
                    : s.booking
                    ? <div key={s.id} className="slot-card confirmed"><div className="slot-time">{hhmm(s.startsAt)}</div><div className="slot-client">{s.booking.clientName}</div><div className="slot-type">{KIND_LABEL[s.kind]} · {s.duration} min</div>
                        <div className="slot-actions"><button title="Cancelar sesión" aria-label={`Cancelar sesión de ${s.booking.clientName}`} onClick={() => setCancel(s)}>×</button></div></div>
                    : <div key={s.id} className="slot-available">{hhmm(s.startsAt)} · Disponible <button aria-label="Quitar horario" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>×</button></div>)}
                  <button className="add-slot-btn" onClick={() => setPub(ymd(d))}>+ Añadir</button>
                </div>
              </div>);
          })}</div>
        </div>)}
      {pub && <PublishModal date={pub} onClose={() => setPub(null)} />}
      {assign && <AssignModal slots={slots.filter((s) => s.bookings.length < s.capacity && new Date(s.startsAt) > now)} onClose={() => setAssign(false)} />}
      {cancel && <CancelModal s={cancel} onClose={() => setCancel(null)} />}
    </div>
  );
}
function PublishModal({ date, onClose }: { date: string; onClose: () => void }) {
  const pub = usePublishSlots(useWorkspaceId()), [d, setD] = useState(date), [a, setA] = useState("08:00"), [b, setB] = useState("10:00"), [dur, setDur] = useState(30), [kind, setKind] = useState("initial"), [cap, setCap] = useState(1), [err, setErr] = useState("");
  const starts: string[] = []; const s0 = new Date(`${d}T${a}`), e0 = new Date(`${d}T${b}`);
  if (!isNaN(+s0) && !isNaN(+e0)) for (let t = +s0; t + dur * 60000 <= +e0 && starts.length < 30; t += dur * 60000) starts.push(new Date(t).toISOString());
  const go = () => {
    if (!d || isNaN(+s0) || isNaN(+e0) || +e0 <= +s0) return setErr("Revisa la fecha y que la hora final sea posterior a la inicial.");
    const fut = starts.filter((x) => new Date(x) > new Date()); if (!fut.length) return setErr("Esos horarios ya pasaron. Elige una fecha y hora futuras.");
    setErr(""); pub.mutate({ starts: fut, duration: dur, kind, capacity: cap }, { onSuccess: onClose });
  };
  return (
    <Modal title="Publicar disponibilidad" sub="Estos huecos quedarán visibles para que tus clientes activos los reserven." onClose={onClose}>
      <div className="modal-field"><label>Fecha</label><input type="date" value={d} onChange={(e) => setD(e.target.value)} /></div>
      <div className="modal-row2"><div className="modal-field"><label>Desde</label><input type="time" value={a} onChange={(e) => setA(e.target.value)} /></div><div className="modal-field"><label>Hasta</label><input type="time" value={b} onChange={(e) => setB(e.target.value)} /></div></div>
      <div className="modal-row2"><div className="modal-field"><label>Duración de cada hueco</label><select value={dur} onChange={(e) => setDur(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></div>
        <div className="modal-field"><label>Tipo</label><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="initial">Llamada inicial</option><option value="followup">Seguimiento</option></select></div></div>
      <div className="modal-field"><label>Cupos por hueco (1 = sesión individual; más de 1 = clase grupal)</label><input type="number" min={1} max={30} value={cap} onChange={(e) => setCap(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} /></div>
      <div className="modal-cap-hint">Se crearán {starts.length} hueco{starts.length === 1 ? "" : "s"} {cap > 1 ? `de clase grupal (${cap} cupos cada uno)` : "individuales"}. Los horarios que ya existan se respetan.</div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={pub.isPending} onClick={go}>{pub.isPending ? "Publicando…" : "Publicar"}</button></div>
    </Modal>
  );
}
function AssignModal({ slots, onClose }: { slots: CoachSlot[]; onClose: () => void }) {
  const { data: clients } = useClients(), book = useCoachBook(), [c, setC] = useState(""), [s, setS] = useState(""), [err, setErr] = useState("");
  const act = (clients ?? []).filter((x) => x.status === "active");
  return (
    <Modal title="Agendar cliente" sub="Se reserva directamente en su nombre, sin pasar por el portal. Queda confirmada de inmediato." onClose={onClose}>
      {!slots.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>No hay huecos libres esta semana. Publica disponibilidad primero.</p> : (
        <>
          <div className="modal-field"><label>Cliente</label><select value={c} onChange={(e) => setC(e.target.value)}><option value="">Elige un cliente…</option>{act.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="modal-field"><label>Horario</label><select value={s} onChange={(e) => setS(e.target.value)}><option value="">Elige un hueco libre…</option>{slots.map((x) => <option key={x.id} value={x.id}>{DAYLONG[dayIdx(new Date(x.startsAt))]} {new Date(x.startsAt).getDate()} · {hhmm(x.startsAt)} · {KIND_LABEL[x.kind]}</option>)}</select></div>
          {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
          <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={book.isPending} onClick={() => (c && s ? book.mutate({ slotId: s, clientId: c }, { onSuccess: onClose }) : setErr("Elige un cliente y un horario."))}>{book.isPending ? "Agendando…" : "Agendar sesión"}</button></div>
        </>)}
    </Modal>
  );
}
function CancelModal({ s, onClose }: { s: CoachSlot; onClose: () => void }) {
  const cancel = useCancelBooking();
  return (
    <Modal title="Cancelar sesión" sub={`${s.booking?.clientName} · ${DAYLONG[dayIdx(new Date(s.startsAt))]} ${new Date(s.startsAt).getDate()} a las ${hhmm(s.startsAt)}. El horario quedará libre otra vez. Avísale a tu cliente.`} onClose={onClose}>
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Conservar</button><button className="modal-btn danger" disabled={cancel.isPending} onClick={() => s.booking && cancel.mutate(s.booking.id, { onSuccess: onClose })}>{cancel.isPending ? "Cancelando…" : "Sí, cancelar sesión"}</button></div>
    </Modal>
  );
}
