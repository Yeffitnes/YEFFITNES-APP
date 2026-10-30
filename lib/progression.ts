// Progresión por repeticiones (decisiones de Cristian, 27-oct y 29-oct). Jeff escribe las repeticiones como RANGO ("8-12", "8 a 12")
// o FIJAS ("10", "10 reps", "10 por lado"). Las series son fijas. Antes solo funcionaba con rango; desde el 29-oct también con fijas:
// si pidió 10 y el cliente hizo 8, toca bajar el peso; si pidió 4 y hizo 6, toca subirlo.
// No bloquea nada: aconseja al cliente (en el momento) y a Jeff (notificación al terminar, panel y revisión), que es quien cambia el peso.
// Reglas PROPUESTA, simples y explicables (sin IA):
//   Rango  → subir: la mitad o más de las series pasaron del máximo, o TODAS llegaron al máximo, o fue fácil (esfuerzo ≤ 4) sin quedarse corto.
//            bajar: la mayoría de las series quedaron por debajo del mínimo.
//   Fijas  → subir: la mitad o más de las series pasaron de lo pedido, o fue fácil (esfuerzo ≤ 4) sin quedarse corto.
//            bajar: la mayoría de las series quedaron por debajo de lo pedido.
//   Lo demás: seguir igual.
export type RepRange = { min: number; max: number; fixed?: boolean };
// Solo el rango ("8-12"). Se mantiene por compatibilidad.
export function repRange(reps: string | null | undefined): RepRange | null {
  const m = (reps ?? "").trim().match(/^(\d{1,3})\s*(?:-|–|—|a|al|to)\s*(\d{1,3})(?:\s*(?:reps?|repeticiones))?$/i);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return a > 0 && b > a ? { min: a, max: b } : null;
}
// Rango o número fijo. Un número fijo es { min: n, max: n, fixed: true }. No cuenta como repeticiones lo que es tiempo ("30 s", "1 min").
export function repTarget(reps: string | null | undefined): RepRange | null {
  const r = repRange(reps); if (r) return r;
  const m = (reps ?? "").trim().match(/^(\d{1,3})(?:\s*(?:reps?|repeticiones|c\/l|c\/u|por lado|x lado|cada lado|cada pierna|cada brazo))?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? { min: n, max: n, fixed: true } : null;
}
export const rangeText = (r: RepRange) => (r.fixed ? `${r.min}` : `${r.min} a ${r.max}`);
export type Advice = { kind: "up" | "down" | "keep"; reason: string };
export function advise(range: RepRange, reps: (number | null)[], effort?: number | null): Advice {
  const done = reps.filter((r): r is number => r != null);
  if (!done.length) return { kind: "keep", reason: "" };
  const over = done.filter((r) => r > range.max).length, under = done.filter((r) => r < range.min).length, n = done.length;
  if (over * 2 >= n) return { kind: "up", reason: range.fixed ? `Pediste ${range.max} y hizo más en ${over} de ${n} series.` : `Pasó de ${range.max} repeticiones en ${over} de ${n} series.` };
  if (!range.fixed && done.every((r) => r >= range.max)) return { kind: "up", reason: `Llegó al máximo (${range.max}) en todas las series.` };
  if (under * 2 > n) return { kind: "down", reason: range.fixed ? `Pediste ${range.min} y se quedó por debajo en ${under} de ${n} series.` : `Se quedó por debajo de ${range.min} repeticiones en ${under} de ${n} series.` };
  if (effort != null && effort <= 4 && under === 0) return { kind: "up", reason: `${range.fixed ? "Cumplió las repeticiones" : "Estuvo en el rango"}, pero marcó esfuerzo ${effort}/10: le resultó fácil.` };
  return { kind: "keep", reason: range.fixed ? "Cumplió lo pedido." : "Está dentro del rango." };
}
// Siguiente peso sugerido (lo confirma Jeff): pasos pequeños.
export function nextWeight(current: number | null | undefined, dir: "up" | "down"): number | null {
  if (current == null || current <= 0) return null;
  const step = current < 20 ? 1 : 2.5, v = dir === "up" ? current + step : current - step;
  return v > 0 ? Math.round(v * 2) / 2 : null;
}
// Consejo inmediato al cliente después de guardar una serie.
export function setTip(range: RepRange, reps: number): string | null {
  if (range.fixed) {
    if (reps > range.max) return `Hiciste ${reps} y la meta era ${range.max}. La próxima vez sube un poco el peso para quedar en ${range.max}.`;
    if (reps < range.min) return `Hiciste ${reps} de ${range.min}. Baja un poco el peso o descansa un poco más para llegar a ${range.min}.`;
    return null;
  }
  if (reps > range.max) return `Hiciste ${reps}: pasaste de ${range.max}. En la siguiente serie (o la próxima vez) sube un poco el peso para quedar entre ${range.min} y ${range.max}.`;
  if (reps < range.min) return `Hiciste ${reps}, por debajo de ${range.min}. Baja un poco el peso o descansa un poco más para quedar entre ${range.min} y ${range.max}.`;
  return null;
}
// Resumen para Jeff de un entrenamiento: qué ejercicios conviene subir o bajar (lo usan la notificación y el panel).
export type ExAdvice = { itemId: string; name: string; kind: "up" | "down"; reason: string; range: RepRange; base: number | null; next: number | null };
export function workoutAdvice(sets: { itemId: string | null; reps: number | null; weight: number | null; warmup?: boolean }[], items: { id: string; name: string; reps: string; weight: number | null }[], effort?: number | null): ExAdvice[] {
  const out: ExAdvice[] = [];
  for (const it of items) {
    const r = repTarget(it.reps); if (!r) continue;
    const work = sets.filter((s) => s.itemId === it.id && !s.warmup); if (!work.length) continue;
    const a = advise(r, work.map((s) => s.reps), effort); if (a.kind === "keep") continue;
    const used = work.map((s) => s.weight).filter((w): w is number => w != null), base = used.length ? Math.max(...used) : it.weight;
    out.push({ itemId: it.id, name: it.name, kind: a.kind, reason: a.reason, range: r, base: base ?? null, next: nextWeight(base, a.kind) });
  }
  return out;
}
