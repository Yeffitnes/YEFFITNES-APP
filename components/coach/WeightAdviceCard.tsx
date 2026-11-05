"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { pendingAdvice, rangeText } from "@/lib/progression";
import { useAdviceDecisions, useAdviceFeed } from "@/lib/queries";
import { useFocusAnchor } from "@/lib/focus";
import { AdviceEditor } from "./AdviceEditor";

// "Ajustes de peso sugeridos" (pedido de Cristian, 29-oct; rehecho el 4-nov): cuando un cliente hace más o menos repeticiones de las que
// Jeff pidió (rango "8-12" o fijas "10"), a Jeff le llega la notificación al terminar y aquí queda la sugerencia. Jeff la resuelve ahí
// mismo, sin ir a otra pantalla: el peso ya viene escrito, lo cambia si quiere y toca Aceptar (o Descartar). Sale al momento y no vuelve,
// ni en otro aparato. Qué sigue pendiente: pendingAdvice (lib/progression.ts).
const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
const dayTxt = (ymd: string) => { const d = Math.round((Date.parse(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) + "T12:00:00Z") - Date.parse(`${ymd}T12:00:00Z`)) / 86_400_000); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`; };
export function WeightAdviceCard() {
  const feed = useAdviceFeed(), decisions = useAdviceDecisions();
  useFocusAnchor("ajustes");
  const rows = useMemo(() => pendingAdvice(feed.data ?? [], new Set((decisions.data ?? []).map((d) => `${d.logId}:${d.itemId}`))), [feed.data, decisions.data]);
  if (decisions.isPending || !rows.length) return null;
  // Agrupadas por entrenamiento (29-oct, noche): antes salía una fila suelta por ejercicio y el nombre del cliente se repetía.
  const groups = Array.from(rows.slice(0, 20).reduce((m, r) => m.set(r.l.logId, [...(m.get(r.l.logId) ?? []), r]), new Map<string, typeof rows>()).values());
  return (
    <div className="card wadv-card" id="ajustes">
      <div className="card-head"><div><div className="card-tag">Ajustes de peso sugeridos</div>
        <div className="card-title" style={{ fontSize: 15 }}>{rows.length} sugerencia{rows.length === 1 ? "" : "s"} de tus clientes</div></div></div>
      <p className="plans-due-sub">Según las repeticiones que hicieron frente a las que pediste. Cambia el peso si quieres y acepta: se actualiza su plan y sale de aquí.</p>
      {groups.map((g) => { const l = g[0].l;
        return (
          <div key={l.logId} className="wadv-group">
            <Link href={`/coach/clientes/${l.clientId}?tab=Entrenamiento`} className="wadv-who">
              <span className="attn-avatar sm">{initials(l.clientName)}</span>
              <span className="wadv-head"><b>{l.clientName}</b><small>{dayTxt(l.date)}{l.routine ? ` · ${l.routine}` : ""}{l.effort ? ` · esfuerzo ${l.effort}/10` : ""}</small></span>
            </Link>
            {g.map(({ a, key }) => {
              const done = l.sets.filter((x) => x.itemId === a.itemId && !x.warmup).map((x) => x.reps).filter((x): x is number => x != null);
              const plan = l.items.find((i) => i.id === a.itemId)?.weight ?? null;
              return (
                <div key={key} className={`wadv-row ${a.kind}`}>
                  <span className="wadv-txt">
                    <b><Icon name={a.kind === "up" ? "up" : "down"} size={13} /> {a.name}: {a.kind === "up" ? "subir el peso" : "bajar el peso"}</b>
                    <span>{a.range.fixed ? `Pediste ${a.range.min} repeticiones` : `Rango ${rangeText(a.range)} repeticiones`}; hizo {done.join(", ") || "—"}{a.base != null ? ` con ${kg(a.base)}` : ""}.{plan != null ? ` En su plan: ${kg(plan)}.` : ""}</span>
                    {a.next == null && <span className="wadv-noweight">No registró peso y su plan no tiene. Escribe el que le quieres dejar, o descarta si es sin peso.</span>}
                  </span>
                  <AdviceEditor clientId={l.clientId} logId={l.logId} itemId={a.itemId} next={a.next} name={a.name} />
                </div>);
            })}
          </div>);
      })}
    </div>
  );
}
