"use client";
// Metas de hábitos de UN cliente (pedido de Cristian, 12-nov): por defecto la general de Jeff; aquí puede ponerle otra (más o menos
// pasos, por ejemplo) o marcar que un hábito no aplica para él. Se guarda al salir de la casilla o con Enter.
import { useState } from "react";
import { useClientGoals, useHabitDefs, useSetClientGoal } from "@/lib/extras";
import { goalText, type HabitDef } from "@/lib/habits";
import { useFocusAnchor } from "@/lib/focus";

export function ClientHabitGoals({ clientId, first }: { clientId: string; first: string }) {
  const defs = useHabitDefs(), goals = useClientGoals();
  useFocusAnchor("metas-habitos");
  if (defs.isPending || goals.isPending) return <div className="card" style={{ marginBottom: 16 }}><div className="sk" style={{ height: 90 }} /></div>;
  if (!defs.data?.ready) return null;   // sin la 0052
  const list = defs.data.defs.filter((d) => d.active);
  if (!list.length) return null;
  return (
    <div className="card hb-card" id="metas-habitos" style={{ marginBottom: 16 }}>
      <div className="card-tag">Metas de hábitos</div>
      <div className="card-title" style={{ fontSize: 15 }}>Las de {first}</div>
      <p className="plans-due-sub">Vacío = la meta general. Cambia la de {first} si necesita más o menos, o quítale un hábito que no aplica.</p>
      {list.map((d) => <GoalRow key={d.id} d={d} clientId={clientId} first={first} g={goals.data?.find((x) => x.clientId === clientId && x.habitId === d.id)} />)}
    </div>
  );
}
const show = (n: number | null | undefined) => (n == null ? "" : n >= 1000 ? Math.round(n).toLocaleString("es-CO") : String(n).replace(".", ","));
function GoalRow({ d, clientId, first, g }: { d: HabitDef; clientId: string; first: string; g?: { goal: number | null; off: boolean } }) {
  const set = useSetClientGoal(), [v, setV] = useState(show(g?.goal)), off = !!g?.off;
  const commit = () => {
    const t = v.trim(), n = t === "" ? null : Number(t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    if (n !== null && (!Number.isFinite(n) || n <= 0 || (d.kind === "check" && n > 7))) { setV(show(g?.goal)); return; }
    if (n === (g?.goal ?? null)) return;
    set.mutate({ clientId, habitId: d.id, goal: n, off });
  };
  return (
    <div className={`hb-def${off ? " off" : ""}`}>
      <div className="hb-def-main"><b>{d.name}</b><small>General: {d.goal != null ? goalText({ ...d, goal: d.goal }) : "sin meta"}</small></div>
      <label className="hb-goal"><span>Meta de {first}</span>
        <input className="hb-in" inputMode="decimal" value={off ? "" : v} disabled={off} placeholder={show(d.goal) || "—"} aria-label={`Meta de ${d.name} para ${first}`} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        <i>{d.kind === "check" ? "días/sem." : d.unit}</i></label>
      <div className="hb-def-acts">
        {!off && g?.goal != null && <button type="button" className="wadv-swap" onClick={() => { setV(""); set.mutate({ clientId, habitId: d.id, goal: null, off: false }); }}>Usar la general</button>}
        <button type="button" className={`pd-btn hb-toggle${off ? "" : " on"}`} aria-pressed={!off} disabled={set.isPending} onClick={() => set.mutate({ clientId, habitId: d.id, goal: off ? null : g?.goal ?? null, off: !off })}>{off ? "No aplica" : "Aplica"}</button>
      </div>
    </div>
  );
}
