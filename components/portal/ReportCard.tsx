"use client";
import { useRef, useState } from "react";
import { localDate, useSubmitReport, useTodayReport, useVideoEnabled } from "@/lib/queries";
import { MAX_VIDEO_MB, MAX_VIDEO_SECONDS, UploadError, uploadVideo } from "@/lib/upload-video";
import { Icon } from "@/components/ui/Icon";
import { useVideoPick } from "@/components/ui/useVideoPick";
import { QuickRow } from "./QuickRow";
const UP_ERR: Record<string, string> = { too_many: "Ya subiste varios vídeos hoy. Inténtalo mañana.", not_allowed: "Tu plan no incluye el reporte diario.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa tu conexión y vuelve a intentarlo (se reanuda sola)." };
export function ReportCard({ clientId }: { clientId: string }) {
  const today = localDate(), rep = useTodayReport(clientId, today), enabled = useVideoEnabled(), submit = useSubmitReport(clientId, today);
  const [file, setFile] = useState<File | null>(null), [comment, setComment] = useState(""), [pct, setPct] = useState<number | null>(null), [err, setErr] = useState(""), [videoId, setVideoId] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const gallery = useRef<HTMLInputElement>(null), cam = useRef<HTMLInputElement>(null), tok = useRef(0), upP = useRef<Promise<string> | null>(null);
  // El vídeo empieza a subirse apenas queda listo: mientras escribes el comentario ya va viajando.
  const startUpload = (f: File) => {
    const t = ++tok.current; setVideoId(null); setPct(0); setErr("");
    const p = uploadVideo(f, (n) => { if (t === tok.current) setPct(n); }); upP.current = p;
    p.then((id) => { if (t === tok.current) { setVideoId(id); setPct(null); } })
      .catch((e) => { if (t === tok.current) { setPct(null); upP.current = null; setErr(e instanceof UploadError ? UP_ERR[e.code] ?? UP_ERR.upload_failed : UP_ERR.upload_failed); } });
  };
  const { pick, trimmer } = useVideoPick({ maxSeconds: MAX_VIDEO_SECONDS, maxMB: MAX_VIDEO_MB, onFile: (f) => { setFile(f); startUpload(f); }, onError: setErr });
  if (rep.isPending || enabled.isPending) return <div className="sk" style={{ height: 58, marginBottom: 12 }} />;
  if (rep.data) return (
    <QuickRow icon="check" tone="ok" title="Reporte enviado" sub={rep.data.seen ? "Tu coach ya lo vio" : "Tu coach lo verá pronto"}>{rep.data.comment ? <p className="qrow-quote">“{rep.data.comment}”</p> : null}</QuickRow>);
  const needVideo = enabled.data === true;
  const send = async () => {
    if (busy) return; setErr("");
    if (needVideo && !file && !videoId) return setErr("El vídeo es obligatorio: grábalo antes de enviar.");
    if (!comment.trim()) return setErr("El comentario es obligatorio: cuéntale a tu coach cómo te fue.");
    setBusy(true);
    try {
      let vid = videoId;
      if (needVideo && file && !vid) {
        if (upP.current) { try { vid = await upP.current; } catch { vid = null; } }
        if (!vid) { setPct(0); vid = await uploadVideo(file, setPct); }
        setVideoId(vid);
      }
      await submit.mutateAsync({ comment, videoId: vid });
    } catch (e) { if (e instanceof UploadError) setErr(UP_ERR[e.code] ?? UP_ERR.upload_failed); } finally { setBusy(false); setPct(null); }
  };
  return (
    <QuickRow icon="video" tone="todo" title="Reporte de hoy" sub={needVideo ? "Vídeo y comentario obligatorios" : "Comentario obligatorio"} chip="Pendiente">
      <div className="card-title" style={{ fontSize: 15 }}>Cuéntale a tu coach cómo te fue</div>
      {needVideo && <>
        <input ref={gallery} type="file" accept="video/*" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <input ref={cam} type="file" accept="video/*" capture="user" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="report-btn ghost" style={{ flex: 1, margin: 0 }} onClick={() => gallery.current?.click()} disabled={busy}><Icon name="video" size={16} /> {file ? "Cambiar vídeo" : "Elegir de la galería"}</button>
          <button type="button" className="report-btn ghost" style={{ flex: 1, margin: 0 }} onClick={() => cam.current?.click()} disabled={busy}>Grabar ahora</button>
        </div>
        {file && <p style={{ fontSize: 12, marginTop: 6, color: "var(--text-dim)" }}>Vídeo listo: {file.name.slice(0, 30)}{pct !== null ? " · subiendo…" : videoId ? " · subido" : ""}</p>}
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Máximo {MAX_VIDEO_SECONDS} segundos: si el vídeo es más largo, lo recortas aquí mismo. Muestra que entrenaste. Se borra solo después de que tu coach lo vea.</p>
      </>}
      <textarea aria-label="Comentario del día" maxLength={1000} placeholder="¿Cómo te sentiste? ¿Algo que tu coach deba saber? (obligatorio)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", minHeight: 70, marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
      {pct !== null && <div style={{ marginTop: 10 }} aria-live="polite"><div style={{ height: 6, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .3s" }} /></div><div style={{ fontSize: 12, marginTop: 4, color: "var(--text-dim)" }}>Subiendo vídeo… {pct}%. No cierres esta pantalla.</div></div>}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <button className="report-btn" style={{ marginTop: 12 }} disabled={busy} onClick={send}>{busy ? "Enviando…" : "Enviar reporte"}</button>
      {trimmer}
    </QuickRow>
  );
}
