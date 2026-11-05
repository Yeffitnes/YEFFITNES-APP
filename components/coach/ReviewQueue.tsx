"use client";
// Revisar (rehecho el 2-nov; corregido el 4-nov, pedido de Cristian): aquí SOLO está lo que falta por revisar. Cliente por cliente:
// su entrenamiento y su reporte de hoy juntos, más lo pendiente de días anteriores. Lo que se revisa sale de la lista al momento y,
// cuando a un cliente no le queda nada, pasa solo al siguiente. Para volver a ver algo ya revisado: la ficha del cliente (pestaña Hoy).
// El orden se fija al abrir y lo nuevo que llega va al final: la tarjeta que Jeff está leyendo nunca salta.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCoachReports, useClientLogs, useRecentLogs, useReviewReport, fetchReportVideo, type CoachReport, type RecentLog } from "@/lib/queries";
import { useToast } from "@/components/Providers";
import { VideoFrame } from "@/components/ui/BunnyModal";
import { Detail } from "./RecentWorkouts";
import { Skeleton } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { hhmm } from "@/lib/dates";

const todayYmd = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const dayName = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
type Entry = { clientId: string; name: string; log?: RecentLog; report?: CoachReport; oldLogs: RecentLog[]; oldReports: CoachReport[] };
const pendingOf = (e: Entry) => (e.log?.completed && !e.log.seen ? 1 : 0) + (e.report && !e.report.seen ? 1 : 0) + e.oldLogs.length + e.oldReports.length;

function entries(logs: RecentLog[], reports: CoachReport[]): Entry[] {
  const t = todayYmd(), m = new Map<string, Entry>();
  const get = (id: string, name: string) => { let e = m.get(id); if (!e) { e = { clientId: id, name, oldLogs: [], oldReports: [] }; m.set(id, e); } return e; };
  logs.forEach((l) => { if (l.date === t) get(l.clientId, l.clientName).log = l; else if (l.completed && !l.seen) get(l.clientId, l.clientName).oldLogs.push(l); });
  reports.forEach((r) => { if (r.date === t) get(r.clientId, r.clientName).report = r; else if (!r.seen) get(r.clientId, r.clientName).oldReports.push(r); });
  return Array.from(m.values()).filter((e) => pendingOf(e) > 0);   // solo quien tiene algo sin revisar
}

