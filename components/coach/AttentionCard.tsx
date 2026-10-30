"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { needs, type Need, type NeedKind } from "@/lib/attention";
import { useCoachAttention, useNudge, useTodayNudges, type ClientRow, type NudgeKind } from "@/lib/queries";
import { useFocusAnchor } from "@/lib/focus";

// "Necesitan tu atención" (pedido de Cristian, 29-oct): lo importante de cada cliente a la vista, para que a Jeff no se le pase nada.
//  - Urgentes por contactar: 2 días o más sin ninguna actividad, o sin reporte.
//  - Falta configurar: su plan incluye rutina o nutrición y aún no la tiene, o la rutina tiene días vacíos.
//  - Llamada del mes: cada cliente tiene una llamada por mes de plan; desde el día 15 sin agendarla, sale aquí.
//  - Plan por revisar: llegó la fecha de revisión que Jeff marcó en su plan.
const TABS: [NeedKind, string][] = [["urgent", "Urgentes"], ["setup", "Falta configurar"], ["call", "Llamada del mes"], ["review", "Plan por revisar"]];
const EMPTY: Record<NeedKind, string> = { urgent: "Nadie lleva 2 días sin actividad ni sin reporte.", setup: "Todos tienen lo que su plan incluye.", call: "Todos tienen su llamada del mes al día.", review: "No hay planes por revisar." };
const first = (n: string) => n.split(" ")[0] || n;
const draft = (n: Need) => {
  const f = first(n.name);
  if (n.tag === "inactive") return `Hola ${f}, ¿cómo vas? Llevas ${n.days} días sin registrar nada en la app. Cuéntame si necesitas que ajustemos algo.`;
  if (n.tag === "report") return `Hola ${f}, llevas ${n.days} días sin enviar tu reporte. ¿Todo bien? Envíalo hoy desde la app.`;
  if (n.tag === "first_call") return `Hola ${f}, aún no agendas tu primera llamada conmigo. Reserva un horario en Agenda.`;
  return `Hola ${f}, ya toca nuestra llamada del mes. Reserva un horario en Agenda.`;
};
const writeHref = (n: Need) => `/coach/mensajes?c=${n.clientId}&t=${encodeURIComponent(draft(n))}`;

export function AttentionCard({ clients }: { clients: ClientRow[] }) {
  const q = useCoachAttention(), nudges = useTodayNudges(), nudge = useNudge();
  useFocusAnchor("atencion");
  const names = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const list = useMemo(() => needs(q.data ?? [], names), [q.data, names]);
  const count = (k: NeedKind) => new Set(list.filter((n) => n.kind === k).map((n) => n.clientId)).size;
  const [tab, setTab] = useState<NeedKind | null>(null), cur = tab ?? TABS.find(([k]) => count(k) > 0)?.[0] ?? "urgent";
  if (q.isPending) return <div className="card"><div className="sk" style={{ height: 120 }} /></div>;
  if (q.isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos revisar a tus clientes. <button className="filter-chip" onClick={() => q.refetch()}>Reintentar</button></p></div>;
  const total = new Set(list.map((n) => n.clientId)).size;
  // Una fila por cliente en la pestaña elegida (si tiene varias cosas, van juntas).
  const rows = Array.from(list.filter((n) => n.kind === cur).reduce((m, n) => m.set(n.clientId, [...(m.get(n.clientId) ?? []), n]), new Map<string, Need[]>()).values());
  return (
    <div className="card attn-card" id="atencion">
      <div className="card-head"><div><div className="card-tag"><span className="live-dot" aria-hidden />Necesitan tu atención</div>
        <div className="card-title">{total ? `${total} cliente${total === 1 ? "" : "s"} con algo pendiente` : "Todo en orden"}</div></div></div>
      <div className="fu-chips" role="tablist">{TABS.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={cur === k} className={`filter-chip${cur === k ? " active" : ""}${count(k) && k === "urgent" ? " hot" : ""}`} onClick={() => setTab(k)}>{t} <b>{count(k)}</b></button>)}</div>
      {!rows.length && <p className="dsh-empty">{EMPTY[cur]}</p>}
      {rows.map((ns) => {
        const n = ns[0], nk: NudgeKind = n.tag === "report" ? "report" : "nothing", sent = nudges.data?.includes(`${n.clientId}:${nk}`);
        return (
          <div key={n.clientId} className="dsh-row attn-line">
            <Link href={`/coach/clientes/${n.clientId}`} className="dsh-main">
              <div className="attn-avatar">{initials(n.name)}</div>
              <div className="attn-body"><div className="attn-name">{n.name}</div>{ns.map((x) => <div key={x.tag} className={`attn-reason${x.kind === "urgent" ? " urgent" : ""}`}>{x.text}</div>)}</div>
            </Link>
            <div className="fu-acts">
              {cur === "urgent" && (sent
                ? <span className="fu-nudged"><Icon name="check" size={12} stroke={2.4} /> Avisado</span>
                : <button type="button" className="fu-nudge" disabled={nudge.isPending} title="Le llega un aviso automático y lo ve en su pantalla Hoy" onClick={() => nudge.mutate({ clientId: n.clientId, kind: nk })}><Icon name="bell" size={13} /> Avisar</button>)}
              {cur === "setup" && <Link className="dsh-write" href={`/coach/clientes/${n.clientId}?tab=${ns.some((x) => x.tag !== "no_nutrition") ? "Entrenamiento" : "Nutrición"}`}>{ns.some((x) => x.tag === "no_training") ? "Asignar rutina" : ns.some((x) => x.tag !== "no_nutrition") ? "Completar rutina" : "Asignar nutrición"}</Link>}
              {cur === "review" && <Link className="dsh-write" href={`/coach/clientes/${n.clientId}?tab=Entrenamiento`}>Abrir plan</Link>}
              {(cur === "urgent" || cur === "call") && <Link className="dsh-write" href={writeHref(n)}>Escribir</Link>}
              {cur === "call" && <Link className="attn-ghost" href="/coach/agenda">Agendar</Link>}
            </div>
          </div>);
      })}
      {cur === "call" && rows.length > 0 && <p className="dsh-note">“Escribir” deja listo un mensaje para que reserve; “Agendar” abre tu agenda para reservarle tú.</p>}
    </div>
  );
}
