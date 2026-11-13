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
export function setTip(range: RepRange, reps: number, noWeight = false): string | null {
  // Sin peso (12-nov): no hay peso que subir o bajar; Jeff ajusta las repeticiones.
  if (noWeight) {
    if (reps > range.max) return `Hiciste ${reps} y la meta era ${range.fixed ? range.max : `entre ${range.min} y ${range.max}`}. Bien: Jeff verá que te quedó fácil y puede subirte las repeticiones.`;
    if (reps < range.min) return `Hiciste ${reps} de ${range.min}. Descansa un poco más antes de la siguiente serie. Si no llegas, Jeff puede ajustarte las repeticiones.`;
    return null;
  }
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
// mode "reps" (12-nov): ejercicio sin peso (ni en el plan ni registrado): se sugiere cambiar las repeticiones (nextReps).
export type ExAdvice = { itemId: string; name: string; kind: "up" | "down"; reason: string; range: RepRange; base: number | null; next: number | null; mode: "weight" | "reps"; nextReps: string | null };
// Repeticiones sugeridas en ejercicios sin peso: lo que de verdad hizo (la mediana de sus series). Si subió por esfuerzo bajo sin pasarse,
// 2 más. En rango se conserva el ancho: hizo 15 con "8-12" → "11-15"; hizo 6 → "6-10". Devuelve solo el número o el rango, sin "por lado".
export function nextReps(range: RepRange, done: number[], dir: "up" | "down"): string | null {
  if (!done.length) return null;
  const s = [...done].sort((a, b) => a - b), m = s[Math.floor((s.length - 1) / 2)], width = range.max - range.min;
  let lo = dir === "up" ? (m > range.max ? m - width : range.min + 2) : (m < range.min ? m : range.min - 2);
  if (lo < 1) lo = 1;
  const hi = lo + width;
  if (lo === range.min && hi === range.max) return null;
  return range.fixed ? String(lo) : `${lo}-${hi}`;
}
// Lo que se agrega al número al guardar, para no perder lo que Jeff había escrito ("10 por lado" → "12 por lado").
export const repsSuffix = (reps: string) => { const m = reps.trim().match(/^\d{1,3}(?:\s*(?:-|–|—|a|al|to)\s*\d{1,3})?\s*(.*)$/i); const t = (m?.[1] ?? "").trim(); return /^(reps?|repeticiones)$/i.test(t) ? "" : t; };
export function workoutAdvice(sets: { itemId: string | null; reps: number | null; weight: number | null; warmup?: boolean }[], items: { id: string; name: string; reps: string; weight: number | null }[], effort?: number | null): ExAdvice[] {
  const out: ExAdvice[] = [];
  for (const it of items) {
    const r = repTarget(it.reps); if (!r) continue;
    const work = sets.filter((s) => s.itemId === it.id && !s.warmup); if (!work.length) continue;
    const a = advise(r, work.map((s) => s.reps), effort); if (a.kind === "keep") continue;
    const used = work.map((s) => s.weight).filter((w): w is number => w != null), base = used.length ? Math.max(...used) : it.weight;
    const noWeight = !used.length && it.weight == null;
    out.push({ itemId: it.id, name: it.name, kind: a.kind, reason: a.reason, range: r, base: base ?? null, next: nextWeight(base, a.kind), mode: noWeight ? "reps" : "weight",
      nextReps: noWeight ? nextReps(r, work.map((s) => s.reps).filter((x): x is number => x != null), a.kind) : null });
  }
  return out;
}
// Sugerencias que siguen pendientes para Jeff (4-nov). Cada ejercicio se juzga SOLO por su entrenamiento más reciente: si después lo hizo
// bien, o si Jeff ya decidió sobre el último, no revive una sugerencia vieja. `logs` debe venir del más reciente al más viejo.
// Sale también si el peso del plan ya se movió en esa dirección (Jeff lo cambió en la ficha) o si el ejercicio ya no está en su plan activo.
type AdviceItem = { id: string; name: string; reps: string; weight: number | null; active?: boolean };
type AdviceLog = { logId: string; effort: number | null; sets: { itemId: string | null; reps: number | null; weight: number | null; warmup?: boolean }[]; items: AdviceItem[] };
export function pendingAdvice<T extends AdviceLog>(logs: T[], decided: Set<string>): { l: T; a: ExAdvice; key: string }[] {
  const seen = new Set<string>(), out: { l: T; a: ExAdvice; key: string }[] = [];
  for (const l of logs) for (const it of l.items) {
    const work = l.sets.filter((s) => s.itemId === it.id && !s.warmup);
    if (!work.length || seen.has(it.id)) continue;
    seen.add(it.id);
    if (it.active === false) continue;
    const a = workoutAdvice(l.sets, [it], l.effort)[0], key = `${l.logId}:${it.id}`;
    if (!a || decided.has(key)) continue;
    const used = work.some((s) => s.weight != null), cur = it.weight;
    if (cur != null && (!used || a.base == null || (a.kind === "up" ? cur > a.base : cur < a.base))) continue;   // ya se ajustó en el plan
    out.push({ l, a: used ? a : { ...a, base: null, next: null }, key });
  }
  return out;
}
