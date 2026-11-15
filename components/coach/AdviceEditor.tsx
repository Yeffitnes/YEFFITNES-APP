"use client";
// Decidir una sugerencia ahí mismo (pedido de Cristian, 4-nov; repeticiones el 12-nov): el valor ya viene escrito, Jeff lo cambia si quiere
// y toca Aceptar. Se actualiza el plan del cliente y la sugerencia sale. Se usa en el panel y al revisar un entrenamiento.
// Peso: casilla en kg. Sin peso (flexiones, dominadas...): casilla de repeticiones ("12" o "10-12"); "Ponerle peso" cambia a kg.
import { useState } from "react";
import { useDecideAdvice } from "@/lib/queries";
import { repTarget, repsSuffix } from "@/lib/progression";
const show = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
type Props = { clientId: string; logId: string; itemId: string; name: string; next: number | null; mode?: "weight" | "reps"; nextReps?: string | null; planReps?: string };
export function AdviceEditor({ clientId, logId, itemId, name, next, mode = "weight", nextReps = null, planReps = "" }: Props) {
  const decide = useDecideAdvice(), [m, setM] = useState(mode), [v, setV] = useState(mode === "reps" ? nextReps ?? "" : show(next));
  const suffix = repsSuffix(planReps), r = repTarget(v.trim());
  const n = Number(v.trim().replace(",", ".")), okW = v.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 1000, okR = !!r && !/[,.]/.test(v);
  const ok = m === "reps" ? okR : okW;
  const accept = () => {
    if (!ok || decide.isPending) return;
    if (m === "reps") decide.mutate({ clientId, logId, itemId, weight: null, reps: `${r!.fixed ? r!.min : `${r!.min}-${r!.max}`}${suffix ? ` ${suffix}` : ""}`, name });
    else decide.mutate({ clientId, logId, itemId, weight: Math.round(n * 100) / 100, name });
  };
  const swap = () => { const to = m === "reps" ? "weight" : "reps"; setM(to); setV(to === "reps" ? nextReps ?? "" : ""); };
  return (
    <div className="wadv-edit">
      <label className={`wadv-field${m === "reps" ? " reps" : ""}`}>
        <input aria-label={m === "reps" ? `Nuevas repeticiones de ${name}` : `Nuevo peso de ${name} en kilos`} inputMode={m === "reps" ? "text" : "decimal"} value={v} placeholder={m === "reps" ? "Reps" : "Peso"}
          onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); accept(); } }} /><i aria-hidden>{m === "reps" ? suffix || "reps" : "kg"}</i></label>
      <button type="button" className="pd-btn primary" disabled={!ok || decide.isPending} onClick={accept}>Aceptar</button>
      <button type="button" className="pd-btn" disabled={decide.isPending} onClick={() => decide.mutate({ clientId, logId, itemId, weight: null, name })}>Descartar</button>
      {mode === "reps" && <button type="button" className="wadv-swap" onClick={swap}>{m === "reps" ? "Mejor ponerle peso" : "Volver a repeticiones"}</button>}
    </div>
  );
}
