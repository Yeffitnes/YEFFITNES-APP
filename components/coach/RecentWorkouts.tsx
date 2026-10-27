"use client";
import { useState } from "react";
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
export function Detail({ l, clientId }: { l: ClientLog; clientId: string }) {
  const review = useReviewWorkout(clientId), [c, setC] = useState(l.comment ?? "");
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
          <div className="modal-actions" style={{ maxWidth: 320 }}><button className="modal-btn primary" disabled={review.isPending} onClick={() => review.mutate({ id: l.id, comment: c })}>{review.isPending ? "Guardando…" : l.seen ? "Actualizar" : "Guardar y marcar revisado"}</button></div></div>)}
    </div>
  );
}
