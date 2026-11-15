// Hábitos (2-nov; configurables por Jeff desde el 12-nov, 0052). Cada cliente ve los hábitos activos de Jeff, con su meta:
// la de ese cliente si Jeff la cambió, si no la general. Agua, pasos y sueño vienen de fábrica (6 vasos, 3.000 pasos, 6 h, lo que
// Cristian dejó el 12-nov); Jeff agrega otros: de número (meta = mínimo al día) o de sí/no (meta = días por semana).
// Sin la 0052 la app usa los tres de fábrica con esas metas (HABIT_MIN).
export const HABIT_MIN = { water: 6, sleep: 6, steps: 3000 } as const;   // vasos al día, horas por noche, pasos al día
export type HabitKey = "water" | "sleep" | "steps";
export type HabitDay = { day: string; water: number | null; steps: number | null; sleep: number | null; extra?: Record<string, number> };
/** Un hábito tal como aplica a un cliente. `goal` ya es la meta efectiva (la del cliente o la general). */
export type HabitSpec = { id: string; key: HabitKey | null; name: string; unit: string | null; kind: "number" | "check"; goal: number | null; general: number | null; own: boolean };
export type HabitDef = { id: string; key: HabitKey | null; name: string; unit: string | null; kind: "number" | "check"; goal: number | null; active: boolean; position: number };
export type ClientGoal = { clientId: string; habitId: string; goal: number | null; off: boolean };
export const DEFAULT_DEFS: HabitDef[] = [
  { id: "water", key: "water", name: "Agua", unit: "vasos", kind: "number", goal: HABIT_MIN.water, active: true, position: 1 },
  { id: "steps", key: "steps", name: "Pasos", unit: "pasos", kind: "number", goal: HABIT_MIN.steps, active: true, position: 2 },
  { id: "sleep", key: "sleep", name: "Sueño", unit: "h", kind: "number", goal: HABIT_MIN.sleep, active: true, position: 3 },
];
/** Los hábitos que ve un cliente: los activos, sin los que Jeff marcó "no aplica", con su meta. */
export function specsFor(defs: HabitDef[], goals: ClientGoal[], clientId: string): HabitSpec[] {
  return defs.filter((d) => d.active).sort((a, b) => a.position - b.position).flatMap((d) => {
    const g = goals.find((x) => x.clientId === clientId && x.habitId === d.id);
    if (g?.off) return [];
    return [{ id: d.id, key: d.key, name: d.name, unit: d.unit, kind: d.kind, goal: g?.goal ?? d.goal, general: d.goal, own: g?.goal != null }];
  });
}
export const valueOf = (row: HabitDay | undefined, s: { id: string; key: HabitKey | null }): number | null => !row ? null : s.key ? row[s.key] : (row.extra?.[s.id] ?? null);
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
/** "6 vasos", "3.000 pasos", "7 h", "20 min", "Hecho". */
export function fmtHabit(s: Pick<HabitSpec, "key" | "unit" | "kind">, v: number): string {
  if (s.kind === "check") return v ? "Hecho" : "No";
  if (s.key === "water") return `${fmt(v)} ${v === 1 ? "vaso" : "vasos"}`;
  if (s.key === "steps") return `${Math.round(v).toLocaleString("es-CO")} pasos`;
  if (s.key === "sleep") return `${fmt(v)} h`;
  return `${s.key === null && v >= 1000 ? Math.round(v).toLocaleString("es-CO") : fmt(v)}${s.unit ? ` ${s.unit}` : ""}`;
}
/** Texto de la meta: "6 vasos al día", "5 días por semana". */
export const goalText = (s: Pick<HabitSpec, "key" | "unit" | "kind" | "goal">) => s.goal == null ? "sin meta" : s.kind === "check" ? `${fmt(s.goal)} ${s.goal === 1 ? "día" : "días"} por semana` : `${fmtHabit(s, s.goal)}${s.key === "sleep" ? " por noche" : " al día"}`;
/** Un día por debajo de la meta (solo hábitos de número; uno de sí/no se mide por semana). */
export const isLowS = (s: HabitSpec, v: number | null | undefined) => s.kind === "number" && v != null && s.goal != null && v < s.goal;
/** Resumen de varios días: promedio (número) o días hechos (sí/no), y si cumple la meta. `n` = días anotados. */
export function habitStats(s: HabitSpec, rows: HabitDay[], days: string[]) {
  const vals = days.map((d) => valueOf(rows.find((r) => r.day === d), s)).filter((v): v is number => v != null);
  if (s.kind === "check") {
    const done = vals.filter((v) => v > 0).length, need = s.goal == null ? null : Math.ceil((s.goal * days.length) / 7);
    return { n: vals.length, done, avg: null as number | null, ok: need == null ? null : done >= need, need };
  }
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return { n: vals.length, done: vals.length, avg, ok: avg == null || s.goal == null ? null : avg >= s.goal, need: null as number | null };
}
/** Días por debajo de la meta. */
export const lowDaysS = (s: HabitSpec, rows: HabitDay[]) => rows.filter((r) => isLowS(s, valueOf(r, s))).map((r) => r.day);
export const lowWord = (s: Pick<HabitSpec, "key" | "name">) => s.key === "water" ? "poca agua" : s.key === "sleep" ? "poco sueño" : s.key === "steps" ? "pocos pasos" : `${s.name.toLowerCase()} bajo la meta`;
export const shortDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { weekday: "short" }).replace(".", "");
