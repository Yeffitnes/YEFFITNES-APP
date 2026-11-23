"use client";
import { useState } from "react";
import { useAssignNutrition, useClientNutrition, useDeleteNutrition, useNutritionTemplates } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { NutritionForm } from "./NutritionForm";
import { DAY_LONG } from "@/lib/week";
import { Guide } from "@/components/portal/Guide";
export function NutritionTab({ clientId, clientName, hasFeature }: { clientId: string; clientName: string; hasFeature: boolean }) {
  const cur = useClientNutrition(clientId), tpls = useNutritionTemplates(), assign = useAssignNutrition(), del = useDeleteNutrition();
  const [pick, setPick] = useState(""), [edit, setEdit] = useState<"plan" | "new" | null>(null), [rm, setRm] = useState(false), first = clientName.split(" ")[0] || "el cliente";
  if (cur.isPending || tpls.isPending) return <Skeleton rows={2} />;
  const p = cur.data;
  return (
    <div className="tp">
      {!hasFeature && <div className="private-warning">El plan de {first} no incluye nutrición: aunque asignes un plan, no lo verá hasta que cambies su plan.</div>}
      {/* 22-nov: cabecera oscura con las cifras del plan y botones en su propia fila (antes "Editar" y "Quitar" se salían junto al
          nombre en el celular); comidas en tarjetas por día. */}
      <section className="tp-hero nt-hero">
        <div className="tp-eyebrow">Plan de nutrición</div>
        {p ? (<>
          <div className="tp-hero-row">
            <h2 className="tp-hero-name" style={{ minWidth: 0 }}>{p.name}</h2>
            <div className="tp-hero-acts"><button className="tp-glass" onClick={() => setEdit("plan")}>Editar</button><button className="tp-glass danger" onClick={() => setRm(true)}>Quitar</button></div>
          </div>
          {(p.kcal || p.protein != null || p.carbs != null || p.fat != null) && <div className="tp-stats">
            <div><b>{p.kcal ? p.kcal.toLocaleString("es-CO") : "—"}</b><span>kcal al día</span></div>
            <div><b>{p.protein ?? "—"}<small> g</small></b><span>proteína</span></div>
            <div><b>{p.carbs ?? "—"}<small> g</small></b><span>carbohidratos</span></div>
            <div><b>{p.fat ?? "—"}<small> g</small></b><span>grasas</span></div>
          </div>}
        </>) : (
          <div className="tp-empty">
            <span className="tp-stage" aria-hidden><Guide size={86} pose="hydrate" dir="right" /></span>
            <div style={{ minWidth: 0 }}><h2 className="tp-hero-name">{first} no tiene plan de nutrición</h2>
              <p className="tp-hero-sub">Asígnale una plantilla de tu catálogo o crea uno solo para esta persona.</p></div>
          </div>
        )}
      </section>
      {p && <div className="card nt-meals">
        {[null, 1, 2, 3, 4, 5, 6, 7].map((wd) => { const ms = p.meals.filter((m) => m.weekday === wd); return ms.length ? (
          <div key={wd ?? 0} className="nt-day"><div className="card-tag">{wd === null ? "Todos los días" : DAY_LONG[wd - 1]}</div>
            <div className="nt-list">{ms.map((m, i) => <div key={i} className="nt-meal"><span className="nt-n">{i + 1}</span><div><b>{m.name}</b><p>{m.content}</p></div></div>)}</div></div>) : null; })}
        {p.notes && <div className="nt-note"><b>Indicaciones</b><p>{p.notes}</p></div>}
      </div>}
      <div className="card nt-assign">
        <div className="card-tag">{p ? "Reemplazar por otra plantilla" : "Asignar plantilla"}</div>
        <div className="nt-assign-row">
          <select aria-label="Plantilla" value={pick} onChange={(e) => setPick(e.target.value)}>
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
