// Landing pública (/landing, 22-nov): el enlace que Yeff pone en Instagram. No enlaza a la app: todo termina en su WhatsApp.
// WhatsApp de Yeff: variable NEXT_PUBLIC_YEFF_WHATSAPP (solo dígitos con indicativo, ej. 573001234567) en Vercel y en Netlify.
// Sin ella, los botones abren WhatsApp con el mensaje escrito y la persona elige a quién mandarlo (sirve para probar, no para lanzar).
export const WHATSAPP = (process.env.NEXT_PUBLIC_YEFF_WHATSAPP ?? "").replace(/\D/g, "");
export const waLink = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Paquetes: PROPUESTA. Son los dos planes que hoy existen en la app (Esencial y Completo, migración 0002) con lo que cada uno
// desbloquea en ella. Sin precio: "Preguntar precio" abre WhatsApp. Cambiar aquí nombres o contenido cuando Yeff los confirme.
export type Pack = { name: string; tagline: string; includes: string[]; highlight?: boolean };
export const PACKS: Pack[] = [
  { name: "Esencial", tagline: "Tu rutina y el seguimiento de Yeff.", includes: [
    "Rutina hecha para ti, con vídeos de técnica", "Registro de cada serie y descanso automático", "Reporte diario con vídeo, revisado por Yeff",
    "Progreso semana a semana, récords y resumen semanal", "Llamadas con Yeff, con avisos y en tu calendario", "Mensajes con Yeff dentro de la app", "Material educativo básico"] },
  { name: "Completo", tagline: "Entrenamiento y nutrición, todo con Yeff.", highlight: true, includes: [
    "Todo lo del Esencial", "Plan de nutrición comida por comida", "Calorías y macros para tu objetivo", "Biblioteca completa de material"] },
];
