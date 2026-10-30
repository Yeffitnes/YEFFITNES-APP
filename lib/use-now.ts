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
// true un momento DESPUÉS de abrir la pantalla (29-oct). Las consultas que no son urgentes (campanita, mensajes sin leer) esperan a esto:
// si llegaban antes de que la pantalla terminara de "despertar" (hidratar), Hoy se dibujaba distinto a lo que mandó el servidor
// y React tenía que redibujarla entera (error 418), justo al abrir la app.
export function useAfterBoot(ms = 900): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOk(true), ms); return () => clearTimeout(t); }, [ms]);
  return ok;
}
