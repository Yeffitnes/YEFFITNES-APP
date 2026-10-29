// Clasificación de ejercicios para filtrar en el catálogo y agrupar al armar rutinas (pedido de Cristian, 28-oct).
// "Músculo" y "Equipo" son texto libre en la base: aquí se normalizan (sin tildes ni mayúsculas, sinónimos) para agruparlos bien.
export const MUSCLES = ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Cuádriceps", "Femoral", "Glúteo", "Pantorrilla", "Core", "Cuerpo completo"] as const;
export const EQUIPMENT = ["Barra", "Mancuernas", "Polea", "Máquina", "Peso corporal", "Kettlebell", "Banda elástica", "Barra de dominadas"] as const;
export const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const MUSCLE_ALIAS: Record<string, string> = {
  pecho: "Pecho", pectoral: "Pecho", pectorales: "Pecho",
  espalda: "Espalda", dorsal: "Espalda", dorsales: "Espalda", lumbar: "Espalda", trapecio: "Espalda",
  hombro: "Hombro", hombros: "Hombro", deltoides: "Hombro", deltoide: "Hombro",
  biceps: "Bíceps", triceps: "Tríceps",
  cuadriceps: "Cuádriceps", pierna: "Cuádriceps", piernas: "Cuádriceps",
  femoral: "Femoral", femorales: "Femoral", isquiotibiales: "Femoral", isquios: "Femoral",
  gluteo: "Glúteo", gluteos: "Glúteo",
  pantorrilla: "Pantorrilla", pantorrillas: "Pantorrilla", gemelos: "Pantorrilla",
  core: "Core", abdomen: "Core", abdominales: "Core", oblicuos: "Core",
  "cuerpo completo": "Cuerpo completo", "full body": "Cuerpo completo", cardio: "Cuerpo completo",
};
const EQUIP_ALIAS: Record<string, string> = {
  barra: "Barra", "barra olimpica": "Barra", "barra z": "Barra",
  mancuerna: "Mancuernas", mancuernas: "Mancuernas", polea: "Polea", poleas: "Polea", cable: "Polea",
  maquina: "Máquina", "peso corporal": "Peso corporal", ninguno: "Peso corporal", "sin equipo": "Peso corporal",
  kettlebell: "Kettlebell", pesa: "Kettlebell", banda: "Banda elástica", "banda elastica": "Banda elástica", "barra de dominadas": "Barra de dominadas",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// Primer músculo de la lista ("Pecho, tríceps" → Pecho) en su forma estándar; si no se reconoce, el texto tal cual.
export function muscleOf(raw: string | null | undefined): string | null {
  const first = norm(raw).split(/,|\/|\+| y /)[0]?.trim(); if (!first) return null;
  return MUSCLE_ALIAS[first] ?? cap(first);
}
export function equipOf(raw: string | null | undefined): string | null {
  const n = norm(raw); if (!n) return null;
  return EQUIP_ALIAS[n] ?? cap(n);
}
// Opciones para los filtros: primero las estándar en su orden, luego las que Jeff haya escrito distinto. Con conteo.
export function options(values: (string | null)[], order: readonly string[]): { v: string; n: number }[] {
  const m = new Map<string, number>(); values.forEach((x) => { if (x) m.set(x, (m.get(x) ?? 0) + 1); });
  const std = order.filter((o) => m.has(o)).map((v) => ({ v, n: m.get(v)! }));
  const rest = Array.from(m.entries()).filter(([k]) => !order.includes(k)).sort((a, b) => a[0].localeCompare(b[0])).map(([v, n]) => ({ v, n }));
  return [...std, ...rest];
}
// Imagen del ejercicio (0039): "preset:<archivo>" viene dentro de la app (public/ex); "storage:<ruta>" la subió Jeff (bucket público).
export function exImage(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith("preset:")) return `/ex/${image.slice(7)}.webp`;
  if (image.startsWith("storage:")) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-images/${image.slice(8)}`;
  return null;
}
