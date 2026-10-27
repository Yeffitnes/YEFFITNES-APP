"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchReportVideoUrl, useCoachReports, useReviewReport, videoExpiry, type CoachReport } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { ago, gradient, initials } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function ReportsView() {
  const { data, isPending, isError, refetch } = useCoachReports(), review = useReviewReport(), [play, setPlay] = useState<{ r: CoachReport; url: string | null; err: boolean } | null>(null);
  useEffect(() => { void fetch("/api/video/purge", { method: "POST" }).catch(() => {}); }, []);   // borra de Bunny los vídeos vencidos
  const open = async (r: CoachReport) => {
    setPlay({ r, url: null, err: false });
    try { setPlay({ r, url: await fetchReportVideoUrl(r.id), err: false }); } catch { setPlay({ r, url: null, err: true }); }
  };
  const all = data ?? [], pending = all.filter((r) => !r.seen), done = all.filter((r) => r.seen);
  const row = (r: CoachReport, i: number) => (
    <div key={r.id} className="note-item" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div className="attn-avatar" style={{ background: gradient(i), flexShrink: 0 }}>{initials(r.clientName)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="attn-name"><Link href={`/coach/clientes/${r.clientId}`}>{r.clientName}</Link> <span className="note-date">· {cap(ago(r.date))}</span></div>
        {r.comment ? <div className="note-text" style={{ whiteSpace: "pre-wrap" }}>{r.comment}</div> : <div className="note-text" style={{ color: "var(--text-faint)" }}>Sin comentario.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {r.videoState === "uploaded" && <button className="ghost-btn" onClick={() => open(r)}><Icon name="play" size={12} /> Ver vídeo</button>}
          {r.videoState === "deleted" && <span className="note-date">Vídeo borrado automáticamente</span>}
          {!r.seen && <button className="primary-btn" disabled={review.isPending} onClick={() => review.mutate(r.id)}>Marcar visto</button>}
        </div>
        {videoExpiry(r) && <div className="note-date" style={{ marginTop: 6 }}>{videoExpiry(r)}</div>}
      </div>
    </div>);
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Reportes diarios</div><h1>{data ? (pending.length ? `${pending.length} por revisar` : "Todo al día") : "Reportes diarios"}</h1>
        <p className="greeting-sub">Vídeo de verificación y comentario de cada cliente. El vídeo se borra solo 12 horas después de que lo marcas como visto, y a las 32 horas de enviado aunque no lo veas.</p></div></div>
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los reportes. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !all.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay reportes. Cuando tus clientes los envíen, aparecerán aquí, los más recientes primero.</p></div>}
      {!!pending.length && <div className="card" style={{ marginBottom: 18 }}><div className="card-tag">Sin revisar</div>{pending.map(row)}</div>}
      {!!done.length && <div className="card"><div className="card-tag">Revisados (últimos 14 días)</div>{done.map(row)}</div>}
      {play && <Modal title={play.r.clientName} sub={play.r.comment ?? "Vídeo de verificación"} onClose={() => setPlay(null)} wide>
        {!play.url && !play.err && <div className="sk" style={{ height: 240 }} />}
        {play.err && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el vídeo (puede que ya se haya borrado o que aún se esté procesando; prueba en un minuto).</p>}
        {play.url && <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}><iframe src={play.url} title={`Vídeo de ${play.r.clientName}`} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div>}
        {!play.r.seen && <div className="modal-actions"><button className="modal-btn primary" onClick={() => { review.mutate(play.r.id); setPlay(null); }}>Marcar visto y cerrar</button></div>}
      </Modal>}
    </div>
  );
}
