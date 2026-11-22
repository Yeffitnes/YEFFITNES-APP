export const FEATURE_LABELS: Record<string, string> = {
  training: "Tu rutina", daily_report: "Reporte diario", progress: "Tu progreso", announcements: "Anuncios de tu coach",
  nutrition: "Plan de nutrición", education_basic: "Material educativo", education_full: "Biblioteca completa",
};
// Cómo se nombra cada función cuando un cliente la pide (lo lee Yeff: "Camila pidió el plan de nutrición").
export const FEATURE_NAMES: Record<string, string> = {
  training: "la rutina de entrenamiento", daily_report: "el reporte diario", progress: "el seguimiento de progreso", announcements: "los anuncios",
  nutrition: "el plan de nutrición", education_basic: "el material educativo", education_full: "la biblioteca completa",
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
