"use client";
import { useState } from "react";
import { useAssignNutrition, useClientNutrition, useDeleteNutrition, useNutritionTemplates } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { NutritionForm } from "./NutritionForm";
import { macroLine } from "./NutritionView";
import { DAY_LONG } from "@/lib/week";
export function NutritionTab({ clientId, clientName, hasFeature }: { clientId: string; clientName: string; hasFeature: boolean }) {
  const cur = useClientNutrition(clientId), tpls = useNutritionTemplates(), assign = useAssignNutrition(), del = useDeleteNutrition();
  const [pick, setPick] = useState(""), [edit, setEdit] = useState<"plan" | "new" | null>(null), [rm, setRm] = useState(false), first = clientName.split(" ")[0] || "el cliente";
  if (cur.isPending || tpls.isPending) return <Skeleton rows={2} />;
  const p = cur.data;
  return (
    <div>
      {!hasFeature && <div className="private-warning">El plan de {first} no incluye nutrición: aunque asignes un plan, no lo verá hasta que cambies su plan.</div>}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-tag">Plan actual</div>
        {!p && <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "10px 0 0" }}>{first} no tiene plan de nutrición. Asigna una plantilla o crea un plan solo para esta persona.</p>}
        {p && <>
          <div className="card-head" style={{ marginTop: 6 }}><div><div className="card-title" style={{ fontSize: 15 }}>{p.name}</div>{macroLine(p) && <div className="card-meta">{macroLine(p)}</div>}</div>
            <div style={{ display: "flex", gap: 8 }}><button className="ghost-btn" onClick={() => setEdit("plan")}>Editar</button><button className="ghost-btn" onClick={() => setRm(true)}>Quitar</button></div></div>
          {[null, 1, 2, 3, 4, 5, 6, 7].map((wd) => { const ms = p.meals.filter((m) => m.weekday === wd); return ms.length ? (
            <div key={wd ?? 0} style={{ marginTop: 12 }}><div className="card-tag">{wd === null ? "Todos los días" : DAY_LONG[wd - 1]}</div>
              {ms.map((m, i) => <div key={i} className="note-item"><div className="note-date">{m.name}</div><div className="note-text" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div></div>)}</div>) : null; })}
          {p.notes && <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 10, whiteSpace: "pre-wrap" }}>{p.notes}</p>}
        </>}
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-tag">{p ? "Reemplazar por otra plantilla" : "Asignar plantilla"}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <select aria-label="Plantilla" value={pick} onChange={(e) => setPick(e.target.value)} style={{ height: 38, borderRadius: 11, border: "1px solid var(--line)", padding: "0 12px", fontSize: 13, flex: 1, minWidth: 180 }}>
            <option value="">{tpls.data?.length ? "Elige una plantilla…" : "No hay plantillas todavía"}</option>{tpls.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="primary-btn" disabled={!pick || assign.isPending} onClick={() => assign.mutate({ templateId: pick, clientId }, { onSuccess: () => setPick("") })}>{assign.isPending ? "Asignando…" : "Asignar"}</button>
          <button className="ghost-btn" onClick={() => setEdit("new")}>Crear desde cero</button>
        </div>
      </div>
      {edit === "plan" && p && <NutritionForm plan={p} onClose={() => setEdit(null)} />}
      {edit === "new" && <NutritionForm plan={null} clientId={clientId} onClose={() => setEdit(null)} />}
      {rm && p && <Modal title="Quitar plan de nutrición" sub={`${first} dejará de ver este plan.`} onClose={() => setRm(false)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(false)}>Cancelar</button><button className="modal-btn primary" disabled={del.isPending} onClick={() => del.mutate(p.id, { onSuccess: () => setRm(false) })}>{del.isPending ? "Quitando…" : "Quitar"}</button></div></Modal>}
    </div>
  );
}
