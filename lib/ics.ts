// Calendario del teléfono (22-nov, noche: pedido de Cristian, que al agendar quede en el calendario del celular).
// - iPhone y computador: archivo .ics con DOS alarmas (1 día antes y 1 hora antes), servido por /api/ics para que el iPhone muestre
//   "Agregar al calendario" al tocarlo.
// - Android: Google Calendar con el evento ya escrito (abre la app de Calendar si está instalada); avisa con los recordatorios
//   que el usuario tenga por defecto en su calendario.
// Ninguno se agrega solo: la web no puede escribir en el calendario sin que la persona toque "Guardar".
type S = { startsAt: string; duration: number; kind: string };
// Copia de KIND_LABEL (lib/queries es de cliente y la ruta /api/ics corre en el servidor).
const KIND_LABEL: Record<string, string> = { initial: "Llamada inicial", followup: "Seguimiento" };
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const titleOf = (s: S, who: "client" | "coach", name?: string) => who === "coach" ? `${KIND_LABEL[s.kind] ?? "Sesión"}${name ? ` · ${name}` : ""} · Yeffitness` : `${KIND_LABEL[s.kind] ?? "Sesión"} con Yeff · Yeffitness`;
export function icsText(s: S, who: "client" | "coach" = "client", name?: string) {
  const start = new Date(s.startsAt), end = new Date(start.getTime() + s.duration * 60000);
  const alarm = (trigger: string, text: string) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${text}`, `TRIGGER:${trigger}`, "END:VALARM"];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yeffitness//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${stamp(start)}-${s.kind}-${who}@yeffitness`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${titleOf(s, who, name).replace(/[,;\n]/g, " ")}`, `DESCRIPTION:${who === "coach" ? "Sesión agendada en Yeffitness." : "Tu sesión con Yeff. Los detalles están en la app, en Agenda."}`,
    ...alarm("-P1D", who === "coach" ? "Mañana tienes esta sesión" : "Mañana tienes sesión con Yeff"), ...alarm("-PT1H", "La sesión empieza en 1 hora"), "END:VEVENT", "END:VCALENDAR"];
  return lines.join("\r\n");
}
/** Enlace al .ics (por la ruta /api/ics). */
export const icsUrl = (s: S, who: "client" | "coach" = "client", name?: string) =>
  `/api/ics?${new URLSearchParams({ s: new Date(s.startsAt).toISOString(), d: String(s.duration), k: s.kind, w: who, ...(name ? { n: name } : {}) }).toString()}`;
/** Enlace a Google Calendar con el evento escrito (Android). */
export function gcalUrl(s: S, who: "client" | "coach" = "client", name?: string) {
  const start = new Date(s.startsAt), end = new Date(start.getTime() + s.duration * 60000);
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: titleOf(s, who, name), dates: `${stamp(start)}/${stamp(end)}`, details: who === "coach" ? "Sesión agendada en Yeffitness." : "Tu sesión con Yeff. Los detalles están en la app, en Agenda.", ctz: "America/Bogota" }).toString()}`;
}
/** Compatibilidad: el enlace data: de antes (lo usan pantallas que aún no tienen el botón nuevo). */
export const icsHref = (s: S) => `data:text/calendar;charset=utf-8,${encodeURIComponent(icsText(s))}`;
