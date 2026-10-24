import { localDate } from "@/lib/queries";
// Fechas (YYYY-MM-DD) de lunes a domingo de la semana actual, en la hora local del dispositivo.
export function weekDates() {
  const t = new Date(), mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return localDate(d); });
}
export const todayWeekday = () => ((new Date().getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
export const DAY_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export const DAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const CAT: Record<string, string> = { upper: "Tren superior", lower: "Tren inferior", core: "Core", cardio: "Cardio" };
export const categoryLabel = (c: string | null) => (c ? CAT[c] ?? null : null);
