"use client";
import { Icon } from "@/components/ui/Icon";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import Link from "next/link";
import { KIND_LABEL, useCancelBooking, useClients, useCoachAttention, useCoachBook, useCoachSlots, usePublishSlots, useRemoveSlot, useUpcomingSessions, weekBounds, type CoachSlot, type UpcomingSession } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { DAYLONG, DAY3, dayIdx, hhmm, sameDay, weekDays, weekLabel } from "@/lib/dates";
import { useNow } from "@/lib/use-now";
// Semana (desplazamiento desde la actual) de una fecha "aaaa-mm-dd": para mostrar el día recién publicado.
const offsetOf = (date: string) => { const d = new Date(`${date}T12:00`), mon = weekBounds(0).from; return Math.floor((d.getTime() - mon.getTime()) / (7 * 86_400_000)); };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function AgendaView() {
  const [off, setOff] = useState(0), [sel, setSel] = useState(dayIdx(new Date())), [pub, setPub] = useState<string | null>(null), [assign, setAssign] = useState(false), [cancel, setCancel] = useState<CancelTarget | null>(null), [up, setUp] = useState(false);
  const { data, isPending, isError, refetch } = useCoachSlots(off), remove = useRemoveSlot();
  const { from } = weekBounds(off), days = weekDays(from), now = useNow();
  // Lo que ya terminó se ve como "Ya pasó" y no se puede cancelar (pedido de Cristian, 29-oct): antes seguía como pendiente.
  const ended = (s: CoachSlot) => new Date(s.startsAt).getTime() + s.duration * 60_000 <= now.getTime();
  const target = (s: CoachSlot, b: CoachSlot["bookings"][number]): CancelTarget => ({ bookingId: b.id, clientName: b.clientName, startsAt: s.startsAt });
  const slots = data ?? [], conf = slots.reduce((a, s) => a + s.bookings.length, 0), free = slots.filter((s) => s.bookings.length < s.capacity && new Date(s.startsAt) > now).length;
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Agenda</div><h1>Agenda</h1><p className="greeting-sub">{data ? `${conf} ${conf === 1 ? "sesión confirmada" : "sesiones confirmadas"} · ${free} hueco${free === 1 ? "" : "s"} disponible${free === 1 ? "" : "s"} sin reservar` : "Cargando…"}</p></div>
        <div className="topbar-actions ag-actions"><UpcomingButton onOpen={() => setUp(true)} /><button className="ghost-btn" onClick={() => setAssign(true)}>Agendar cliente</button><button className="primary-btn" onClick={() => setPub(ymd(new Date()))}>Publicar disponibilidad</button></div></div>
      <WaitingFirstCall onPublish={() => setPub(ymd(new Date()))} />
      {up && <UpcomingPanel onClose={() => setUp(false)} onCancel={setCancel} />}
      <div className="week-nav"><button className="week-nav-btn" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><Icon name="chevronLeft" size={16} /></button><div className="week-nav-label">{weekLabel(from)}</div><button className="week-nav-btn" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><Icon name="chevron" size={16} /></button><button className="week-today-btn" onClick={() => { setOff(0); setSel(dayIdx(new Date())); }}>Hoy</button></div>
      <div className="day-tab-row">{days.map((d, i) => <div key={i} role="button" tabIndex={0} className={`day-tab${sel === i ? " active" : ""}`} onClick={() => setSel(i)} onKeyDown={(e) => e.key === "Enter" && setSel(i)}>{DAY3[i]} {d.getDate()}{(() => { const ds = slots.filter((s) => sameDay(new Date(s.startsAt), d)), bk = ds.reduce((a, s) => a + s.bookings.length, 0);
        return bk ? <span className="day-tab-n booked" aria-label={`${bk} reservada${bk === 1 ? "" : "s"}`}>{bk}</span> : ds.length ? <span className="day-tab-n" aria-label={`${ds.length} horarios libres`}>{ds.length}</span> : null; })()}</div>)}</div>
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
                  {ds.map((s) => { const past = ended(s); return s.capacity > 1
                    ? <div key={s.id} className={`slot-card confirmed${past ? " past" : ""}`}><div className="slot-time">{hhmm(s.startsAt)} · {s.bookings.length}/{s.capacity} cupos{past && <span className="slot-past">Ya pasó</span>}</div>
                        {s.bookings.map((b) => <div key={b.id} className="slot-client" style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>{b.clientName}{!past && <button title="Quitar de la clase" aria-label={`Quitar a ${b.clientName} de la clase`} style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setCancel(target(s, b))}>×</button>}</div>)}
                        {!s.bookings.length && <div className="slot-client" style={{ opacity: 0.6 }}>Sin inscritos</div>}
                        <div className="slot-type">Clase grupal · {KIND_LABEL[s.kind]} · {s.duration} min</div>
                        {!s.bookings.length && !past && <div className="slot-actions"><button aria-label="Quitar horario" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>×</button></div>}</div>
                    : s.booking
                    ? <div key={s.id} className={`slot-card confirmed${past ? " past" : ""}`}><div className="slot-time">{hhmm(s.startsAt)}{past && <span className="slot-past">Ya pasó</span>}</div><div className="slot-client">{s.booking.clientName}</div><div className="slot-type">{KIND_LABEL[s.kind]} · {s.duration} min</div>
                        {!past && <div className="slot-actions"><button title="Cancelar sesión" aria-label={`Cancelar sesión de ${s.booking.clientName}`} onClick={() => setCancel(target(s, s.booking!))}>×</button></div>}</div>
                    : past ? <div key={s.id} className="slot-available past">{hhmm(s.startsAt)} · Sin reservar</div>
                    : <div key={s.id} className="slot-available">{hhmm(s.startsAt)} · Disponible <button aria-label="Quitar horario" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>×</button></div>; })}
                  <button className="add-slot-btn" onClick={() => setPub(ymd(d))}>+ Añadir</button>
                </div>
              </div>);
          })}</div>
        </div>)}
      {pub && <PublishModal date={pub} onClose={() => setPub(null)} onDone={(date) => { setOff(offsetOf(date)); setSel(dayIdx(new Date(`${date}T12:00`))); }} />}
      {assign && <AssignModal slots={slots.filter((s) => s.bookings.length < s.capacity && new Date(s.startsAt) > now)} onClose={() => setAssign(false)} />}
      {cancel && <CancelModal t={cancel} onClose={() => setCancel(null)} />}
    </div>
  );
}
function PublishModal({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: (date: string) => void }) {
  const pub = usePublishSlots(useWorkspaceId()), [d, setD] = useState(date), [a, setA] = useState("08:00"), [b, setB] = useState("10:00"), [dur, setDur] = useState(30), [kind, setKind] = useState("initial"), [cap, setCap] = useState(1), [err, setErr] = useState("");
  const starts: string[] = []; const s0 = new Date(`${d}T${a}`), e0 = new Date(`${d}T${b}`);
  if (!isNaN(+s0) && !isNaN(+e0)) for (let t = +s0; t + dur * 60000 <= +e0 && starts.length < 30; t += dur * 60000) starts.push(new Date(t).toISOString());
  const go = () => {
    if (!d || isNaN(+s0) || isNaN(+e0) || +e0 <= +s0) return setErr("Revisa la fecha y que la hora final sea posterior a la inicial.");
    const fut = starts.filter((x) => new Date(x) > new Date()); if (!fut.length) return setErr("Esos horarios ya pasaron. Elige una fecha y hora futuras.");
    setErr(""); pub.mutate({ starts: fut, duration: dur, kind, capacity: cap }, { onSuccess: () => { onDone(d); onClose(); } });
  };
  return (
    <Modal title="Publicar disponibilidad" sub="Estos huecos quedarán visibles para que tus clientes activos los reserven." onClose={onClose}>
      <div className="modal-field"><label>Fecha</label><input aria-label="Fecha" type="date" value={d} onChange={(e) => setD(e.target.value)} /></div>
      <div className="modal-row2"><div className="modal-field"><label>Desde</label><input aria-label="Desde" type="time" value={a} onChange={(e) => setA(e.target.value)} /></div><div className="modal-field"><label>Hasta</label><input type="time" value={b} onChange={(e) => setB(e.target.value)} /></div></div>
      <div className="modal-row2"><div className="modal-field"><label>Duración de cada hueco</label><select aria-label="Duración de cada hueco" value={dur} onChange={(e) => setDur(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></div>
        <div className="modal-field"><label>Tipo</label><select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}><option value="initial">Llamada inicial</option><option value="followup">Seguimiento</option></select></div></div>
      <div className="modal-field"><label>Cupos por hueco (1 = sesión individual; más de 1 = clase grupal)</label><input aria-label="Cupos por hueco" type="number" min={1} max={30} value={cap} onChange={(e) => setCap(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} /></div>
      <div className="modal-cap-hint">Se crearán {starts.length} hueco{starts.length === 1 ? "" : "s"} {cap > 1 ? `de clase grupal (${cap} cupos cada uno)` : "individuales"}. Si alguno choca con un horario que ya tienes (reservado o libre), ese se salta y te lo decimos.</div>
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
          <div className="modal-field"><label>Cliente</label><select aria-label="Cliente" value={c} onChange={(e) => setC(e.target.value)}><option value="">Elige un cliente…</option>{act.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="modal-field"><label>Horario</label><select aria-label="Horario" value={s} onChange={(e) => setS(e.target.value)}><option value="">Elige un hueco libre…</option>{slots.map((x) => <option key={x.id} value={x.id}>{DAYLONG[dayIdx(new Date(x.startsAt))]} {new Date(x.startsAt).getDate()} · {hhmm(x.startsAt)} · {KIND_LABEL[x.kind]}</option>)}</select></div>
          {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
          <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={book.isPending} onClick={() => (c && s ? book.mutate({ slotId: s, clientId: c }, { onSuccess: onClose }) : setErr("Elige un cliente y un horario."))}>{book.isPending ? "Agendando…" : "Agendar sesión"}</button></div>
        </>)}
    </Modal>
  );
}
// "Próximas sesiones" (22-nov, pedido de Yeff): todas las reservas que vienen, de cualquier semana, en un panel oscuro que se abre
// desde el botón junto a "Agendar cliente" (no encima de la agenda). En el celular la semana muestra un día a la vez y no se veía
// quién estaba agendado; aquí está todo de un vistazo, por día, con buscador.
const dayLabel = (iso: string, now: Date) => {
  const d = new Date(iso), t = new Date(now); t.setHours(0, 0, 0, 0); const k = Math.round((new Date(d).setHours(0, 0, 0, 0) - t.getTime()) / 86_400_000);
  return k === 0 ? "Hoy" : k === 1 ? "Mañana" : `${DAYLONG[dayIdx(d)]} ${d.getDate()} de ${d.toLocaleDateString("es", { month: "long" })}`;
};
function useUpcomingList() {
  const q = useUpcomingSessions(), now = useNow();
  return { q, now, list: (q.data ?? []).filter((x) => new Date(x.startsAt).getTime() + x.duration * 60_000 > now.getTime()) };
}
function UpcomingButton({ onOpen }: { onOpen: () => void }) {
  const { list, now } = useUpcomingList(), next = list[0];
  return (
    <button type="button" className="ag-up-btn" onClick={onOpen} aria-label={`Próximas sesiones: ${list.length}`}>
      <span className="ag-up-n">{list.length}</span>
      <span className="ag-up-txt"><b>Próximas sesiones</b><small>{next ? `${dayLabel(next.startsAt, now)} ${hhmm(next.startsAt)} · ${next.clientName.split(" ")[0]}` : "Sin reservas por ahora"}</small></span>
      <Icon name="chevron" size={14} />
    </button>
  );
}
function UpcomingPanel({ onClose, onCancel }: { onClose: () => void; onCancel: (t: CancelTarget) => void }) {
  const { q, now, list } = useUpcomingList(), [find, setFind] = useState("");
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".modal-backdrop")) onClose(); };   // con "Cancelar sesión" abierta, Escape cierra solo esa
    window.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  const f = find.trim().toLowerCase(), shown = f ? list.filter((x) => x.clientName.toLowerCase().includes(f)) : list;
  const groups = shown.reduce((m, x) => { const k = dayLabel(x.startsAt, now); m.set(k, [...(m.get(k) ?? []), x]); return m; }, new Map<string, UpcomingSession[]>());
  const clients = new Set(list.map((x) => x.clientId)).size, today = list.filter((x) => dayLabel(x.startsAt, now) === "Hoy").length;
  return (
    <div className="ag-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ag-sheet" role="dialog" aria-modal="true" aria-label="Próximas sesiones" id="pendientes">
        <div className="ag-sheet-head">
          <div><div className="ag-sheet-eyebrow">Agenda</div><h2>Próximas sesiones</h2>
            <p>{list.length ? `${list.length} ${list.length === 1 ? "sesión" : "sesiones"} · ${clients} cliente${clients === 1 ? "" : "s"}${today ? ` · ${today} hoy` : ""}` : "No tienes sesiones reservadas"}</p></div>
          <button type="button" className="ag-sheet-x" aria-label="Cerrar" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        {list.length > 6 && <input className="ag-find" aria-label="Buscar cliente en las sesiones" placeholder="Buscar cliente…" value={find} onChange={(e) => setFind(e.target.value)} />}
        <div className="ag-sheet-body">
          {q.isPending && <div className="ag-empty">Cargando…</div>}
          {q.isError && <div className="ag-empty">No pudimos cargar las sesiones. <button type="button" className="ag-link" onClick={() => q.refetch()}>Reintentar</button></div>}
          {q.data && !list.length && <div className="ag-empty">Cuando un cliente reserve (o lo agendes tú), aparece aquí con su día y hora.</div>}
          {f && !shown.length && <div className="ag-empty">Nadie con ese nombre tiene sesión.</div>}
          {Array.from(groups).map(([day, xs]) => (
            <div key={day} className="ag-day"><div className="ag-day-h">{day}<span>{xs.length}</span></div>
              {xs.map((x) => (
                <div key={x.bookingId} className="ag-row">
                  <span className="ag-time">{hhmm(x.startsAt)}</span>
                  <Link href={`/coach/clientes/${x.clientId}?tab=Agenda`} className="ag-main" onClick={onClose}><b>{x.clientName}</b><small>{KIND_LABEL[x.kind]} · {x.duration} min{x.capacity > 1 ? " · clase grupal" : ""}{x.by === "coach" ? " · la agendaste tú" : ""}</small></Link>
                  <button type="button" className="ag-x" aria-label={`Cancelar la sesión de ${x.clientName}`} title="Cancelar sesión" onClick={() => onCancel({ bookingId: x.bookingId, clientName: x.clientName, startsAt: x.startsAt })}><Icon name="close" size={12} /></button>
                </div>))}
            </div>))}
        </div>
      </div>
    </div>
  );
}
// 22-nov: clientes activos que aún no tienen ninguna llamada (ni hecha ni reservada) y NO hay horarios de llamada inicial libres:
// se quedan esperando en su agenda guiada. Se le avisa a Yeff aquí arriba, con un botón para publicar.
function WaitingFirstCall({ onPublish }: { onPublish: () => void }) {
  const attn = useCoachAttention(), clients = useClients();
  const free = useQuery({ queryKey: ["coach-slots", "free-initial"], staleTime: 30_000, queryFn: async () => {
    const { data, error } = await db().from("availability_slots").select("id,capacity,bookings(status)").eq("status", "open").eq("kind", "initial").gt("starts_at", new Date().toISOString()).limit(200);
    if (error) throw error;
    return ((data ?? []) as { capacity: number; bookings: { status: string }[] }[]).filter((s) => s.bookings.filter((b) => b.status === "confirmed").length < s.capacity).length;
  } });
  const active = new Map((clients.data ?? []).filter((c) => c.status === "active").map((c) => [c.id, c.name]));
  const waiting = (attn.data ?? []).filter((a) => active.has(a.clientId) && !a.lastCall && !a.nextCall).map((a) => active.get(a.clientId)!);
  if (!waiting.length || free.data === undefined || free.data > 0) return null;
  return (
    <div className="ag-wait" role="alert">
      <div><b>{waiting.length === 1 ? `${waiting[0]} espera` : `${waiting.length} clientes nuevos esperan`} para agendar su llamada inicial</b>
        <p>No tienes horarios de llamada inicial libres{waiting.length > 1 ? ` (${waiting.slice(0, 3).join(", ")}${waiting.length > 3 ? "…" : ""})` : ""}. Publica algunos para que puedan reservar.</p></div>
      <button type="button" className="primary-btn" onClick={onPublish}>Publicar horarios</button>
    </div>
  );
}
// Jeff cancela la sesión de un cliente (desde la Agenda o desde la ficha del cliente): el horario queda libre otra vez y al cliente
// le llega una notificación y un aviso en su pantalla Hoy, con el motivo si Jeff lo escribe (0041: el motivo queda guardado).
export type CancelTarget = { bookingId: string; clientName: string; startsAt: string };
export function CancelModal({ t, onClose }: { t: CancelTarget; onClose: () => void }) {
  const cancel = useCancelBooking(), [why, setWhy] = useState("");
  const go = () => cancel.mutate({ id: t.bookingId, reason: why }, { onSuccess: () => {
    void fetch("/api/push/booking-cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId: t.bookingId, reason: why }) }).catch(() => {});
    onClose();
  } });
  return (
    <Modal title="Cancelar sesión" sub={`${t.clientName} · ${DAYLONG[dayIdx(new Date(t.startsAt))]} ${new Date(t.startsAt).getDate()} a las ${hhmm(t.startsAt)}. El horario queda libre otra vez y a tu cliente le llega un aviso para que reserve otro.`} onClose={onClose}>
      <div className="modal-field"><label htmlFor="cw">Motivo para tu cliente (opcional)</label><input id="cw" maxLength={120} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ej. Me surgió un imprevisto, perdona." /></div>
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Conservar</button><button className="modal-btn danger" disabled={cancel.isPending} onClick={go}>{cancel.isPending ? "Cancelando…" : "Sí, cancelar sesión"}</button></div>
    </Modal>
  );
}
