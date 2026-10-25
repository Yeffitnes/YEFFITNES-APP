"use client";
import { useState } from "react";
import { useDeleteNutrition, useNutritionTemplates, type NutPlan } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { NutritionForm } from "./NutritionForm";
export const macroLine = (p: { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }) => [p.kcal && `${p.kcal} kcal`, p.protein != null && `P ${p.protein} g`, p.carbs != null && `C ${p.carbs} g`, p.fat != null && `G ${p.fat} g`].filter(Boolean).join(" · ");
export function NutritionView() {
  const { data, isPending, isError, refetch } = useNutritionTemplates(), del = useDeleteNutrition(), [edit, setEdit] = useState<NutPlan | "new" | null>(null), [rm, setRm] = useState<NutPlan | null>(null);
  return (
    <div>
      <CatalogTop tab="nutricion" sub="Plantillas de nutrición. Al asignarlas a un cliente se copian y puedes ajustarlas solo para él." addLabel="Nueva plantilla" onAdd={() => setEdit("new")} />
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar las plantillas. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !data.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no tienes plantillas. Crea la primera (por ejemplo “Definición 1800 kcal”) y asígnala desde la ficha de cada cliente, en la pestaña Nutrición.</p></div>}
      <div style={{ display: "grid", gap: 14 }}>{data?.map((t) => (
        <div key={t.id} className="card">
          <div className="card-head"><div><div className="card-tag">{t.meals.length} comida{t.meals.length === 1 ? "" : "s"}</div><div className="card-title" style={{ fontSize: 15 }}>{t.name}</div>{macroLine(t) && <div className="card-meta">{macroLine(t)}</div>}</div>
            <div style={{ display: "flex", gap: 8 }}><button className="ghost-btn" onClick={() => setEdit(t)}>Editar</button><button className="ghost-btn" onClick={() => setRm(t)}>Eliminar</button></div></div>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>{t.meals.map((m) => m.name).join(" · ")}</p>
        </div>))}</div>
      {edit && <NutritionForm plan={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {rm && <Modal title="Eliminar plantilla" sub={`“${rm.name}” se elimina. Los planes ya asignados a clientes no cambian.`} onClose={() => setRm(null)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(null)}>Cancelar</button><button className="modal-btn primary" disabled={del.isPending} onClick={() => del.mutate(rm.id, { onSuccess: () => setRm(null) })}>{del.isPending ? "Eliminando…" : "Eliminar"}</button></div></Modal>}
    </div>
  );
}
