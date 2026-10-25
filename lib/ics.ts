import { KIND_LABEL } from "@/lib/queries";
// Archivo de calendario (.ics) con DOS alarmas: 1 día antes y 1 hora antes. Al abrirlo, el teléfono lo agrega a su calendario y suena solo.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function icsHref(s: { startsAt: string; duration: number; kind: string }) {
  const start = new Date(s.startsAt), end = new Date(start.getTime() + s.duration * 60000), label = KIND_LABEL[s.kind] ?? "Sesión";
  const alarm = (trigger: string, text: string) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${text}`, `TRIGGER:${trigger}`, "END:VALARM"];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//YEFFITNES TRAINING//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${stamp(start)}-${s.kind}@yeffitnes`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${label} · YEFFITNES TRAINING`, "DESCRIPTION:Tu sesión con tu coach.",
    ...alarm("-P1D", "Mañana tienes tu sesión con tu coach"), ...alarm("-PT1H", "Tu sesión empieza en 1 hora"), "END:VEVENT", "END:VCALENDAR"];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
