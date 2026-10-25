"use client";
import { useEffect } from "react";
// iOS Safari ignora "user-scalable=no": el pellizco se bloquea con los eventos de gesto. (El doble toque ya lo evita touch-action en el CSS.)
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault(), ev = ["gesturestart", "gesturechange", "gestureend"];
    ev.forEach((t) => document.addEventListener(t, stop));
    return () => ev.forEach((t) => document.removeEventListener(t, stop));
  }, []);
  return null;
}
