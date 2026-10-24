export const FEATURE_LABELS: Record<string, string> = {
  training: "Tu rutina", daily_report: "Reporte diario", progress: "Tu progreso", announcements: "Anuncios de tu coach",
  nutrition: "Plan de nutrición", education_basic: "Material educativo", education_full: "Biblioteca completa",
};
export const hasFeature = (features: string[] | null | undefined, key: string) => !!features?.includes(key);
export function upgradeLink(whatsapp: string | undefined, name: string, feature: string) {
  if (!whatsapp) return null;
  const msg = `Hola, soy ${name}. Quiero acceder a "${FEATURE_LABELS[feature] ?? feature}". ¿Cómo mejoro mi plan?`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
}
export function coachLink(whatsapp: string | undefined, name: string) {
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, soy ${name}. Tengo una consulta sobre mi plan.`)}`;
}
