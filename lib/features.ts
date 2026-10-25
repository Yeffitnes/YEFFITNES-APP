export const FEATURE_LABELS: Record<string, string> = {
  training: "Tu rutina", daily_report: "Reporte diario", progress: "Tu progreso", announcements: "Anuncios de tu coach",
  nutrition: "Plan de nutrición", education_basic: "Material educativo", education_full: "Biblioteca completa",
};
export const hasFeature = (features: string[] | null | undefined, key: string) => !!features?.includes(key);
// Todo se habla dentro de la app: estos enlaces abren "Mensajes" con el texto ya escrito (el cliente solo toca Enviar).
export const MESSAGES_PATH = "/inicio/mensajes";
export function upgradeLink(feature: string) {
  return `${MESSAGES_PATH}?m=${encodeURIComponent(`Quiero acceder a "${FEATURE_LABELS[feature] ?? feature}". ¿Cómo mejoro mi plan?`)}`;
}
export function changeSessionLink(when: string) {
  return `${MESSAGES_PATH}?m=${encodeURIComponent(`Necesito cambiar mi sesión del ${when}.`)}`;
}
