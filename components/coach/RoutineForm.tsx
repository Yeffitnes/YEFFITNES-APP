"use client";
type Ex = { id: string; name: string };
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
          <select aria-label="Ejercicio" value={it.exercise_id} onChange={(e) => set(i, { exercise_id: e.target.value })} style={{ ...F, flex: "2 1 160px" }}>
            <option value="">Elige un ejercicio…</option>{exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input aria-label="Series" type="number" min={1} value={it.sets} onChange={(e) => set(i, { sets: Number(e.target.value) })} style={{ ...F, width: 64 }} title="Series" />
          <input aria-label="Repeticiones" value={it.reps} onChange={(e) => set(i, { reps: e.target.value })} style={{ ...F, width: 80 }} title="Repeticiones (ej. 10 o 30s)" />
          <input aria-label="Descanso en segundos" type="number" min={0} value={it.rest_seconds ?? ""} onChange={(e) => set(i, { rest_seconds: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...F, width: 76 }} title="Descanso (s)" />
          <button type="button" aria-label="Quitar ejercicio" onClick={() => onChange(rows.filter((_, k) => k !== i))} disabled={rows.length === 1} style={{ ...F, cursor: "pointer", width: 38 }}>×</button>
        </div>))}
      <p className="modal-cap-hint">Series · repeticiones · descanso en segundos</p>
      <button type="button" className="ghost-btn" style={{ marginTop: 8 }} onClick={() => onChange([...rows, blank()])}>+ Agregar ejercicio</button>
    </div>
  );
}
