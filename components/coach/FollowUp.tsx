"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { gradient, initials } from "@/lib/format";
import { useFollowUp, type FollowRow, type Item } from "@/lib/followup";
import { useNudge, useTodayNudges, type ClientRow, type CoachReport, type NudgeKind, type RecentLog } from "@/lib/queries";
import type { Attn } from "@/lib/attention";

type F = "need" | "nothing" | "report" | "train" | "meals" | "ok";
const Pill = ({ s, label }: { s: Item; label: string }) => s === "na" ? null : <span className={`fu-pill ${s}`}>{s === "done" ? <Icon name="check" size={11} stroke={2.6} /> : <i aria-hidden />}{label}</span>;

export function FollowUpCard(p: { clients: ClientRow[]; logs: RecentLog[]; withPlan: Set<string>; reports: CoachReport[]; attn: Attn[] }) { return <FollowUp rows={useFollowUp(p.clients, p.logs, p.withPlan, p.reports, p.attn)} />; }
// "Seguimiento de hoy": quién no ha hecho lo suyo hoy, para escribirle rápido.
export function FollowUp({ rows }: { rows: FollowRow[] }) {
  const [f, setF] = useState<F>("need");
  const test: Record<F, (r: FollowRow) => boolean> = { need: (r) => r.missing > 0, nothing: (r) => r.nothing, report: (r) => r.report === "missing", train: (r) => r.train === "missing", meals: (r) => r.meals === "missing", ok: (r) => r.missing === 0 };
  const CH: [F, string][] = [["need", "Por escribir"], ["nothing", "Sin nada hoy"], ["report", "Sin reporte"], ["train", "Sin entrenar"], ["meals", "Sin nutrición"], ["ok", "Al día"]];
  const list = rows.filter(test[f]), need = rows.filter(test.need).length, nudges = useTodayNudges(), nudge = useNudge();
  // En "Sin nada", "Sin reporte", "Sin entrenar" y "Sin nutrición": botón "Avisar" con el mensaje automático de ese filtro. En "Por escribir", solo Escribir.
  const nk: NudgeKind | null = f === "nothing" ? "nothing" : f === "report" ? "report" : f === "train" ? "train" : f === "meals" ? "meals" : null;
  return (
    <div className="card" id="seguimiento">
      <div className="card-head"><div><div className="card-tag">Seguimiento</div><div className="card-title">Hoy: a quién escribirle</div></div></div>
      <p className="fu-sub">{rows.length ? (need ? `${need} de ${rows.length} clientes aún no completan lo de hoy.` : "Todos tus clientes están al día hoy.") : "Aún no hay clientes activos."}{nk ? " “Avisar” le envía al cliente un aviso automático sobre esto." : ""}</p>
      <div className="fu-chips" role="tablist">{CH.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={f === k} className={`filter-chip${f === k ? " active" : ""}`} onClick={() => setF(k)}>{t} <b>{rows.filter(test[k]).length}</b></button>)}</div>
      {!list.length && rows.length > 0 && <p className="dsh-empty">Nadie en este filtro.</p>}
      {list.map((r, i) => (
        <div key={r.id} className="dsh-row fu-row">
          <Link href={`/coach/clientes/${r.id}`} className="dsh-main">
            <div className="attn-avatar" style={{ background: gradient(i) }}>{initials(r.name)}</div>
            <div className="attn-body"><div className="attn-name">{r.name}</div>
              <div className="fu-pills"><Pill s={r.train} label="Entreno" /><Pill s={r.meals} label="Nutrición" /><Pill s={r.report} label="Reporte" /></div>
              {r.note && <div className={`attn-reason${r.urgent ? " urgent" : ""}`}>{r.note}</div>}</div>
          </Link>
          {r.missing > 0 && <div className="fu-acts">
            {nk && (nudges.data?.includes(`${r.id}:${nk}`)
              ? <span className="fu-nudged"><Icon name="check" size={12} stroke={2.4} /> Avisado</span>
              : <button type="button" className="fu-nudge" disabled={nudge.isPending} title="Le llega un aviso automático en el teléfono" onClick={() => nudge.mutate({ clientId: r.id, kind: nk })}><Icon name="bell" size={13} /> Avisar</button>)}
            <Link href={`/coach/mensajes?c=${r.id}`} className="dsh-write">Escribir</Link></div>}
        </div>))}
    </div>
  );
}
