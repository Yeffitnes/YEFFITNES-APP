"use client";
import { useState } from "react";
import { useSaveNutrition, type NutMeal, type NutPlan } from "@/lib/queries";
import { Modal } from "@/components/ui/Modal";
import { DAY_LONG, DAY_SHORT } from "@/lib/week";
const DEFAULT_MEALS: NutMeal[] = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena"].map((name) => ({ name, content: "", weekday: null }));
const TABS: { wd: number | null; label: string }[] = [{ wd: null, label: "Todos los días" }, ...DAY_SHORT.map((l, i) => ({ wd: i + 1, label: l[0] + l.slice(1).toLowerCase() }))];
// Calorías y macros son fijos del plan; las comidas se arman por día (o "todos los días"). Sirve para plantillas y para el plan de un cliente.
export function NutritionForm({ plan, clientId, onClose }: { plan: NutPlan | null; clientId?: string | null; onClose: () => void }) {
  const save = useSaveNutrition();
  const [v, setV] = useState({ name: plan?.name ?? "", kcal: plan?.kcal?.toString() ?? "", protein: plan?.protein?.toString() ?? "", carbs: plan?.carbs?.toString() ?? "", fat: plan?.fat?.toString() ?? "", notes: plan?.notes ?? "" });
  const [meals, setMeals] = useState<NutMeal[]>(plan?.meals.length ? plan.meals : DEFAULT_MEALS), [tab, setTab] = useState<number | null>(null), [copy, setCopy] = useState<number[] | null>(null), [err, setErr] = useState("");
  const idx = meals.map((m, i) => (m.weekday === tab ? i : -1)).filter((i) => i >= 0);
  const count = (wd: number | null) => meals.filter((m) => m.weekday === wd && (m.name.trim() || m.content.trim())).length;
  const setMeal = (i: number, p: Partial<NutMeal>) => { setMeals(meals.map((m, j) => (j === i ? { ...m, ...p } : m))); setErr(""); };
  const doCopy = () => {
    if (!copy?.length) return setCopy(null);
    const src = meals.filter((m) => m.weekday === tab && (m.name.trim() || m.content.trim()));
    setMeals([...meals.filter((m) => m.weekday === null || !copy.includes(m.weekday)), ...copy.flatMap((wd) => src.map((m) => ({ ...m, weekday: wd })))]); setCopy(null);
  };
  const submit = () => {
    if (!v.name.trim()) return setErr("Ponle un nombre al plan.");
    const used = meals.filter((m) => m.name.trim() || m.content.trim());
    if (!used.length) return setErr("Agrega al menos una comida.");
    if (used.some((m) => !m.content.trim())) return setErr("Cada comida necesita su contenido (o quítala).");
    for (const [k, lo, hi, label] of [["kcal", 500, 10000, "Calorías"], ["protein", 0, 1000, "Proteína"], ["carbs", 0, 1500, "Carbohidratos"], ["fat", 0, 600, "Grasas"]] as const) {
      const s = v[k].trim(); if (s && (!Number.isFinite(Number(s)) || Number(s) < lo || Number(s) > hi)) return setErr(`${label}: escribe un número entre ${lo} y ${hi}.`);
    }
    save.mutate({ id: plan?.id, clientId: plan ? plan.clientId : clientId ?? null, ...v, meals: used }, { onSuccess: onClose });
  };
  const F = (id: string, label: string, el: React.ReactNode) => <div className="modal-field"><label htmlFor={id}>{label}</label>{el}</div>;
  return (
    <Modal wide title={plan ? "Editar plan de nutrición" : clientId ? "Nuevo plan para este cliente" : "Nueva plantilla de nutrición"} sub={clientId || plan?.clientId ? "Solo cambia el plan de este cliente; la plantilla original no se toca." : "Las plantillas se copian al asignarlas: editar una después no cambia los planes ya asignados."} onClose={onClose}>
      {F("nn", "Nombre", <input id="nn" value={v.name} maxLength={120} onChange={(e) => { setV({ ...v, name: e.target.value }); setErr(""); }} placeholder="Ej. Alta en proteína — definición" />)}
      <div style={{ fontSize: 12, color: "var(--text-dim)", margin: "2px 0 6px" }}>Objetivo diario fijo (igual todos los días):</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {F("nk", "Calorías", <input id="nk" inputMode="numeric" value={v.kcal} onChange={(e) => setV({ ...v, kcal: e.target.value })} placeholder="kcal" />)}
        {F("np", "Proteína g", <input id="np" inputMode="numeric" value={v.protein} onChange={(e) => setV({ ...v, protein: e.target.value })} />)}
        {F("nc", "Carbos g", <input id="nc" inputMode="numeric" value={v.carbs} onChange={(e) => setV({ ...v, carbs: e.target.value })} />)}
        {F("nf", "Grasas g", <input id="nf" inputMode="numeric" value={v.fat} onChange={(e) => setV({ ...v, fat: e.target.value })} />)}
      </div>
      <div className="day-pill-row" role="tablist" aria-label="Día de las comidas" style={{ marginTop: 10 }}>{TABS.map((t) => (
        <button key={t.label} type="button" role="tab" aria-selected={tab === t.wd} className={`day-pill${tab === t.wd ? " active" : ""}`} onClick={() => { setTab(t.wd); setCopy(null); }} style={{ font: "inherit" }}>{t.label}{count(t.wd) ? ` · ${count(t.wd)}` : ""}</button>))}</div>
      <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 6px" }}>{tab === null ? "Las comidas de “Todos los días” se muestran cada día. Úsalas para lo que no cambia." : `Comidas solo del ${DAY_LONG[tab - 1].toLowerCase()} (se suman a las de “Todos los días”).`}</p>
      <div>{idx.map((i) => { const m = meals[i]; return (
        <div key={i} className="note-item">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input aria-label="Nombre de la comida" value={m.name} maxLength={80} onChange={(e) => setMeal(i, { name: e.target.value })} placeholder="Comida" style={{ flex: 1, height: 36, border: "1px solid var(--line)", borderRadius: 10, padding: "0 10px", fontWeight: 600 }} />
            <button type="button" className="ghost-btn" aria-label={`Quitar ${m.name || "comida"}`} onClick={() => setMeals(meals.filter((_, j) => j !== i))}>Quitar</button>
          </div>
          <textarea aria-label={`Contenido de ${m.name || "la comida"}`} value={m.content} maxLength={2000} onChange={(e) => setMeal(i, { content: e.target.value })} placeholder="Un alimento por línea. Ej.: 2 huevos revueltos / 1 arepa / fruta" style={{ width: "100%", minHeight: 64, marginTop: 8, border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 13 }} />
        </div>); })}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {idx.length < 12 && <button type="button" className="ghost-btn" onClick={() => setMeals([...meals, { name: "", content: "", weekday: tab }])}>+ Agregar comida</button>}
          {tab !== null && count(tab) > 0 && <button type="button" className="ghost-btn" onClick={() => setCopy(copy ? null : [])}>Copiar este día a…</button>}
        </div>
        {copy && tab !== null && <div style={{ marginTop: 10, padding: 12, border: "1px dashed var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>Copiar las comidas del {DAY_LONG[tab - 1].toLowerCase()} a (reemplaza las de esos días):</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{DAY_SHORT.map((l, i) => i + 1 !== tab && <label key={l} style={{ fontSize: 12.5, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={copy.includes(i + 1)} onChange={(e) => setCopy(e.target.checked ? [...copy, i + 1] : copy.filter((d) => d !== i + 1))} />{l[0] + l.slice(1).toLowerCase()}</label>)}</div>
          <button type="button" className="primary-btn" style={{ marginTop: 10 }} onClick={doCopy}>Copiar</button>
        </div>}
      </div>
      {F("nx", "Recomendaciones y notas (opcional)", <textarea id="nx" value={v.notes} maxLength={2000} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Agua, suplementos, qué hacer el fin de semana..." />)}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
    </Modal>
  );
}
