const GRAD = ["#F7254B,#F2406B", "#F5A623,#E8536B", "#B08A3E,#D41A40", "#0A0910,#F7254B", "#F2406B,#F7254B", "#9C1535,#B08A3E"];
export const gradient = (i: number) => `linear-gradient(135deg,${GRAD[i % GRAD.length]})`;
export const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
// Días de calendario (2-nov): antes restaba horas, y una fecha "2026-11-02" se leía como medianoche UTC (7 p. m. del día anterior en
// Bogotá): desde las 7 p. m. un reporte o entrenamiento de HOY salía como "Ayer". Ahora compara días del calendario del teléfono.
export function ago(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const day = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  const a = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(), t = new Date(); t.setHours(0, 0, 0, 0);
  const d = Math.round((t.getTime() - a) / 86400000);
  return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`;
}
export function youtubeId(input: string): string | null {
  const s = input.trim(); if (!s) return null;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) ?? s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}
