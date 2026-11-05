"use client";
// Decidir una sugerencia de peso ahí mismo (pedido de Cristian, 4-nov): el peso ya viene escrito, Jeff lo cambia si quiere y toca Aceptar.
// Se actualiza el plan del cliente y la sugerencia sale. Se usa en el panel y al revisar un entrenamiento.
import { useState } from "react";
import { useDecideAdvice } from "@/lib/queries";
const show = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
export function AdviceEditor({ clientId, logId, itemId, next, name }: { clientId: string; logId: string; itemId: string; next: number | null; name: string }) {
  const decide = useDecideAdvice(), [v, setV] = useState(show(next));
  const n = Number(v.trim().replace(",", ".")), ok = v.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 1000;
  const accept = () => { if (ok && !decide.isPending) decide.mutate({ clientId, logId, itemId, weight: Math.round(n * 100) / 100, name }); };
  return (
    <div className="wadv-edit">
      <label className="wadv-field">
        <input aria-label={`Nuevo peso de ${name} en kilos`} inputMode="decimal" value={v} placeholder="Peso" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); accept(); } }} /><i aria-hidden>kg</i></label>
      <button type="button" className="pd-btn primary" disabled={!ok || decide.isPending} onClick={accept}>Aceptar</button>
      <button type="button" className="pd-btn" disabled={decide.isPending} onClick={() => decide.mutate({ clientId, logId, itemId, weight: null, name })}>Descartar</button>
    </div>
  );
}
