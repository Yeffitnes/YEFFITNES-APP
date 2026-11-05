"use client";
import Link from "next/link";
import { useState } from "react";
import { useRenewPlan, useSetPlan, type ClientRow } from "@/lib/queries";
import { planMonth, planMonthText } from "@/lib/planmonth";
import { useFocusAnchor } from "@/lib/focus";
// Planes mensuales vencidos o por vencer (pedido de Cristian, 28-oct; decisión aclarada el 4-nov). Avisa 7 y 2 días antes (solo información,
// sin botones: renovar antes de tiempo le quitaría días al cliente porque el mes cuenta desde hoy). El día que vence, Jeff decide
// según si el cliente pagó. El plan nunca se quita solo.
export function PlansDueCard({ clients }: { clients: ClientRow[] }) {
  const renew = useRenewPlan(), setPlan = useSetPlan(), [sure, setSure] = useState<string | null>(null);
  useFocusAnchor("planes");
  const rows = clients.filter((c) => c.status === "active" && c.planId)
    .map((c) => ({ c, m: planMonth(c.planSince) }))
    .filter((x): x is { c: ClientRow; m: NonNullable<typeof x.m> } => !!x.m && (x.m.expired || x.m.soon))
    .sort((a, b) => a.m.daysLeft - b.m.daysLeft);
  if (!rows.length) return null;
  const exp = rows.filter((r) => r.m.expired).length;
  return (
    <div className="card plans-due" id="planes">
      <div className="card-head"><div><div className="card-tag">Planes mensuales</div>
        <div className="card-title" style={{ fontSize: 15 }}>{[exp && `${exp} plan${exp === 1 ? "" : "es"} vencido${exp === 1 ? "" : "s"}`, rows.length - exp && `${rows.length - exp} por vencer`].filter(Boolean).join(" · ")}</div></div></div>
      <p className="plans-due-sub">{exp ? "¿Pagó otro mes? Si no decides, el cliente sigue con su plan." : "Te avisaremos otra vez el día que venza para que decidas."}</p>
      {rows.map(({ c, m }) => (
        <div key={c.id} className={`plans-due-row${m.expired ? " expired" : ""}`}>
          <Link href={`/coach/clientes/${c.id}`} className="plans-due-who"><b>{c.name}</b><span>{c.plan} · {planMonthText(m)}</span></Link>
          {m.expired && <div className="plans-due-acts">
            <button className="pd-btn primary" disabled={renew.isPending} onClick={() => renew.mutate(c.id)}>Sí pagó: renovar 30 días</button>
            {sure === c.id
              ? <button className="pd-btn danger" disabled={setPlan.isPending} onClick={() => { setSure(null); setPlan.mutate({ id: c.id, planId: null }); }}>Confirmar: se queda sin acceso</button>
              : <button className="pd-btn" onClick={() => setSure(c.id)}>No pagó: cancelar plan</button>}
          </div>}
        </div>))}
    </div>
  );
}
