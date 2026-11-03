// Mínimos de hábitos para los avisos (2-nov). PROPUESTA hasta que Jeff defina sus metas (están NO DEFINIDO):
// por debajo de esto, el cliente y Jeff ven el aviso "poco sueño / poca agua / pocos pasos". Cambiarlos aquí cambia toda la app.
export const HABIT_MIN = { water: 6, sleep: 6, steps: 3000 } as const;   // vasos al día, horas por noche, pasos al día
export type HabitDay = { day: string; water: number | null; steps: number | null; sleep: number | null };
export type HabitKey = "water" | "sleep" | "steps";
export const HABIT_TXT: Record<HabitKey, { name: string; low: string; unit: (n: number) => string }> = {
  water: { name: "Agua", low: "poca agua", unit: (n) => `${fmt(n)} ${n === 1 ? "vaso" : "vasos"}` },
  sleep: { name: "Sueño", low: "poco sueño", unit: (n) => `${fmt(n)} h` },
  steps: { name: "Pasos", low: "pocos pasos", unit: (n) => Math.round(n).toLocaleString("es-CO") },
};
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
export const isLow = (k: HabitKey, v: number | null | undefined) => v != null && v < HABIT_MIN[k];
/** Promedio de los días anotados (null si no anotó ninguno). */
export const habitAvg = (list: HabitDay[], k: HabitKey) => { const v = list.map((x) => x[k]).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
/** Días anotados por debajo del mínimo. */
export const lowDays = (list: HabitDay[], k: HabitKey) => list.filter((x) => isLow(k, x[k])).map((x) => x.day);
export const shortDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { weekday: "short" }).replace(".", "");
