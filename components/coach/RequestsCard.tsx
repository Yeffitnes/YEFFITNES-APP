"use client";
// "Solicitudes de clientes" (22-nov, pedido de Cristian): arriba del todo en el panel, en rojo, lo que los clientes le piden a Yeff:
// clientes nuevos que esperan plan (y si tocaron "Solicitar acceso") y funciones que su plan no incluye (p. ej. Nutrición).
// Así no depende de que le llegue la notificación al teléfono. Si no hay nada, no se muestra.
import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { useFocusAnchor } from "@/lib/focus";
import { clientRequests, useFeatureRequests, useResolveFeatureRequest } from "@/lib/requests";
import type { ClientRow } from "@/lib/queries";

const since = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 24 * 60 ? `hace ${Math.round(m / 60)} h` : m < 48 * 60 ? "ayer" : `hace ${Math.round(m / 1440)} días`;
};
export function RequestsCard({ clients }: { clients: ClientRow[] }) {
  const q = useFeatureRequests(), done = useResolveFeatureRequest();
  useFocusAnchor("solicitudes");
  const list = useMemo(() => clientRequests(clients, q.data ?? []), [clients, q.data]);
  if (!list.length) return null;
  return (
    <div className="card req-card" id="solicitudes">
      <div className="card-head"><div><div className="card-tag"><span className="live-dot" aria-hidden />Solicitudes de clientes</div>
        <div className="card-title">{list.length === 1 ? "1 cliente te necesita" : `${list.length} solicitudes por atender`}</div></div></div>
      {list.map((r) => (
        <div key={r.key} className={`dsh-row req-line${r.asked ? " asked" : ""}`}>
          <Link href={`/coach/clientes/${r.clientId}`} className="dsh-main">
            <div className="attn-avatar">{initials(r.name)}</div>
            <div className="attn-body"><div className="attn-name">{r.name}</div>
              <div className="attn-reason urgent">{r.text}</div>
              <div className="req-when">{r.asked ? `Lo pidió ${since(r.at)}` : `Cuenta creada ${since(r.at)}`}</div></div>
          </Link>
          <div className="fu-acts">
            <Link className="dsh-write" href={`/coach/clientes/${r.clientId}`}>{r.kind === "access" ? "Activar plan" : "Cambiar plan"}</Link>
            {r.kind === "feature" && r.reqId && <button type="button" className="attn-ghost" disabled={done.isPending} title="Quítala de la lista (ya lo hablaste o no aplica)" onClick={() => done.mutate(r.reqId!)}><Icon name="check" size={12} stroke={2.4} /> Listo</button>}
          </div>
        </div>))}
      <p className="dsh-note">Los clientes nuevos salen de aquí al activarles un plan; lo que piden, al cambiar su plan o al tocar “Listo”.</p>
    </div>
  );
}
