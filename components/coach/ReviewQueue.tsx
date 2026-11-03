"use client";
// Revisar pendientes (pedido de Cristian, 30-oct, noche): Jeff pasa por todo lo que falta revisar (entrenamientos terminados y
// reportes del día) uno detrás de otro, sin volver a la lista. Al guardar o marcar visto, pasa solo al siguiente.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCoachReports, useClientLogs, useRecentLogs, useReviewReport, fetchReportVideo, type CoachReport, type RecentLog } from "@/lib/queries";
import { VideoFrame } from "@/components/ui/BunnyModal";
import { Detail } from "./RecentWorkouts";
import { Skeleton } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";

type Item = { kind: "workout"; id: string; clientId: string; name: string; date: string; title: string } | { kind: "report"; id: string; clientId: string; name: string; date: string; title: string; r: CoachReport };
const dayTxt = (ymd: string) => { const d = Math.round((Date.parse(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) + "T12:00:00Z") - Date.parse(`${ymd}T12:00:00Z`)) / 86_400_000); return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`; };

export function ReviewQueue() {
  const logs = useRecentLogs(), reports = useCoachReports();
  // La lista se arma UNA vez al abrir (así no salta mientras Jeff revisa); "Volver a cargar" la rehace.
  const [queue, setQueue] = useState<Item[] | null>(null), [i, setI] = useState(0), [done, setDone] = useState<string[]>([]);
  // Filtro (pedido de Cristian, 2-nov): todo, solo entrenamientos o solo reportes, para pasar rápido por uno solo de los dos.
  const [f, setF] = useState<"all" | "workout" | "report">("all");
  const build = (l: RecentLog[], r: CoachReport[]): Item[] => [
    ...l.filter((x) => x.completed && !x.seen).map((x): Item => ({ kind: "workout", id: x.id, clientId: x.clientId, name: x.clientName, date: x.date, title: `Entrenamiento de ${dayTxt(x.date)}${x.routine ? ` · ${x.routine}` : ""}` })),
    ...r.filter((x) => !x.seen).map((x): Item => ({ kind: "report", id: x.id, clientId: x.clientId, name: x.clientName, date: x.date, title: `Reporte de ${dayTxt(x.date)}`, r: x })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  useEffect(() => { if (!queue && logs.data && reports.data) setQueue(build(logs.data, reports.data)); }, [logs.data, reports.data, queue]);
  const reload = () => { void Promise.all([logs.refetch(), reports.refetch()]).then(([a, b]) => { if (a.data && b.data) { setQueue(build(a.data, b.data)); setI(0); setDone([]); } }); };   // conserva el filtro elegido
  const all = queue ?? [], q = useMemo(() => all.filter((x) => f === "all" || x.kind === f), [all, f]);
  const left = useMemo(() => q.filter((x) => !done.includes(x.id)).length, [q, done]);
  const pend = (k: "workout" | "report") => all.filter((x) => x.kind === k && !done.includes(x.id)).length;
  const pick = (v: typeof f) => { setF(v); const l = all.filter((x) => v === "all" || x.kind === v); setI(Math.max(0, l.findIndex((x) => !done.includes(x.id)))); };
  const next = (id: string) => { const nd = [...done, id]; setDone(nd); const k = q.findIndex((x, j) => j > i && !nd.includes(x.id)); setI(k >= 0 ? k : Math.max(0, q.findIndex((x) => !nd.includes(x.id)))); };

  if ((logs.isPending || reports.isPending) && !queue) return <div><div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} /><Skeleton rows={3} /></div>;
  if ((logs.isError || reports.isError) && !queue) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar lo pendiente. <button className="filter-chip" onClick={reload}>Reintentar</button></p></div>;
  const cur = q[i], allDone = !q.length || left === 0;
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Revisar pendientes</div><h1>{allDone ? (f === "all" ? "Todo revisado" : "Listo por aquí") : `${left} por revisar`}</h1>
        <p className="greeting-sub">Entrenamientos terminados y reportes del día, uno detrás de otro. Al guardar o marcar visto pasa solo al siguiente.</p></div></div>
      {!!all.length && <div className="filter-row rv-filter" role="group" aria-label="Qué revisar">
        {([["all", "Todo", pend("workout") + pend("report")], ["workout", "Entrenamientos", pend("workout")], ["report", "Reportes", pend("report")]] as const).map(([k, t, n]) =>
          <button key={k} type="button" aria-pressed={f === k} className={`filter-chip${f === k ? " active" : ""}`} onClick={() => pick(k)}>{t} <b className="rv-n">{n}</b></button>)}
      </div>}
      {allDone ? <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>{q.length ? (f === "workout" ? "Revisaste todos los entrenamientos pendientes." : f === "report" ? "Revisaste todos los reportes pendientes." : "Revisaste todo lo pendiente. Buen trabajo.") : f === "workout" ? "No hay entrenamientos pendientes por revisar." : f === "report" ? "No hay reportes pendientes por revisar." : "No hay nada pendiente por revisar ahora mismo."}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button className="ghost-btn" onClick={reload}>Volver a cargar</button><Link href="/coach" className="primary-btn" style={{ textDecoration: "none" }}>Ir al panel</Link></div></div> : (
        <>
          <div className="rv-top"><span className="rv-count">{q.length - left + 1} de {q.length}</span>
            <div className="rv-nav"><button className="ghost-btn" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button><button className="ghost-btn" disabled={i >= q.length - 1} onClick={() => setI(i + 1)}>Saltar</button></div></div>
          <div className="rv-bar"><i style={{ width: `${((q.length - left) / q.length) * 100}%` }} /></div>
          {cur && <div className="card" key={cur.id}>
            <div className="rv-who"><span className="attn-avatar sm">{initials(cur.name)}</span><div><b>{cur.name}</b><div className="card-meta">{cur.title}</div></div>
              <Link href={`/coach/clientes/${cur.clientId}`} className="card-link" style={{ marginLeft: "auto" }}>Ver ficha <Icon name="arrow" size={12} /></Link></div>
            {done.includes(cur.id) ? <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 10 }}>Ya revisado.</p>
              : cur.kind === "workout" ? <WorkoutItem id={cur.id} clientId={cur.clientId} onDone={() => next(cur.id)} />
              : <ReportItem r={cur.r} onDone={() => next(cur.id)} />}
          </div>}
        </>)}
    </div>
  );
}
function WorkoutItem({ id, clientId, onDone }: { id: string; clientId: string; onDone: () => void }) {
  const logs = useClientLogs(clientId), l = logs.data?.find((x) => x.id === id);
  if (logs.isPending) return <div className="sk" style={{ height: 120, marginTop: 12 }} />;
  if (!l) return <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 10 }}>No encontramos este entrenamiento entre los recientes. Ábrelo desde su ficha.</p>;
  return <Detail l={l} clientId={clientId} onSaved={onDone} />;
}
function ReportItem({ r, onDone }: { r: CoachReport; onDone: () => void }) {
  const review = useReviewReport(), [v, setV] = useState<{ url: string; width: number | null; height: number | null } | null>(null), [err, setErr] = useState(false);
  useEffect(() => { if (r.videoState !== "uploaded") return; let off = false; fetchReportVideo(r.id).then((x) => { if (!off) setV(x); }).catch(() => { if (!off) setErr(true); }); return () => { off = true; }; }, [r.id, r.videoState]);
  return (
    <div style={{ marginTop: 10 }}>
      {r.comment ? <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", margin: "0 0 12px" }}>“{r.comment}”</p> : <p style={{ fontSize: 13.5, color: "var(--text-faint)", margin: "0 0 12px" }}>Sin comentario.</p>}
      {r.videoState === "uploaded" && (v ? <VideoFrame url={v.url} title={`Vídeo de ${r.clientName}`} width={v.width} height={v.height} /> : err ? <p role="alert" style={{ fontSize: 13 }}>No pudimos cargar el vídeo.</p> : <div className="sk" style={{ height: 200 }} />)}
      {r.videoState === "deleted" && <p className="note-date">El vídeo ya se borró automáticamente.</p>}
      <div className="modal-actions" style={{ flexWrap: "wrap" }}>
        <Link href={`/coach/mensajes?c=${r.clientId}`} className="modal-btn ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Responder por mensaje</Link>
        <button className="modal-btn primary" disabled={review.isPending} onClick={() => review.mutate(r.id, { onSuccess: onDone })}>Marcar visto y seguir</button>
      </div>
    </div>
  );
}
