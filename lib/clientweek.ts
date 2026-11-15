// La semana de cada cliente (pedido de Cristian, 4-nov): no es "los últimos 7 días" ni de lunes a domingo, sino bloques de 7 días
// desde el día en que empezó con Jeff (activated_at, que se reinicia solo si perdió el plan y vuelve). Renovar el mes no la cambia.
import { addDays, diffDays, shortDate } from "@/lib/planmonth";
export type WeekSpan = { n: number; from: string; to: string; days: string[]; complete: boolean; day: number; left: number; completesOn: string };
const bogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const range = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };
/** Día del cliente (1 = el primero), su semana en curso y la última que ya completó (si hay). */
export function clientWeeks(start: string, today = bogota()): { dayN: number; current: WeekSpan; last: WeekSpan | null } {
  const dayN = Math.max(1, diffDays(today, start) + 1), n = Math.ceil(dayN / 7), day = dayN - (n - 1) * 7;
  const from = addDays(start, (n - 1) * 7), to = addDays(from, 6), completesOn = addDays(from, 7);
  const current: WeekSpan = { n, from, to, days: range(from, today < from ? from : today), complete: false, day, left: 8 - day, completesOn };
  const lastFrom = addDays(from, -7), lastTo = addDays(from, -1);
  const last: WeekSpan | null = n > 1 ? { n: n - 1, from: lastFrom, to: lastTo, days: range(lastFrom, lastTo), complete: true, day: 7, left: 0, completesOn: from } : null;
  return { dayN, current, last };
}
export const spanText = (s: WeekSpan) => `${shortDate(s.from)} al ${shortDate(s.to)}`;
export const weekdayDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "").replace(/\./g, "");
