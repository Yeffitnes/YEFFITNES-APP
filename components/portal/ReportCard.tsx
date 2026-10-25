"use client";
import { useRef, useState } from "react";
import { localDate, useSubmitReport, useTodayReport, useVideoEnabled } from "@/lib/queries";
import { MAX_VIDEO_MB, MAX_VIDEO_SECONDS, UploadError, uploadVideo, videoDuration } from "@/lib/upload-video";
import { Icon } from "@/components/ui/Icon";
const UP_ERR: Record<string, string> = { too_many: "Ya subiste varios vídeos hoy. Inténtalo mañana.", not_allowed: "Tu plan no incluye el reporte diario.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa tu conexión y vuelve a intentarlo (se reanuda sola)." };
export function ReportCard({ clientId }: { clientId: string }) {
  const today = localDate(), rep = useTodayReport(clientId, today), enabled = useVideoEnabled(), submit = useSubmitReport(clientId, today);
  const [file, setFile] = useState<File | null>(null), [comment, setComment] = useState(""), [pct, setPct] = useState<number | null>(null), [err, setErr] = useState(""), [videoId, setVideoId] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (rep.isPending || enabled.isPending) return <div className="sk" style={{ height: 120, marginBottom: 18 }} />;
  if (rep.data) return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-tag">Reporte de hoy</div><div className="card-title" style={{ fontSize: 15 }}><Icon name="check" size={16} style={{ marginRight: 6, color: "var(--accent)" }} />Enviado{rep.data.seen ? " · tu coach ya lo vio" : ""}</div>
      {rep.data.comment && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8, lineHeight: 1.55 }}>“{rep.data.comment}”</p>}
    </div>);
  const needVideo = enabled.data === true;
  const pick = async (f: File | null) => {
    setErr(""); setVideoId(null); if (!f) return setFile(null);
    if (!f.type.startsWith("video/")) return setErr("Elige un vídeo.");
    if (f.size > MAX_VIDEO_MB * 1048576) return setErr(`El vídeo pesa demasiado (máx. ${MAX_VIDEO_MB} MB). Grábalo más corto.`);
    const d = await videoDuration(f); if (d && d > MAX_VIDEO_SECONDS + 2) return setErr(`El vídeo dura ${Math.round(d)} s; el máximo es ${MAX_VIDEO_SECONDS} s.`);
    setFile(f);
  };
  const send = async () => {
    if (busy) return; setErr("");
    if (needVideo && !file && !videoId) return setErr("Graba tu vídeo corto de verificación antes de enviar.");
    setBusy(true);
    try {
      let vid = videoId;
      if (needVideo && file && !vid) { setPct(0); vid = await uploadVideo(file, setPct); setVideoId(vid); }
      await submit.mutateAsync({ comment, videoId: vid });
    } catch (e) { if (e instanceof UploadError) setErr(UP_ERR[e.code] ?? UP_ERR.upload_failed); } finally { setBusy(false); setPct(null); }
  };
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-tag">Reporte de hoy</div><div className="card-title" style={{ fontSize: 15 }}>Cuéntale a tu coach cómo te fue</div>
      {needVideo && <>
        <input ref={input} type="file" accept="video/*" capture="user" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <button type="button" className="report-btn ghost" style={{ marginTop: 12 }} onClick={() => input.current?.click()} disabled={busy}><Icon name="video" size={16} /> {file ? `${file.name.slice(0, 28)} · cambiar` : "Grabar vídeo de verificación"}</button>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Un vídeo corto (máx. {MAX_VIDEO_SECONDS} s) que muestre que entrenaste. Se borra solo después de que tu coach lo vea.</p>
      </>}
      <textarea aria-label="Comentario del día" maxLength={1000} placeholder="¿Cómo te sentiste? ¿Algo que tu coach deba saber?" value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", minHeight: 70, marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
      {pct !== null && <div style={{ marginTop: 10 }} aria-live="polite"><div style={{ height: 6, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .3s" }} /></div><div style={{ fontSize: 12, marginTop: 4, color: "var(--text-dim)" }}>Subiendo vídeo… {pct}%. No cierres esta pantalla.</div></div>}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <button className="report-btn" style={{ marginTop: 12 }} disabled={busy} onClick={send}>{busy ? "Enviando…" : "Enviar reporte"}</button>
    </div>
  );
}
