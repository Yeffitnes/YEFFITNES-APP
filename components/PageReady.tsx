"use client";
import { useEffect } from "react";
import { onlineManager } from "@tanstack/react-query";
// Arranque sin redibujar (29-oct). La pantalla llega dibujada desde el servidor, pero el teléfono la "despierta" (hidrata) en dos partes:
// primero el marco (menú, campanita) y después el contenido. Si una consulta del marco traía datos antes de que el contenido despertara,
// el contenido ya no coincidía con lo del servidor y React tenía que redibujar TODO (error 418), justo al abrir la app.
// Solución: al arrancar, React Query espera (como si no hubiera red) y esta pieza, que va al final de cada página, le da paso
// cuando el contenido ya despertó. Por seguridad, Providers le da paso igual a los 2,5 s.
let paused = false;
export function pauseUntilReady() { if (typeof window === "undefined" || paused) return; paused = true; onlineManager.setOnline(false); }
export function resumeNetwork() { if (typeof window === "undefined") return; onlineManager.setOnline(typeof navigator === "undefined" || navigator.onLine !== false); }
export function PageReady() { useEffect(() => { resumeNetwork(); }, []); return null; }
