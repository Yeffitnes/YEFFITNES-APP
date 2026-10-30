"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { localDate, useSubmitReport, useTodayReport, useVideoEnabled, type MyReport } from "@/lib/queries";
import { MAX_SOURCE_SECONDS, MAX_VIDEO_MB, MAX_VIDEO_SECONDS, UploadError, discardVideo, uploadVideo } from "@/lib/upload-video";
import { Icon } from "@/components/ui/Icon";
import { useVideoPick } from "@/components/ui/useVideoPick";
import { QuickRow } from "./QuickRow";
const UP_ERR: Record<string, string> = { too_many: "Ya subiste varios vídeos hoy. Inténtalo mañana.", not_allowed: "Tu plan no incluye el reporte diario.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa tu conexión y vuelve a intentarlo (se reanuda sola)." };
export function ReportCard({ clientId }: { clientId: string }) {
  const today = localDate(), rep = useTodayReport(clientId, today), enabled = useVideoEnabled(), submit = useSubmitReport(clientId, today);
  const [file, setFile] = useState<File | null>(null), [comment, setComment] = useState(""), [pct, setPct] = useState<number | null>(null), [err, setErr] = useState(""), [videoId, setVideoId] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const gallery = useRef<HTMLInputElement>(null), cam = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  // Si ya se había subido uno y se elige otro (o se quita), el anterior se descarta de inmediato: no queda ocupando espacio ni cupo.
  const choose = (f: File | null) => { discardVideo(videoId); setVideoId(null); setFile(f); };
  const { pick, trimmer } = useVideoPick({ maxSeconds: MAX_VIDEO_SECONDS, maxSourceSeconds: MAX_SOURCE_SECONDS, maxMB: MAX_VIDEO_MB, onFile: choose, onError: setErr });
  const ctl = useRef<AbortController | null>(null);
  if (rep.isPending || enabled.isPending) return <div className="sk" style={{ height: 58, marginBottom: 12 }} />;
  if (rep.data) return <ReportSent clientId={clientId} today={today} r={rep.data} />;
  const needVideo = enabled.data === true;
  const send = async () => {
    if (busy) return; setErr("");
    if (needVideo && !file && !videoId) return setErr("El vídeo es obligatorio: grábalo antes de enviar.");
    if (!comment.trim()) return setErr("El comentario es obligatorio: cuéntale a tu coach cómo te fue.");
    setBusy(true);
    try {
      let vid = videoId;
      if (needVideo && file && !vid) {
        setPct(0); ctl.current = new AbortController(); vid = await uploadVideo(file, setPct, { purpose: "report", signal: ctl.current.signal }); setVideoId(vid);
      }
      await submit.mutateAsync({ comment, videoId: vid });
    } catch (e) { if (e instanceof UploadError && e.code !== "cancelled") setErr(UP_ERR[e.code] ?? UP_ERR.upload_failed); } finally { setBusy(false); setPct(null); }
  };
  return (
    <QuickRow anchor="reporte" icon="video" tone="todo" title="Reporte de hoy" sub={needVideo ? "Vídeo y comentario obligatorios" : "Comentario obligatorio"} chip="Pendiente">
      <div className="card-title" style={{ fontSize: 15 }}>Cuéntale a tu coach cómo te fue</div>
      {needVideo && <>
        <input ref={gallery} type="file" accept="video/mp4,video/quicktime,video/x-m4v,.mov,.mp4,.m4v" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <input ref={cam} type="file" accept="video/*" capture="user" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button type="button" className="report-btn ghost" style={{ margin: 0, width: "100%" }} onClick={() => gallery.current?.click()} disabled={busy}><Icon name="video" size={16} /> {file ? "Cambiar vídeo" : "Elegir de la galería"}</button>
          <button type="button" className="report-btn ghost" style={{ margin: 0, width: "100%" }} onClick={() => cam.current?.click()} disabled={busy}>Grabar ahora</button>
        </div>
        {file && preview && <div className="rep-pick"><video src={`${preview}#t=0.1`} muted playsInline preload="metadata" onLoadedMetadata={(e) => { const v = e.currentTarget; v.classList.toggle("wide", v.videoWidth > v.videoHeight); }} /><span><b>Vídeo listo para enviar</b><i>{file.name.slice(0, 28)} · {(file.size / 1048576).toFixed(file.size < 10485760 ? 1 : 0)} MB</i></span><button type="button" aria-label="Quitar vídeo" disabled={busy} onClick={() => choose(null)}><Icon name="close" size={14} /></button></div>}
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Máximo {MAX_VIDEO_SECONDS} segundos; con 10 a 20 s es suficiente y sube más rápido. Si el vídeo dura hasta {MAX_SOURCE_SECONDS} s, lo recortas aquí mismo. Muestra que entrenaste. Se borra solo: 12 horas después de que tu coach lo vea, y como máximo a las 32 horas.</p>
      </>}
      <textarea aria-label="Comentario del día" maxLength={1000} placeholder="¿Cómo te sentiste? ¿Algo que tu coach deba saber? (obligatorio)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", minHeight: 70, marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
      {pct !== null && <div style={{ marginTop: 10 }} aria-live="polite"><div style={{ height: 6, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .3s" }} /></div><div style={{ fontSize: 12, marginTop: 4, color: "var(--text-dim)" }}>Subiendo vídeo… {pct}%. No cierres esta pantalla. <button type="button" className="filter-chip" onClick={() => ctl.current?.abort()}>Cancelar</button></div></div>}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <button className="report-btn" style={{ marginTop: 12 }} disabled={busy} onClick={send}>{busy ? "Enviando…" : "Enviar reporte"}</button>
      {trimmer}
    </QuickRow>
  );
}

// Reporte enviado (30-oct): con la cabecita del personaje y UNA corrección del comentario mientras Jeff no lo haya visto (0042).
function ReportSent({ clientId, today, r }: { clientId: string; today: string; r: MyReport }) {
  const submit = useSubmitReport(clientId, today), [edit, setEdit] = useState(false), [txt, setTxt] = useState(r.comment ?? "");
  const can = !r.seen && (r.edits ?? 0) < 1;
  return (
    <QuickRow anchor="reporte" icon="check" tone="ok" face title="Reporte enviado" sub={r.seen ? "Tu coach ya lo vio" : (r.edits ?? 0) > 0 ? "Corregido · tu coach lo verá pronto" : "Tu coach lo verá pronto"}>
      {!edit && r.comment && <p className="qrow-quote">“{r.comment}”</p>}
      {edit ? <>
        <textarea aria-label="Corregir el comentario" maxLength={1000} value={txt} onChange={(e) => setTxt(e.target.value)} style={{ width: "100%", minHeight: 70, marginTop: 8, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
        <p className="fold-note" style={{ padding: 0 }}>Es tu única corrección: después ya no se podrá cambiar. El vídeo se queda igual.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="button" className="mini-btn ghost" onClick={() => { setEdit(false); setTxt(r.comment ?? ""); }}>Cancelar</button>
          <button type="button" className="mini-btn primary" disabled={submit.isPending || !txt.trim()} onClick={() => submit.mutate({ comment: txt, videoId: null, edit: true }, { onSuccess: () => setEdit(false) })}>{submit.isPending ? "Guardando…" : "Guardar corrección"}</button></div>
      </> : can ? <button type="button" className="mini-btn ghost" style={{ marginTop: 8 }} onClick={() => setEdit(true)}>Corregir mi comentario (1 vez)</button>
        : <p className="fold-note" style={{ padding: 0 }}>{r.seen ? "Tu coach ya lo vio: queda así." : "Ya usaste tu corrección."}</p>}
    </QuickRow>);
}
