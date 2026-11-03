"use client";
// Revisar (rehecho el 2-nov, pedido de Cristian): CLIENTE POR CLIENTE. En una sola tarjeta, el entrenamiento de hoy y el reporte de
// hoy de ese cliente (o "no lo ha hecho"), y abajo lo que le quedó pendiente de días anteriores. Jeff pasa de un cliente a otro con
// Anterior / Siguiente y responde ahí mismo, sin entrar a cada ficha. Sin modos ni filtros (antes eran 5 botones y confundía).
// Orden: primero los que tienen algo sin revisar, después los que ya están al día. La lista se arma al abrir (no salta mientras revisa);
// lo de adentro (revisado o no) sí se actualiza en vivo.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCoachReports, useClientLogs, useRecentLogs, useReviewReport, fetchReportVideo, type CoachReport, type RecentLog } from "@/lib/queries";
import { VideoFrame } from "@/components/ui/BunnyModal";
import { Detail } from "./RecentWorkouts";
import { Skeleton } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { hhmm } from "@/lib/dates";

const todayYmd = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const dayName = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
type Entry = { clientId: string; name: string; log?: RecentLog; report?: CoachReport; oldLogs: RecentLog[]; oldReports: CoachReport[] };
const pendingOf = (e: Entry) => (e.log?.completed && !e.log.seen ? 1 : 0) + (e.report && !e.report.seen ? 1 : 0) + e.oldLogs.filter((l) => !l.seen).length + e.oldReports.filter((r) => !r.seen).length;

function entries(logs: RecentLog[], reports: CoachReport[]): Entry[] {
  const t = todayYmd(), m = new Map<string, Entry>();
  const get = (id: string, name: string) => { let e = m.get(id); if (!e) { e = { clientId: id, name, oldLogs: [], oldReports: [] }; m.set(id, e); } return e; };
  logs.forEach((l) => { if (l.date === t) get(l.clientId, l.clientName).log = l; else if (l.completed && !l.seen) get(l.clientId, l.clientName).oldLogs.push(l); });
  reports.forEach((r) => { if (r.date === t) get(r.clientId, r.clientName).report = r; else if (!r.seen) get(r.clientId, r.clientName).oldReports.push(r); });
  // Solo quien tiene algo que mirar: entrenamiento terminado o reporte de hoy, o algo pendiente de antes.
  return Array.from(m.values()).filter((e) => e.log?.completed || e.report || e.oldLogs.length || e.oldReports.length);
}

export function ReviewQueue() {
  const logs = useRecentLogs(), reports = useCoachReports();
  const [order, setOrder] = useState<string[] | null>(null), [i, setI] = useState(0);
  const live = useMemo(() => (logs.data && reports.data ? entries(logs.data, reports.data) : []), [logs.data, reports.data]);
  const build = (l: Entry[]) => [...l].sort((a, b) => Number(pendingOf(b) > 0) - Number(pendingOf(a) > 0) || a.name.localeCompare(b.name)).map((e) => e.clientId);
  useEffect(() => { if (!order && logs.data && reports.data) setOrder(build(live)); }, [live, order]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = () => { void Promise.all([logs.refetch(), reports.refetch()]).then(([a, b]) => { if (a.data && b.data) { setOrder(build(entries(a.data, b.data))); setI(0); } }); };

  if ((logs.isPending || reports.isPending) && !order) return <div className="rv-wrap"><div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} /><Skeleton rows={3} /></div>;
  if ((logs.isError || reports.isError) && !order) return <div className="rv-wrap card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar lo de hoy. <button className="filter-chip" onClick={reload}>Reintentar</button></p></div>;
  const list = (order ?? []).map((id) => live.find((e) => e.clientId === id)).filter((e): e is Entry => !!e);
  const cur = list[Math.min(i, list.length - 1)], pend = list.filter((e) => pendingOf(e) > 0).length;
  return (
    <div className="rv-wrap">
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Revisar · hoy</div>
        <h1>{!list.length ? "Nada que revisar" : pend ? `${pend} ${pend === 1 ? "cliente" : "clientes"} por revisar` : "Todo revisado"}</h1>
        <p className="greeting-sub">Cliente por cliente: su entrenamiento y su reporte de hoy juntos. Responde ahí mismo y pasa al siguiente.</p></div></div>
      {!list.length ? <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>Hoy nadie ha terminado su entrenamiento ni enviado reporte, y no queda nada pendiente de días anteriores.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="ghost-btn" onClick={reload}>Volver a cargar</button><Link href="/coach" className="primary-btn" style={{ textDecoration: "none" }}>Ir al panel</Link></div></div> : (
        <>
          <div className="rv-nav-row">
            <button type="button" className="ghost-btn" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Cliente anterior"><Icon name="back" size={13} /> Anterior</button>
            <span className="rv-pos"><b>{cur.name.split(" ")[0]}</b><span>{i + 1} de {list.length}</span></span>
            <button type="button" className="ghost-btn" disabled={i >= list.length - 1} onClick={() => setI(i + 1)} aria-label="Cliente siguiente">Siguiente <Icon name="arrow" size={13} /></button>
          </div>
          <ClientCard key={cur.clientId} e={cur} last={i >= list.length - 1} onNext={() => setI(i + 1)} />
        </>)}
    </div>
  );
}

