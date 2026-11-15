// Plan mensual (pedido de Cristian, 28-oct): cada plan dura 30 días desde plan_since (migración 0038).
// Al vencer NO se quita solo: Jeff lo ve y decide. Avisos (0048, 0051): 7, 2 y 1 día antes y el día que vence, con la decisión.
export const PLAN_DAYS = 30;
export const PLAN_WARN_DAYS = 7;
const bogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
export const addDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const diffDays = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
export type PlanMonth = { since: string; endsOn: string; day: number; daysLeft: number; expired: boolean; soon: boolean };
export function planMonth(since: string | null | undefined, today = bogota()): PlanMonth | null {
  if (!since) return null;
  const endsOn = addDays(since, PLAN_DAYS), daysLeft = diffDays(endsOn, today);
  return { since, endsOn, day: Math.min(PLAN_DAYS, diffDays(today, since) + 1), daysLeft, expired: daysLeft <= 0, soon: daysLeft > 0 && daysLeft <= PLAN_WARN_DAYS };
}
export const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
export function planMonthText(p: PlanMonth): string {
  if (p.expired) return p.daysLeft === 0 ? "Venció hoy" : `Venció hace ${-p.daysLeft} día${p.daysLeft === -1 ? "" : "s"}`;
  return p.daysLeft === 1 ? "Vence mañana" : `Vence en ${p.daysLeft} días (${shortDate(p.endsOn)})`;
}
