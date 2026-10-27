"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { fetchReportVideoUrl, localDate, useClientLogs, useClientNutrition, useCoachReports, useMealLogs, useReviewReport, type CoachReport } from "@/lib/queries";
import { useThread, type Msg } from "@/lib/messages";
import { ago } from "@/lib/format";
import { hhmm } from "@/lib/dates";
import { Detail } from "./RecentWorkouts";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isoDow = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
const msgKind = (m: Msg) => (m.hasVideo || m.youtubeId ? "Vídeo" : m.audioPath ? "Audio" : m.imagePath ? "Foto" : "Mensaje");

// Lo primero que Jeff necesita al abrir un cliente: qué hizo hoy (entreno, nutrición, reporte, mensajes y vídeos).
export function TodayCard({ clientId, first, onGo }: { clientId: string; first: string; onGo: (tab: string) => void }) {
  const today = localDate(), logs = useClientLogs(clientId), nut = useClientNutrition(clientId), meals = useMealLogs(clientId, today), reports = useCoachReports(), thread = useThread(clientId), review = useReviewReport();
  const [openLog, setOpenLog] = useState<boolean | null>(null), [openOld, setOpenOld] = useState<string | null>(null), [play, setPlay] = useState<{ r: CoachReport; url: string | null; err: boolean } | null>(null), [msgVideo, setMsgVideo] = useState<string | null>(null);
  const log = (logs.data ?? []).find((l) => l.date === today), lastLog = (logs.data ?? []).find((l) => l.completed);
  const dow = isoDow(new Date()), todays = (nut.data?.meals ?? []).filter((m) => m.weekday === null || m.weekday === dow), done = todays.filter((m) => m.id && (meals.data ?? []).includes(m.id)).length;
  const report = (reports.data ?? []).find((r) => r.clientId === clientId && r.date === today);
  const msgs = (thread.data ?? []).filter((m) => m.sender === "client" && localDate(new Date(m.createdAt)) === today);
  const oldPending = (logs.data ?? []).filter((l) => l.completed && !l.seen && l.date !== today);
  const logOpen = openLog ?? (!!log && !log.seen);
  const trained = !!log?.completed, nutOk = todays.length > 0 && done >= todays.length;
  const openVideo = async (r: CoachReport) => { setPlay({ r, url: null, err: false }); try { setPlay({ r, url: await fetchReportVideoUrl(r.id), err: false }); } catch { setPlay({ r, url: null, err: true }); } };
  const Chip = ({ ok, label, val }: { ok: boolean; label: string; val: string }) => <div className={`today-chip${ok ? " ok" : ""}`}><span className="today-dot">{ok && <Icon name="check" size={11} stroke={2.6} />}</span><div><b>{label}</b><span>{val}</span></div></div>;
  return (
    <section className="today" aria-label={`Hoy con ${first}`}>
      <div className="today-hero">
        <div className="today-eyebrow">{cap(new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }))}</div>
        <div className="today-title">Hoy con {first}</div>
        <div className="today-chips">
          <Chip ok={trained} label="Entrenamiento" val={trained ? `Completado${log?.effort ? ` · ${log.effort}/10` : ""}` : log ? "En curso" : "Pendiente"} />
          <Chip ok={nutOk} label="Nutrición" val={nut.data ? (todays.length ? `${done} de ${todays.length} comidas` : "Sin comidas hoy") : "Sin plan"} />
          <Chip ok={!!report} label="Reporte" val={report ? (report.videoState === "uploaded" ? "Enviado con vídeo" : "Enviado") : "No enviado"} />
          <Chip ok={msgs.length > 0} label="Mensajes" val={msgs.length ? `${msgs.length} hoy` : "Ninguno"} />
        </div>
      </div>

      {oldPending.length > 0 && <div className="card today-sec today-pending">
        <div className="today-head"><span className="today-ico"><Icon name="clock" size={15} /></span><div className="card-tag" style={{ marginBottom: 0 }}>Por revisar de días anteriores</div><span className="today-count">{oldPending.length}</span></div>
        {oldPending.map((l) => (
          <div key={l.id} className="today-old">
            <button type="button" className="today-old-btn" aria-expanded={(openOld ?? oldPending[0].id) === l.id} onClick={() => setOpenOld((openOld ?? oldPending[0].id) === l.id ? "" : l.id)}>
              <span><b>{cap(ago(l.date))}</b> · {l.routine ?? "Entrenamiento"}</span><span className="today-sub" style={{ margin: 0 }}>{l.sets.length} series{l.effort ? ` · esfuerzo ${l.effort}/10` : ""}</span>
            </button>
            {(openOld ?? oldPending[0].id) === l.id && <Detail l={l} clientId={clientId} onSaved={() => setOpenOld("")} />}
          </div>))}
      </div>}

      <div className="card today-sec">
        <div className="today-head"><span className="today-ico"><Icon name="dumbbell" size={15} /></span><div className="card-tag" style={{ marginBottom: 0 }}>Entrenamiento de hoy</div></div>
        {logs.isPending && <div className="sk" style={{ height: 48, marginTop: 10 }} />}
        {logs.data && !log && <p className="today-empty">{first} aún no ha registrado su entrenamiento de hoy.{lastLog ? ` Último: ${ago(lastLog.date)}.` : ""}</p>}
        {log && <div style={{ marginTop: 8 }}><div className="today-line"><b>{log.routine ?? "Entrenamiento"}</b><span className={`client-status ${log.completed && !log.seen ? "review" : "ok"}`}>{!log.completed ? "En curso" : log.seen ? "Revisado" : "Sin revisar"}</span></div>
          <div className="today-sub">{log.sets.length} series{log.effort ? ` · esfuerzo ${log.effort}/10` : ""}{log.note ? ` · “${log.note}”` : ""}</div>
          {log.completed && log.seen && <div className="today-done"><Icon name="check" size={13} stroke={2.4} /><span>Ya lo revisaste{log.comment || log.commentAudio ? " y le dejaste tu comentario" : ""}.</span><button type="button" onClick={() => setOpenLog(!logOpen)}>{logOpen ? "Ocultar" : "Ver o editar"}</button></div>}
          {logOpen && <Detail l={log} clientId={clientId} onSaved={() => setOpenLog(null)} />}</div>}
      </div>

      <div className={`card today-sec${report ? " card-dark today-dark" : ""}`}>
        <div className="today-head"><span className="today-ico"><Icon name="video" size={15} /></span><div className="card-tag" style={{ marginBottom: 0 }}>Reporte diario</div></div>
        {!report && <p className="today-empty">{first} aún no ha enviado el reporte de hoy.</p>}
        {report && <div style={{ marginTop: 8 }}>
          {report.comment ? <p className="today-quote">“{report.comment}”</p> : <p className="today-empty">Sin comentario.</p>}
          <div className="today-actions">
            {report.videoState === "uploaded" && <button className="today-play" onClick={() => void openVideo(report)}><Icon name="play" size={12} /> Ver vídeo</button>}
            {report.videoState === "deleted" && <span className="today-viewed">Vídeo borrado automáticamente</span>}
            {!report.seen ? <button className="today-seen" disabled={review.isPending} onClick={() => review.mutate(report.id)}>Marcar visto</button> : <span className="today-viewed">Ya lo viste</span>}
          </div></div>}
      </div>

      <div className="card today-sec">
        <div className="today-line" style={{ alignItems: "center" }}><div className="today-head"><span className="today-ico"><Icon name="message" size={15} /></span><div className="card-tag" style={{ marginBottom: 0 }}>Mensajes de hoy</div></div><button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} onClick={() => onGo("Mensajes")}>Responder</button></div>
        {thread.isPending && <div className="sk" style={{ height: 48, marginTop: 10 }} />}
        {thread.data && !msgs.length && <p className="today-empty">{first} no te ha enviado mensajes hoy.</p>}
        {msgs.map((m) => (
          <div key={m.id} className="today-msg">
            <div className="today-msg-top"><span className="today-kind">{m.hasVideo || m.youtubeId ? <Icon name="video" size={11} /> : m.audioPath ? <Icon name="mic" size={11} /> : m.imagePath ? <Icon name="camera" size={11} /> : <Icon name="message" size={11} />} {msgKind(m)}</span><span className="note-date">{hhmm(m.createdAt)}{m.readAt ? "" : " · sin leer"}</span></div>
            {m.body && <p className="today-quote" style={{ margin: "4px 0 0" }}>{m.body}</p>}
            {(m.hasVideo || m.imagePath || m.audioPath) && <button className="ghost-btn" style={{ height: 32, fontSize: 11.5, marginTop: 8 }} onClick={() => (m.hasVideo ? setMsgVideo(m.id) : onGo("Mensajes"))}>{m.hasVideo ? "Ver vídeo" : m.audioPath ? "Escuchar en Mensajes" : "Ver foto en Mensajes"}</button>}
          </div>))}
      </div>

      {msgVideo && <BunnyModal param={`message=${msgVideo}`} title={`Vídeo de ${first}`} onClose={() => setMsgVideo(null)} />}
      {play && <Modal title={`Reporte de ${first}`} sub={play.r.comment ?? "Vídeo de verificación"} onClose={() => setPlay(null)} wide>
        {!play.url && !play.err && <div className="sk" style={{ height: 240 }} />}
        {play.err && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el vídeo (puede que ya se haya borrado o que aún se esté procesando; prueba en un minuto).</p>}
        {play.url && <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}><iframe src={play.url} title={`Vídeo de ${first}`} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div>}
        {!play.r.seen && <div className="modal-actions"><button className="modal-btn primary" onClick={() => { review.mutate(play.r.id); setPlay(null); }}>Marcar visto y cerrar</button></div>}
      </Modal>}
    </section>
  );
}
