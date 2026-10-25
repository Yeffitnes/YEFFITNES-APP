"use client";
import { useState } from "react";
import { useSetPlanInfo, type PlanLevel, type TrainingPlan } from "@/lib/queries";
export const LEVELS: { key: PlanLevel; label: string }[] = [{ key: "beginner", label: "Principiante" }, { key: "intermediate", label: "Intermedio" }, { key: "advanced", label: "Avanzado" }];
// Lo que el cliente ve en "Mi plan": en qué nivel está y por qué, cuándo es la próxima revisión y una nota de Jeff para él.
export function PlanInfoForm({ plan, clientId, clientName }: { plan: TrainingPlan; clientId: string; clientName: string }) {
  const save = useSetPlanInfo(clientId), [open, setOpen] = useState(false);
  const [level, setLevel] = useState<PlanLevel | "">(plan.level ?? ""), [reason, setReason] = useState(plan.levelReason ?? ""), [review, setReview] = useState(plan.reviewOn ?? ""), [note, setNote] = useState(plan.coachNote ?? "");
  const filled = !!(plan.level || plan.reviewOn || plan.coachNote);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div><div className="card-tag" style={{ marginBottom: 2 }}>Lo que ve {clientName.split(" ")[0]}</div><div style={{ fontSize: 13, color: "var(--text-dim)" }}>{filled ? "Nivel, próxima revisión y nota del plan." : "Aún no definiste su nivel, revisión ni nota."}</div></div>
        <button className="ghost-btn" style={{ height: 34, padding: "0 13px", fontSize: 11.5 }} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Cerrar" : filled ? "Editar" : "Definir"}</button>
      </div>
      {open && <form style={{ marginTop: 14, display: "grid", gap: 12 }} onSubmit={(e) => { e.preventDefault(); save.mutate({ planId: plan.id, level, reason, reviewOn: review, note }, { onSuccess: () => setOpen(false) }); }}>
        <div className="modal-field"><label htmlFor="pl-level">Nivel</label>
          <select id="pl-level" value={level} onChange={(e) => setLevel(e.target.value as PlanLevel | "")}><option value="">Sin definir</option>{LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}</select></div>
        <div className="modal-field"><label htmlFor="pl-reason">¿Por qué está en este nivel? (lo lee el cliente)</label>
          <input id="pl-reason" maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Ya domina sentadilla y press; toca subir carga" /></div>
        <div className="modal-field"><label htmlFor="pl-review">Próxima revisión del plan</label><input id="pl-review" type="date" value={review} onChange={(e) => setReview(e.target.value)} /></div>
        <div className="modal-field"><label htmlFor="pl-note">Nota para {clientName.split(" ")[0]}</label>
          <textarea id="pl-note" maxLength={600} style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Vamos a subir carga poco a poco. Si sientes molestia en el hombro, avísame." /></div>
        <div><button className="primary-btn" type="submit" style={{ height: 38 }} disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
      </form>}
    </div>
  );
}
