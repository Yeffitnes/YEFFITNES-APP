const GRAD = ["#F7254B,#F2406B", "#F5A623,#E8536B", "#B08A3E,#D41A40", "#0A0910,#F7254B", "#F2406B,#F7254B", "#9C1535,#B08A3E"];
export const gradient = (i: number) => `linear-gradient(135deg,${GRAD[i % GRAD.length]})`;
export const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
export function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`;
}
export function youtubeId(input: string): string | null {
  const s = input.trim(); if (!s) return null;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) ?? s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}
