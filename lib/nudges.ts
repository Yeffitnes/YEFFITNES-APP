// Textos de los avisos rápidos de Jeff (Seguimiento de hoy → "Avisar"). Los usan la notificación del teléfono y la pantalla Hoy del cliente.
export type NudgeKind = "nothing" | "train" | "meals" | "report";
export const NUDGE_TXT: Record<NudgeKind, { title: string; body: string }> = {
  nothing: { title: "Jeff te está esperando", body: "Hoy aún no registras nada. Entra, entrena, marca tu nutrición y envía tu reporte." },
  train: { title: "Tu entrenamiento de hoy", body: "Jeff está esperando tu entrenamiento de hoy. Cuando termines, regístralo en la app." },
  meals: { title: "Tu nutrición de hoy", body: "Jeff está esperando tu nutrición de hoy. Marca tus comidas en la app." },
  report: { title: "Tu reporte de hoy", body: "Jeff está esperando tu reporte de hoy: un vídeo corto y un comentario." },
};
export const bogotaDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
