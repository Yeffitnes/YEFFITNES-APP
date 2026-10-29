"use client";
import { MUSCLES, muscleOf } from "@/lib/exmeta";
type Ex = { id: string; name: string; muscle?: string | null; suggSets?: number | null; suggReps?: string | null };
// Al armar una rutina los ejercicios salen agrupados por músculo (28-oct), en el orden estándar.
function groups(exercises: Ex[]) {
  const m = new Map<string, Ex[]>(); exercises.forEach((e) => { const k = muscleOf(e.muscle) ?? "Sin músculo"; m.set(k, [...(m.get(k) ?? []), e]); });
  const order = [...MUSCLES, ...Array.from(m.keys()).filter((k) => !(MUSCLES as readonly string[]).includes(k)).sort()];
  return order.filter((k) => m.has(k)).map((k) => [k, m.get(k)!.sort((a, b) => a.name.localeCompare(b.name))] as const);
}
type Item = { exercise_id: string; sets: number; reps: string; rest_seconds: number | null };
const F = { height: 38, borderRadius: 10, border: "1px solid var(--line)", padding: "0 10px", fontSize: 13, background: "#fff", minWidth: 0 } as const;
const blank = (): Item => ({ exercise_id: "", sets: 3, reps: "10", rest_seconds: 60 });
export function RoutineForm({ exercises, items, onChange }: { exercises: Ex[]; items: Item[]; onChange: (i: Item[]) => void }) {
  const rows = items.length ? items : [blank()];
  const set = (i: number, p: Partial<Item>) => onChange(rows.map((it, k) => (k === i ? { ...it, ...p } : it)));
  return (
    <div style={{ marginTop: 18 }}>
      <div className="card-tag" style={{ marginBottom: 10 }}>Ejercicios de la rutina</div>
      {rows.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select aria-label="Ejercicio" value={it.exercise_id} onChange={(e) => { const ex = exercises.find((x) => x.id === e.target.value), untouched = it.sets === 3 && it.reps === "10"; set(i, { exercise_id: e.target.value, ...(ex && untouched ? { sets: ex.suggSets ?? 3, reps: ex.suggReps ?? "10" } : {}) }); }} style={{ ...F, flex: "2 1 160px" }}>
            <option value="">Elige un ejercicio…</option>{groups(exercises).map(([g, list]) => <optgroup key={g} label={g}>{list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
          </select>
          <input aria-label="Series" type="number" min={1} value={it.sets} onChange={(e) => set(i, { sets: Number(e.target.value) })} style={{ ...F, width: 64 }} title="Series" />
          <input aria-label="Repeticiones" value={it.reps} onChange={(e) => set(i, { reps: e.target.value })} style={{ ...F, width: 80 }} title="Repeticiones: un número (10), un tiempo (30s) o un rango (8-12). Con rango, la app le dice al cliente cuándo subir o bajar el peso y a ti te lo recomienda." />
          <input aria-label="Descanso en segundos" type="number" min={0} value={it.rest_seconds ?? ""} onChange={(e) => set(i, { rest_seconds: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...F, width: 76 }} title="Descanso (s)" />
          <button type="button" aria-label="Quitar ejercicio" onClick={() => onChange(rows.filter((_, k) => k !== i))} disabled={rows.length === 1} style={{ ...F, cursor: "pointer", width: 38 }}>×</button>
        </div>))}
      <p className="modal-cap-hint">Series · repeticiones · descanso en segundos. En repeticiones puedes escribir un rango (8-12): si el cliente pasa de 12, la app le sugiere subir el peso y a ti te lo recomienda en su revisión.</p>
      <button type="button" className="ghost-btn" style={{ marginTop: 8 }} onClick={() => onChange([...rows, blank()])}>+ Agregar ejercicio</button>
    </div>
  );
}
