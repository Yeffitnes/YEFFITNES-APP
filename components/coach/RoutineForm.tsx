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
const blank = (): Item => ({ exercise_id: "", sets: 3, reps: "10", rest_seconds: 60 });
// 15-nov: cada ejercicio en su bloque (ejercicio arriba; series, repeticiones y descanso con su nombre debajo) y flechas para ordenar.
// Antes, en el celular los cuatro campos se amontonaban sin etiqueta y se veía desordenado.
export function RoutineForm({ exercises, items, onChange }: { exercises: Ex[]; items: Item[]; onChange: (i: Item[]) => void }) {
  const rows = items.length ? items : [blank()];
  const set = (i: number, p: Partial<Item>) => onChange(rows.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div style={{ marginTop: 18 }}>
      <div className="card-tag" style={{ marginBottom: 10 }}>Ejercicios de la rutina</div>
      {rows.map((it, i) => (
        <div key={i} className="rf-item">
          <div className="rf-top">
            <span className="rf-num">{i + 1}</span>
            <select aria-label={`Ejercicio ${i + 1}`} value={it.exercise_id} onChange={(e) => { const ex = exercises.find((x) => x.id === e.target.value), untouched = it.sets === 3 && it.reps === "10"; set(i, { exercise_id: e.target.value, ...(ex && untouched ? { sets: ex.suggSets ?? 3, reps: ex.suggReps ?? "10" } : {}) }); }}>
              <option value="">Elige un ejercicio…</option>{groups(exercises).map(([g, list]) => <optgroup key={g} label={g}>{list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="rf-grid">
            <label>Series<input aria-label={`Series del ejercicio ${i + 1}`} type="number" inputMode="numeric" min={1} max={20} value={it.sets} onChange={(e) => set(i, { sets: Number(e.target.value) })} /></label>
            <label>Reps<input aria-label={`Repeticiones del ejercicio ${i + 1}`} value={it.reps} maxLength={15} onChange={(e) => set(i, { reps: e.target.value })} title="Un número (10), un tiempo (30s) o un rango (8-12)." /></label>
            <label>Desc. (s)<input aria-label={`Descanso del ejercicio ${i + 1} en segundos`} type="number" inputMode="numeric" min={0} value={it.rest_seconds ?? ""} onChange={(e) => set(i, { rest_seconds: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            <div className="rf-tools">
              <button type="button" aria-label={`Subir el ejercicio ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" aria-label={`Bajar el ejercicio ${i + 1}`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" aria-label={`Quitar el ejercicio ${i + 1}`} disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, k) => k !== i))}>×</button>
            </div>
          </div>
        </div>))}
      <button type="button" className="ghost-btn" style={{ marginTop: 4 }} onClick={() => onChange([...rows, blank()])}>+ Agregar ejercicio</button>
      <p className="modal-cap-hint">En repeticiones puedes escribir un rango (8-12): si el cliente pasa de 12, la app le sugiere subir el peso y a ti te lo recomienda.</p>
    </div>
  );
}