export function ReviewQueue() {
  const logs = useRecentLogs(), reports = useCoachReports(), toast = useToast();
  const [order, setOrder] = useState<string[] | null>(null), [curId, setCurId] = useState<string | null>(null);
  const live = useMemo(() => (logs.data && reports.data ? entries(logs.data, reports.data) : []), [logs.data, reports.data]);
  const ready = !!logs.data && !!reports.data;
  // Lo que llega mientras revisa (tiempo real) se agrega al final, sin mover lo que ya estaba.
  const fresh = live.filter((e) => !order?.includes(e.clientId)).sort((a, b) => a.name.localeCompare(b.name)).map((e) => e.clientId).join(",");
  useEffect(() => { if (ready && (fresh || !order)) setOrder([...(order ?? []), ...(fresh ? fresh.split(",") : [])]); }, [ready, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = order ?? [], byId = new Map(live.map((e) => [e.clientId, e]));
  const list = all.map((id) => byId.get(id)).filter((e): e is Entry => !!e);
  // Cliente actual: el elegido; si ya no le queda nada, el siguiente en el orden (o el anterior si era el último).
  const at = curId ? all.indexOf(curId) : 0;
  const cur = byId.get(curId ?? "") ?? all.slice(Math.max(at, 0)).map((id) => byId.get(id)).find(Boolean) ?? list[list.length - 1];
  const i = cur ? list.indexOf(cur) : 0;
  // Avisa una sola vez al terminar con un cliente y fija el siguiente, para que no salte si al anterior le llega algo nuevo.
  const prev = useRef<Entry | undefined>(undefined);
  useEffect(() => {
    const p = prev.current; prev.current = cur;
    if (p && !byId.has(p.clientId)) toast(`Listo con ${p.name.split(" ")[0]}.${cur ? ` Sigue ${cur.name.split(" ")[0]}.` : ""}`);
    if (cur && cur.clientId !== curId) setCurId(cur.clientId);
  }, [cur?.clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = () => { void logs.refetch(); void reports.refetch(); };

  if ((logs.isPending || reports.isPending) && !order) return <div className="rv-wrap"><div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} /><Skeleton rows={3} /></div>;
  if ((logs.isError || reports.isError) && !ready) return <div className="rv-wrap card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar lo que hay por revisar. <button className="filter-chip" onClick={reload}>Reintentar</button></p></div>;
  return (
    <div className="rv-wrap">
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Revisar</div>
        <h1>{!list.length ? "Todo revisado" : `${list.length} ${list.length === 1 ? "cliente" : "clientes"} por revisar`}</h1>
        <p className="greeting-sub">{list.length ? "Solo está lo que falta. Al responder o marcar visto, sale de aquí." : "No queda ningún entrenamiento ni reporte por revisar."}</p></div></div>
      {!cur ? <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>Si necesitas volver a ver algo o cambiar una respuesta, entra a la ficha del cliente, en la pestaña Hoy.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><Link href="/coach/clientes" className="ghost-btn" style={{ textDecoration: "none" }}>Ver clientes</Link><Link href="/coach" className="primary-btn" style={{ textDecoration: "none" }}>Ir al panel</Link></div></div> : (
        <>
          <div className="rv-nav-row">
            <button type="button" className="ghost-btn" disabled={i === 0} onClick={() => setCurId(list[i - 1].clientId)} aria-label="Cliente anterior"><Icon name="back" size={13} /> Anterior</button>
            <span className="rv-pos"><b>{cur.name.split(" ")[0]}</b><span>{i + 1} de {list.length}</span></span>
            <button type="button" className="ghost-btn" disabled={i >= list.length - 1} onClick={() => setCurId(list[i + 1].clientId)} aria-label="Cliente siguiente">Siguiente <Icon name="arrow" size={13} /></button>
          </div>
          <ClientCard key={cur.clientId} e={cur} />
        </>)}
    </div>
  );
}

function ClientCard({ e }: { e: Entry }) {
  const n = pendingOf(e), old = e.oldLogs.length + e.oldReports.length;
  // Lo que aún no ha hecho hoy no se revisa: va en una línea, solo como contexto para la respuesta.
  const note = [!e.log?.completed && (e.log ? "aún no termina su entrenamiento" : "sin entrenamiento hoy"), !e.report && "sin reporte hoy"].filter(Boolean).join(" · ");
  return (
    <div className="card rv-card">
      <div className="rv-who"><span className="attn-avatar sm">{initials(e.name)}</span><div><b>{e.name}</b><div className="card-meta">{n} por revisar{note ? ` · ${note}` : ""}</div></div>
        <Link href={`/coach/clientes/${e.clientId}`} className="card-link" style={{ marginLeft: "auto" }}>Ver ficha <Icon name="arrow" size={12} /></Link></div>

      {e.log?.completed && !e.log.seen && <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="dumbbell" size={15} /><b>Entrenamiento de hoy</b><span className="rv-state todo">Sin revisar</span></div>
        <WorkoutItem id={e.log.id} clientId={e.clientId} />
      </section>}

      {e.report && !e.report.seen && <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="video" size={15} /><b>Reporte de hoy</b><span className="rv-state todo">Sin ver · {hhmm(e.report.sentAt)}</span></div>
        <ReportItem r={e.report} />
      </section>}

      {!!old && <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="clock" size={15} /><b>Pendiente de días anteriores</b><span className="rv-state todo">{old}</span></div>
        {e.oldLogs.map((l) => <OldRow key={l.id} title={`Entrenamiento del ${dayName(l.date)}${l.routine ? ` · ${l.routine}` : ""}`}><WorkoutItem id={l.id} clientId={e.clientId} /></OldRow>)}
        {e.oldReports.map((r) => <OldRow key={r.id} title={`Reporte del ${dayName(r.date)} · ${hhmm(r.sentAt)}`}><ReportItem r={r} /></OldRow>)}
      </section>}
    </div>
  );
}
function OldRow({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rv-old">
      <button type="button" className="rv-old-head" aria-expanded={open} onClick={() => setOpen(!open)}><span>{title}</span><span className="rv-state todo">Sin revisar</span><Icon name={open ? "up" : "down"} size={13} /></button>
      {open && children}
    </div>
  );
}
function WorkoutItem({ id, clientId }: { id: string; clientId: string }) {
  const logs = useClientLogs(clientId), l = logs.data?.find((x) => x.id === id);
  if (logs.isPending) return <div className="sk" style={{ height: 120, marginTop: 12 }} />;
  if (!l) return <p className="rv-empty">No encontramos este entrenamiento entre los recientes. Ábrelo desde su ficha.</p>;
  return <Detail l={l} clientId={clientId} />;
}
function ReportItem({ r }: { r: CoachReport }) {
  const review = useReviewReport(), [v, setV] = useState<{ url: string; width: number | null; height: number | null } | null>(null), [err, setErr] = useState(false);
  useEffect(() => { if (r.videoState !== "uploaded") return; let off = false; fetchReportVideo(r.id).then((x) => { if (!off) setV(x); }).catch(() => { if (!off) setErr(true); }); return () => { off = true; }; }, [r.id, r.videoState]);
  return (
    <div style={{ marginTop: 8 }}>
      {r.comment ? <p className="rv-quote">“{r.comment}”</p> : <p className="rv-empty">Sin comentario.</p>}
      {r.videoState === "uploaded" && <div className="rv-video">{v ? <VideoFrame url={v.url} title={`Vídeo de ${r.clientName}`} width={v.width} height={v.height} /> : err ? <p role="alert" style={{ fontSize: 13 }}>No pudimos cargar el vídeo.</p> : <div className="sk" style={{ height: 180 }} />}</div>}
      {r.videoState === "deleted" && <p className="note-date">El vídeo ya se borró automáticamente.</p>}
      <div className="rv-acts">
        <Link href={`/coach/mensajes?c=${r.clientId}`} className="ghost-btn" style={{ textDecoration: "none" }}>Responder por mensaje</Link>
        <button type="button" className="primary-btn" disabled={review.isPending} onClick={() => review.mutate(r.id)}>Marcar visto</button>
      </div>
    </div>
  );
}
