// Progresión por rango de repeticiones (decisión de Cristian, 27-oct). Jeff escribe las repeticiones como rango ("8-12", "8 a 12");
// las series son fijas. Si el cliente pasa del máximo, toca subir el peso; si se queda por debajo del mínimo, bajarlo.
// No bloquea nada: solo aconseja al cliente (en el momento) y a Jeff (en la revisión), que es quien cambia el peso del plan.
// Reglas PROPUESTA, simples y explicables (sin IA):
//   subir  → la mitad o más de las series pasaron del máximo, o TODAS llegaron al máximo, o fue fácil (esfuerzo ≤ 4) sin quedarse corto.
//   bajar  → la mayoría de las series quedaron por debajo del mínimo.
//   seguir → lo demás (estar entre el mínimo y el máximo, incluidos los extremos, está bien).
export type RepRange = { min: number; max: number };
export function repRange(reps: string | null | undefined): RepRange | null {
  const m = (reps ?? "").trim().match(/^(\d{1,3})\s*(?:-|–|—|a|al|to)\s*(\d{1,3})$/i);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return a > 0 && b > a ? { min: a, max: b } : null;
}
export const rangeText = (r: RepRange) => `${r.min} a ${r.max}`;
export type Advice = { kind: "up" | "down" | "keep"; reason: string };
export function advise(range: RepRange, reps: (number | null)[], effort?: number | null): Advice {
  const done = reps.filter((r): r is number => r != null);
  if (!done.length) return { kind: "keep", reason: "" };
  const over = done.filter((r) => r > range.max).length, under = done.filter((r) => r < range.min).length, n = done.length;
  if (over * 2 >= n) return { kind: "up", reason: `Pasó de ${range.max} repeticiones en ${over} de ${n} series.` };
  if (done.every((r) => r >= range.max)) return { kind: "up", reason: `Llegó al máximo (${range.max}) en todas las series.` };
  if (under * 2 > n) return { kind: "down", reason: `Se quedó por debajo de ${range.min} repeticiones en ${under} de ${n} series.` };
  if (effort != null && effort <= 4 && under === 0) return { kind: "up", reason: `Estuvo en el rango, pero marcó esfuerzo ${effort}/10: le resultó fácil.` };
  return { kind: "keep", reason: "Está dentro del rango." };
}
// Siguiente peso sugerido (lo confirma Jeff): pasos pequeños.
export function nextWeight(current: number | null | undefined, dir: "up" | "down"): number | null {
  if (current == null || current <= 0) return null;
  const step = current < 20 ? 1 : 2.5, v = dir === "up" ? current + step : current - step;
  return v > 0 ? Math.round(v * 2) / 2 : null;
}
// Consejo inmediato al cliente después de guardar una serie (se muestra una sola vez por ejercicio: el de la última serie).
export function setTip(range: RepRange, reps: number): string | null {
  if (reps > range.max) return `Hiciste ${reps}: pasaste de ${range.max}. En la siguiente serie (o la próxima vez) sube un poco el peso para quedar entre ${range.min} y ${range.max}.`;
  if (reps < range.min) return `Hiciste ${reps}, por debajo de ${range.min}. Baja un poco el peso o descansa un poco más para quedar entre ${range.min} y ${range.max}.`;
  return null;
}
