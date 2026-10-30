"use client";
import { useEffect, useState } from "react";
// Hora actual que se actualiza sola (cada minuto y al volver a la app): así lo que ya pasó deja de verse como "próximo"
// aunque la pantalla lleve horas abierta (pedido de Cristian, 29-oct).
export function useNow(everyMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, everyMs), vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [everyMs]);
  return now;
}
