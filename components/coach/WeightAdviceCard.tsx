"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { rangeText, workoutAdvice } from "@/lib/progression";
import { useAdviceFeed, useApplyWeight } from "@/lib/queries";
import { useFocusAnchor } from "@/lib/focus";

// "Ajustes de peso sugeridos" (pedido de Cristian, 29-oct): cuando un cliente hace más o menos repeticiones de las que Jeff pidió
// (rango "8-12" o fijas "10"), a Jeff le llega la notificación al terminar y aquí queda la sugerencia hasta que la aplique o la descarte.
// Un toque cambia el peso de ese ejercicio en el plan del cliente. Se va sola cuando el peso del plan ya se movió en esa dirección.
const KEY = "yf-advice-off";
const readOff = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; } };
const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
const dayTxt = (ymd: string) => { const d = Math.round((Date.parse(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) + "T12:00:00Z") - Date.parse(`${ymd}T12:00:00Z`)) / 86_400_000); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`; };
export function WeightAdviceCard() {
  const feed = useAdviceFeed(), apply = useApplyWeight(), [off, setOff] = useState<string[]>([]);
  useEffect(() => setOff(readOff()), []);
  useFocusAnchor("ajustes");
  const rows = useMemo(() => (feed.data ?? []).flatMap((l) => workoutAdvice(l.sets, l.items, l.effort).map((a) => ({ l, a, key: `${l.logId}:${a.itemId}` })))
    .filter(({ a, key, l }) => {
      if (off.includes(key)) return false;
      const cur = l.items.find((i) => i.id === a.itemId)?.weight ?? null;   // peso que tiene HOY el plan
      if (a.next != null && cur != null && (a.kind === "up" ? cur >= a.next : cur <= a.next)) return false;   // ya lo cambió
      return true;
    })
    // Una sola sugerencia por ejercicio y cliente: la del entrenamiento más reciente.
    .filter((x, i, all) => all.findIndex((y) => y.l.clientId === x.l.clientId && y.a.itemId === x.a.itemId) === i), [feed.data, off]);
  if (!rows.length) return null;
  const hide = (k: string) => { const n = [...off, k].slice(-300); setOff(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* sin almacenamiento */ } };
  return (
    <div className="card wadv-card" id="ajustes">
      <div className="card-head"><div><div className="card-tag">Ajustes de peso sugeridos</div>
        <div className="card-title" style={{ fontSize: 15 }}>{rows.length} sugerencia{rows.length === 1 ? "" : "s"} de tus clientes</div></div></div>
      <p className="plans-due-sub">Según las repeticiones que hicieron frente a las que pediste. Tú decides: un toque cambia el peso en su plan.</p>
      {rows.slice(0, 12).map(({ l, a, key }) => (
        <div key={key} className={`wadv-row ${a.kind}`}>
          <Link href={`/coach/clientes/${l.clientId}?tab=Entrenamiento`} className="wadv-who">
            <span className="attn-avatar sm">{initials(l.clientName)}</span>
            <span className="wadv-txt"><b>{l.clientName} · {a.name}</b>
              <span><Icon name={a.kind === "up" ? "up" : "down"} size={12} /> {a.kind === "up" ? "Subir el peso" : "Bajar el peso"}. {a.reason} {a.range.fixed ? "Pedido" : "Rango"}: {rangeText(a.range)}.{a.base != null ? ` Usó ${kg(a.base)}.` : ""} <i>{dayTxt(l.date)}{l.routine ? ` · ${l.routine}` : ""}</i></span></span>
          </Link>
          <div className="wadv-acts">
            {a.next != null && <button type="button" className="pd-btn primary" disabled={apply.isPending} onClick={() => apply.mutate({ clientId: l.clientId, itemId: a.itemId, weight: a.next! })}>{a.kind === "up" ? "Subir" : "Bajar"} a {kg(a.next)}</button>}
            <button type="button" className="pd-btn" onClick={() => hide(key)}>Descartar</button>
          </div>
        </div>))}
    </div>
  );
}
