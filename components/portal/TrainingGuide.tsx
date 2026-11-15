"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
const KEY = "yt-guide-training";
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
// Guía para clientes nuevos (hasta que terminen 2 entrenamientos): cómo se registra una serie. Se puede cerrar.
export function TrainingGuide() {
  // Se decide DESPUÉS de abrir (30-oct): leer el teléfono al dibujar la primera vez hacía que React redibujara toda Hoy (error 418)
  // a quien ya había tocado "Entendido".
  const [hidden, setHidden] = useState<boolean | null>(null);
  useEffect(() => setHidden(read()), []);
  if (hidden !== false) return null;
  const steps = ["Toca un ejercicio para abrir sus series.", "Anota las repeticiones y el peso que levantaste. Ya vienen con lo que planeó tu coach: cámbialos si hiciste otra cosa o si no pudiste con ese peso.", "Toca el check de cada serie para guardarla. Así llevas tu avance.", "Al terminar, dinos qué tan exigente fue y pulsa «Terminar entrenamiento»."];
  return (
    <div className="guide-card" role="note">
      <div className="guide-head"><span className="guide-badge"><Icon name="check" size={13} stroke={2.4} /></span><b>Cómo registrar tu entrenamiento</b></div>
      <ol className="guide-steps">{steps.map((t, i) => <li key={i}><span className="guide-num">{i + 1}</span><span>{t}</span></li>)}</ol>
      <button type="button" className="mini-btn ghost" style={{ marginTop: 10 }} onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setHidden(true); }}>Entendido</button>
    </div>
  );
}
