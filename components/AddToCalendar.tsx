"use client";
// "Agregar a mi calendario" (22-nov, noche). En iPhone abre el .ics (el teléfono muestra "Agregar al calendario" con 2 alarmas);
// en Android abre Google Calendar con el evento escrito; en computador ofrece los dos. El sistema se elige después de abrir
// (no en el primer dibujo, para no redibujar la pantalla).
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { gcalUrl, icsUrl } from "@/lib/ics";
type S = { startsAt: string; duration: number; kind: string };
export function AddToCalendar({ s, who = "client", name, className = "mini-btn ghost", label = "Agregar a mi calendario" }: { s: S; who?: "client" | "coach"; name?: string; className?: string; label?: string }) {
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  useEffect(() => { const ua = navigator.userAgent; setOs(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : "other"); }, []);
  if (os === "android") return <a className={className} href={gcalUrl(s, who, name)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={14} /> {label}</a>;
  if (os === "ios") return <a className={className} href={icsUrl(s, who, name)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={14} /> {label}</a>;
  return (
    <span className="cal-add-two">
      <a className={className} href={icsUrl(s, who, name)} download="sesion-yeffitness.ics"><Icon name="calendar" size={14} /> {label}</a>
      <a className={className} href={gcalUrl(s, who, name)} target="_blank" rel="noopener noreferrer">Google Calendar</a>
    </span>
  );
}
