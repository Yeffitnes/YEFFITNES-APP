"use client";
import { useEffect, useState } from "react";
import "@/app/messages.css";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceId } from "@/components/Providers";
import { MAX_AUDIO_SECONDS, audioSupported, useAudioRecorder } from "@/components/ui/useAudioRecorder";
import { uploadCoachAudio, useSignedAudio } from "@/lib/messages";
import { useClientLogs, useReviewWorkout, type ClientLog } from "@/lib/queries";
import { Skeleton } from "@/components/ui/Modal";
const when = (iso: string) => { const d = Math.round((new Date(new Date().toDateString()).getTime() - new Date(iso + "T00:00:00").getTime()) / 86400000); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : new Date(iso + "T00:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }); };
export function RecentWorkouts({ clientId }: { clientId: string }) {
  const { data, isPending, isError, refetch } = useClientLogs(clientId);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-tag">Entrenamientos recientes</div>
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
    </div>
  );
}
export function Detail({ l, clientId, onSaved }: { l: ClientLog; clientId: string; onSaved?: () => void }) {
  const review = useReviewWorkout(clientId), ws = useWorkspaceId(), [c, setC] = useState(l.comment ?? "");
  const [audio, setAudio] = useState<{ blob: Blob; secs: number } | null>(null), [keep, setKeep] = useState(!!l.commentAudio), [aErr, setAErr] = useState(""), [saving, setSaving] = useState(false), [url, setUrl] = useState<string | null>(null);
  const rec = useAudioRecorder((blob, secs) => setAudio({ blob, secs }), setAErr), saved = useSignedAudio(keep ? l.commentAudio : null);
  useEffect(() => { if (!audio) { setUrl(null); return; } const u = URL.createObjectURL(audio.blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [audio]);
  const save = async () => {
    setAErr(""); setSaving(true);
    try { const path = audio ? await uploadCoachAudio(ws, clientId, audio.blob) : keep ? l.commentAudio : null; review.mutate({ id: l.id, comment: c, audio: path }, { onSuccess: () => { setAudio(null); onSaved?.(); } }); }
    catch { setAErr("No pudimos subir el audio. Inténtalo de nuevo."); } finally { setSaving(false); }
  };
  const byEx = new Map<string, ClientLog["sets"]>(); l.sets.forEach((s) => byEx.set(s.exercise, [...(byEx.get(s.exercise) ?? []), s]));
  return (
    <div style={{ marginTop: 10 }}>
      {!byEx.size && <p style={{ fontSize: 13, color: "var(--text-dim)" }}>No registró series.</p>}
      {Array.from(byEx.entries()).map(([ex, ss]) => (
        <div key={ex} className="ex-row-static"><span className="ex-dot" /><span style={{ fontSize: 13, flex: 1, fontWeight: 600 }}>{ex}</span>
          <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{ss.sort((a, b) => a.n - b.n).map((s) => `${s.reps ?? "–"}${s.weight != null ? `×${s.weight} kg` : ""}`).join(" · ")}</span></div>))}
      {l.note && <p style={{ fontSize: 13, margin: "12px 0 0", padding: 10, background: "var(--surface)", borderRadius: 10 }}><b>Comentario del cliente:</b> {l.note}</p>}
      {l.completed && (
        <div className="modal-field"><label>Tu comentario para el cliente</label>
          <textarea value={c} onChange={(e) => setC(e.target.value)} placeholder="Ej. Muy bien. Sube 2,5 kg en press banca la próxima semana." />
          {rec.recording && <div className="mb-rec" role="status"><i aria-hidden /><b>Grabando</b><span>{Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, "0")} / {Math.floor(MAX_AUDIO_SECONDS / 60)}:00</span><button type="button" onClick={() => rec.stop(true)}>Cancelar</button><button type="button" className="go" onClick={() => rec.stop()}><Icon name="stop" size={13} /> Terminar</button></div>}
          {!rec.recording && audio && url && <div className="mb-attach mb-attach-audio"><Icon name="mic" size={14} /><audio controls src={url} /><button type="button" aria-label="Quitar audio" onClick={() => setAudio(null)}><Icon name="close" size={14} /></button></div>}
          {!rec.recording && !audio && keep && saved.data && <div className="mb-attach mb-attach-audio"><Icon name="mic" size={14} /><audio controls src={saved.data} /><button type="button" aria-label="Quitar audio" onClick={() => setKeep(false)}><Icon name="close" size={14} /></button></div>}
          {aErr && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{aErr}</p>}
          <div className="modal-actions" style={{ gap: 8, flexWrap: "wrap" }}>
            {audioSupported() && <button type="button" className="modal-btn ghost" disabled={rec.recording || saving} onClick={() => { setKeep(false); void rec.start(); }}><Icon name="mic" size={14} /> {audio || keep ? "Grabar otro audio" : "Dejar un audio"}</button>}
            <button className="modal-btn primary" disabled={review.isPending || saving || rec.recording} onClick={() => void save()}>{review.isPending || saving ? "Guardando…" : l.seen ? "Actualizar" : "Guardar y marcar revisado"}</button></div></div>)}
    </div>
  );
}
