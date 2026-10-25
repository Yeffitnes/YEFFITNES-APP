export const DAY3 = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export const DAYLONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const hhmm = (iso: string | Date) => new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
export const dayIdx = (d: Date) => (d.getDay() + 6) % 7;
export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export function weekDays(from: Date) { return Array.from({ length: 7 }, (_, i) => { const d = new Date(from); d.setDate(from.getDate() + i); return d; }); }
export function weekLabel(from: Date) {
  const to = new Date(from); to.setDate(from.getDate() + 6);
  const m = (d: Date) => d.toLocaleDateString("es", { month: "long" });
  return from.getMonth() === to.getMonth() ? `${from.getDate()} – ${to.getDate()} de ${m(to)}, ${to.getFullYear()}` : `${from.getDate()} ${m(from)} – ${to.getDate()} ${m(to)}, ${to.getFullYear()}`;
}