function ClientCard({ e, last, onNext }: { e: Entry; last: boolean; onNext: () => void }) {
  const first = e.name.split(" ")[0], n = pendingOf(e), old = e.oldLogs.length + e.oldReports.length;
  return (
    <div className="card rv-card">
      <div className="rv-who"><span className="attn-avatar sm">{initials(e.name)}</span><div><b>{e.name}</b><div className="card-meta">{n ? `${n} por revisar` : "Todo revisado"}</div></div>
        <Link href={`/coach/clientes/${e.clientId}`} className="card-link" style={{ marginLeft: "auto" }}>Ver ficha <Icon name="arrow" size={12} /></Link></div>

      <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="dumbbell" size={15} /><b>Entrenamiento de hoy</b>{e.log?.completed && <span className={`rv-state${e.log.seen ? "" : " todo"}`}>{e.log.seen ? "Revisado" : "Sin revisar"}</span>}</div>
        {e.log?.completed ? <WorkoutItem id={e.log.id} clientId={e.clientId} />
          : <p className="rv-empty">{e.log ? `${first} empezó su entrenamiento pero aún no lo termina.` : `${first} no ha terminado el entrenamiento de hoy.`}</p>}
      </section>

      <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="video" size={15} /><b>Reporte de hoy</b>{e.report && <span className={`rv-state${e.report.seen ? "" : " todo"}`}>{e.report.seen ? "Visto" : "Sin ver"} · {hhmm(e.report.sentAt)}</span>}</div>
        {e.report ? <ReportItem r={e.report} /> : <p className="rv-empty">{first} no ha enviado el reporte de hoy.</p>}
      </section>

      {!!old && <section className="rv-sec">
        <div className="rv-sec-head"><Icon name="clock" size={15} /><b>Pendiente de días anteriores</b><span className="rv-state todo">{old}</span></div>
        {e.oldLogs.map((l) => <OldRow key={l.id} title={`Entrenamiento del ${dayName(l.date)}${l.routine ? ` · ${l.routine}` : ""}`} done={l.seen}><WorkoutItem id={l.id} clientId={e.clientId} /></OldRow>)}
        {e.oldReports.map((r) => <OldRow key={r.id} title={`Reporte del ${dayName(r.date)} · ${hhmm(r.sentAt)}`} done={r.seen}><ReportItem r={r} /></OldRow>)}
      </section>}

      {!n && !last && <div className="rv-next"><span>Listo con {first}.</span><button type="button" className="primary-btn" onClick={onNext}>Siguiente cliente <Icon name="arrow" size={13} /></button></div>}
    </div>
  );
}
function OldRow({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rv-old">
      <button type="button" className="rv-old-head" aria-expanded={open} onClick={() => setOpen(!open)}><span>{title}</span><span className={`rv-state${done ? "" : " todo"}`}>{done ? "Revisado" : "Sin revisar"}</span><Icon name={open ? "up" : "down"} size={13} /></button>
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
        {r.seen ? <span className="rv-done"><Icon name="check" size={13} stroke={2.4} /> Ya lo viste</span>
          : <button type="button" className="primary-btn" disabled={review.isPending} onClick={() => review.mutate(r.id)}>Marcar visto</button>}
      </div>
    </div>
  );
}
