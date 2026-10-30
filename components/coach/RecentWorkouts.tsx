"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import "@/app/messages.css";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceId } from "@/components/Providers";
import { MAX_AUDIO_SECONDS, audioSupported, useAudioRecorder } from "@/components/ui/useAudioRecorder";
import { uploadCoachAudio, useSignedAudio, useSignedImage } from "@/lib/messages";
import { db } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/image";
import { useBackgroundUpload } from "@/lib/upload-manager";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { notifyFeedback, useClientLogs, useReviewWorkout, useSetWeight, useTrainingPlans, type ClientLog } from "@/lib/queries";
import { advise, nextWeight, rangeText, repTarget } from "@/lib/progression";
import { Skeleton } from "@/components/ui/Modal";
const when = (iso: string) => { const d = Math.round((new Date(new Date().toDateString()).getTime() - new Date(iso + "T00:00:00").getTime()) / 86400000); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : new Date(iso + "T00:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }); };
export function RecentWorkouts({ clientId, title = "Entrenamientos recientes", skipDate, collapsible }: { clientId: string; title?: string; skipDate?: string; collapsible?: boolean }) {
  const all = useClientLogs(clientId), { isPending, isError, refetch } = all, data = all.data?.filter((l) => l.date !== skipDate);
  const [open, setOpen] = useState<string | null>(null), [shown, setShown] = useState(true), pend = data?.filter((l) => l.completed && !l.seen).length ?? 0;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      {collapsible ? <button type="button" className="rw-head" aria-expanded={shown} onClick={() => setShown(!shown)}><span className="card-tag" style={{ marginBottom: 0 }}>{title}</span>{pend > 0 && <span className="today-count">{pend} sin revisar</span>}<span className="rw-chev" aria-hidden>{shown ? "Ocultar" : "Ver"}</span></button> : <div className="card-tag">{title}</div>}
      {shown && <>
      {isPending && <Skeleton rows={2} />}
      {isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los entrenamientos. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
      {data && !data.length && <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 8 }}>Aún no hay entrenamientos registrados. Aparecerán aquí cuando el cliente complete su primera rutina.</p>}
      {data?.map((l) => (
        <div key={l.id} style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
          <button onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} style={{ all: "unset", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", width: "100%", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>{when(l.date)} · {l.routine ?? "Entrenamiento"}</span>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{l.sets.length} series{l.effort ? ` · esfuerzo ${l.effort}/10` : ""}</span>
            <span className={`client-status ${l.completed && !l.seen ? "review" : "ok"}`}>{!l.completed ? "En curso" : l.seen ? "Revisado" : "Sin revisar"}</span>
          </button>
          {open === l.id && <Detail l={l} clientId={clientId} />}
        </div>))}
      </>}
    </div>
  );
}
// Sugerencia de peso por ejercicio según las repeticiones que puso Jeff (rango o fijas) (lib/progression.ts). Jeff decide: un toque cambia el peso del plan.
function WeightAdvice({ clientId, sets, effort }: { clientId: string; sets: ClientLog["sets"]; effort: number | null }) {
  const plans = useTrainingPlans(clientId), setW = useSetWeight(clientId), [done, setDone] = useState<number | null>(null);
  const itemId = sets.find((x) => x.itemId)?.itemId;
  const item = itemId ? plans.data?.flatMap((p) => p.days.flatMap((d) => d.items)).find((i) => i.id === itemId) : undefined;
  const range = repTarget(item?.reps); if (!item || !range) return null;   // rango (8-12) o fijas (10), desde el 29-oct
  const work = sets.filter((x) => !x.warmup), a = advise(range, work.map((x) => x.reps), effort);
  if (a.kind === "keep") return null;
  const used = work.map((x) => x.weight).filter((w): w is number => w != null), base = used.length ? Math.max(...used) : item.weight, next = nextWeight(base, a.kind);
  return (
    <div className={`wadv ${a.kind}`}>
      <Icon name={a.kind === "up" ? "up" : "down"} size={14} />
      <div className="wadv-txt"><b>{a.kind === "up" ? "Recomendado: subir el peso" : "Recomendado: bajar el peso"}</b><span>{a.reason} {range.fixed ? "Pedido" : "Rango"}: {rangeText(range)} repeticiones.{item.weight != null ? ` En el plan: ${item.weight} kg.` : ""}</span></div>
      {done != null ? <span className="wadv-ok">Plan actualizado: {String(done).replace(".", ",")} kg</span>
        : next != null && <button type="button" className="pd-btn primary" disabled={setW.isPending} onClick={() => setW.mutate({ itemId: item.id, weight: next }, { onSuccess: () => setDone(next) })}>{a.kind === "up" ? "Subir" : "Bajar"} a {String(next).replace(".", ",")} kg</button>}
    </div>
  );
}
export function Detail({ l, clientId, onSaved }: { l: ClientLog; clientId: string; onSaved?: () => void }) {
  const review = useReviewWorkout(clientId), ws = useWorkspaceId(), upload = useBackgroundUpload(), qc = useQueryClient(), [c, setC] = useState(l.comment ?? "");
  const [audio, setAudio] = useState<{ blob: Blob; secs: number } | null>(null), [keep, setKeep] = useState(!!l.commentAudio), [aErr, setAErr] = useState(""), [saving, setSaving] = useState(false), [url, setUrl] = useState<string | null>(null);
  // 0041 (pedido de Cristian, 29-oct): la respuesta también puede llevar una FOTO o un VÍDEO (una corrección de técnica, por ejemplo).
  const [img, setImg] = useState<File | null>(null), [keepImg, setKeepImg] = useState(!!l.commentImage), [vid, setVid] = useState<File | null>(null), [keepVid, setKeepVid] = useState(!!l.commentVideo), [watch, setWatch] = useState(false);
  const imgIn = useRef<HTMLInputElement>(null), vidIn = useRef<HTMLInputElement>(null);
  const rec = useAudioRecorder((blob, secs) => setAudio({ blob, secs }), setAErr), saved = useSignedAudio(keep ? l.commentAudio : null), savedImg = useSignedImage(keepImg && !img ? l.commentImage ?? null : null);
  useEffect(() => { if (!audio) { setUrl(null); return; } const u = URL.createObjectURL(audio.blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [audio]);
  const [imgUrl, setImgUrl] = useState<string | null>(null), [vidUrl, setVidUrl] = useState<string | null>(null);
  useEffect(() => { if (!img) { setImgUrl(null); return; } const u = URL.createObjectURL(img); setImgUrl(u); return () => URL.revokeObjectURL(u); }, [img]);
  useEffect(() => { if (!vid) { setVidUrl(null); return; } const u = URL.createObjectURL(vid); setVidUrl(u); return () => URL.revokeObjectURL(u); }, [vid]);
  const pickImg = (f: File | null) => { setAErr(""); if (!f) return; if (!f.type.startsWith("image/")) return setAErr("Elige una foto."); setImg(f); setKeepImg(false); };
  const pickVid = async (f: File | null) => {
    setAErr(""); if (!f) return; if (!f.type.startsWith("video/")) return setAErr("Elige un vídeo.");
    if (f.size > MAX_COACH_VIDEO_MB * 1024 * 1024) return setAErr(`El vídeo pesa más de ${MAX_COACH_VIDEO_MB / 1000} GB.`);
    const d = await videoDuration(f); if (d != null && d > MAX_COACH_VIDEO_SECONDS) return setAErr(`El vídeo dura más de ${MAX_COACH_VIDEO_SECONDS / 60} minutos.`);
    setVid(f); setKeepVid(false);
  };
  const save = async () => {
    setAErr(""); setSaving(true);
    try {
      const path = audio ? await uploadCoachAudio(ws, clientId, audio.blob) : keep ? l.commentAudio : null;
      let imagePath = keepImg ? l.commentImage ?? null : null;
      if (img) { const blob = await compressImage(img); imagePath = `${ws}/${clientId}/${crypto.randomUUID()}.jpg`; const up = await db().storage.from("message-images").upload(imagePath, blob, { contentType: "image/jpeg" }); if (up.error) throw up.error; }
      const keepV = keepVid ? l.commentVideo ?? null : null, comment = c;
      review.mutate({ id: l.id, comment, audio: path, image: imagePath, video: keepV, media: true, notify: !vid }, { onSuccess: () => {
        // El vídeo sube en segundo plano (puede ser largo); al terminar se engancha a la respuesta y le llega la notificación al cliente.
        if (vid) upload({ file: vid, label: "Vídeo de tu respuesta", opts: { purpose: "message", clientId }, finish: async (videoId, q) => {
          const { error } = await db().rpc("review_workout", { p_log: l.id, p_comment: comment, p_audio: path, p_image: imagePath, p_video: videoId, p_media: true }); if (error) throw error;
          notifyFeedback(l.id); void q.invalidateQueries({ queryKey: ["client-logs", clientId] });
        } });
        setAudio(null); setImg(null); setVid(null); onSaved?.(); void qc.invalidateQueries({ queryKey: ["advice-feed"] });
      } });
    } catch { setAErr("No pudimos subir lo que adjuntaste. Inténtalo de nuevo."); } finally { setSaving(false); }
  };
  const byEx = new Map<string, ClientLog["sets"]>(); l.sets.forEach((s) => byEx.set(s.exercise, [...(byEx.get(s.exercise) ?? []), s]));
  const has = l.comment || l.commentAudio || l.commentImage || l.commentVideo;
  return (
    <div style={{ marginTop: 10 }}>
      {!byEx.size && <p style={{ fontSize: 13, color: "var(--text-dim)" }}>No registró series.</p>}
      {Array.from(byEx.entries()).map(([ex, ss]) => (
        <div key={ex}>
          <div className="ex-row-static"><span className="ex-dot" /><span style={{ fontSize: 13, flex: 1, fontWeight: 600 }}>{ex}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{ss.sort((a, b) => a.n - b.n).map((s) => `${s.reps ?? "–"}${s.weight != null ? `×${s.weight} kg` : ""}`).join(" · ")}</span></div>
          <WeightAdvice clientId={clientId} sets={ss} effort={l.effort} />
        </div>))}
      {l.note && <p style={{ fontSize: 13, margin: "12px 0 0", padding: 10, background: "var(--surface)", borderRadius: 10 }}><b>Comentario del cliente:</b> {l.note}</p>}
      {l.completed && (
        <div className="modal-field"><label>Tu respuesta para el cliente{has && <span style={{ fontWeight: 600, marginLeft: 8, color: l.clientSaw ? "var(--text)" : "var(--text-faint)" }}>{l.clientSaw ? "· El cliente ya la vio" : "· El cliente aún no la ve"}</span>}</label>
          <textarea value={c} onChange={(e) => setC(e.target.value)} placeholder="Ej. Muy bien. Sube 2,5 kg en press banca la próxima semana." />
          <input ref={imgIn} type="file" accept="image/*" hidden onChange={(e) => { pickImg(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <input ref={vidIn} type="file" accept="video/*" hidden onChange={(e) => { void pickVid(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {rec.recording && <div className="mb-rec" role="status"><i aria-hidden /><b>Grabando</b><span>{Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, "0")} / {Math.floor(MAX_AUDIO_SECONDS / 60)}:00</span><button type="button" onClick={() => rec.stop(true)}>Cancelar</button><button type="button" className="go" onClick={() => rec.stop()}><Icon name="stop" size={13} /> Terminar</button></div>}
          {!rec.recording && audio && url && <div className="mb-attach mb-attach-audio"><Icon name="mic" size={14} /><audio controls src={url} /><button type="button" aria-label="Quitar audio" onClick={() => setAudio(null)}><Icon name="close" size={14} /></button></div>}
          {!rec.recording && !audio && keep && saved.data && <div className="mb-attach mb-attach-audio"><Icon name="mic" size={14} /><audio controls src={saved.data} /><button type="button" aria-label="Quitar audio" onClick={() => setKeep(false)}><Icon name="close" size={14} /></button></div>}
          {(imgUrl || savedImg.data) && <div className="fb-att"><img src={imgUrl ?? savedImg.data!} alt="Foto de tu respuesta" /><button type="button" aria-label="Quitar foto" onClick={() => { setImg(null); setKeepImg(false); }}><Icon name="close" size={14} /></button></div>}
          {vidUrl && <div className="fb-att"><video src={vidUrl} controls playsInline muted preload="metadata" /><button type="button" aria-label="Quitar vídeo" onClick={() => setVid(null)}><Icon name="close" size={14} /></button></div>}
          {!vid && keepVid && <div className="fb-att fb-att-row"><button type="button" className="ghost-btn" onClick={() => setWatch(true)}><Icon name="play" size={12} /> Ver tu vídeo</button><button type="button" aria-label="Quitar vídeo" onClick={() => setKeepVid(false)}><Icon name="close" size={14} /></button></div>}
          {aErr && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{aErr}</p>}
          <p className="fb-keep-note">La foto, el vídeo y el audio de tu respuesta se borran solos 7 días después; el texto queda en la ficha.</p>
          <div className="modal-actions" style={{ gap: 8, flexWrap: "wrap" }}>
            {audioSupported() && <button type="button" className="modal-btn ghost" disabled={rec.recording || saving} onClick={() => { setKeep(false); void rec.start(); }}><Icon name="mic" size={14} /> {audio || keep ? "Otro audio" : "Audio"}</button>}
            <button type="button" className="modal-btn ghost" disabled={rec.recording || saving} onClick={() => imgIn.current?.click()}><Icon name="image" size={14} /> {img || keepImg ? "Otra foto" : "Foto"}</button>
            <button type="button" className="modal-btn ghost" disabled={rec.recording || saving} onClick={() => vidIn.current?.click()}><Icon name="video" size={14} /> {vid || keepVid ? "Otro vídeo" : "Vídeo"}</button>
            <button className="modal-btn primary" disabled={review.isPending || saving || rec.recording} onClick={() => void save()}>{review.isPending || saving ? "Guardando…" : l.seen ? "Actualizar" : "Guardar y marcar revisado"}</button></div></div>)}
      {watch && <BunnyModal param={`feedback=${l.id}`} title="Tu vídeo de respuesta" onClose={() => setWatch(false)} />}
    </div>
  );
}
