"use client";
import type { CSSProperties } from "react";
import { ThreadView } from "@/components/ui/ThreadView";
// Cliente sin plan: solo texto. Se definen aquí los colores que el hilo usa (esta pantalla no carga el CSS del portal).
const VARS = { color: "#0a0910", "--line": "#e3e5ec", "--neon": "#F7254B", "--rose": "#F2406B", "--text": "#0a0910", "--text-dim": "#6b6f80", "--paper": "#f5f6fa", "--card-bg": "#fff" } as CSSProperties;
export function PendingThread() { return <div style={VARS}><ThreadView otherName="Jeff" textOnly /></div>; }
