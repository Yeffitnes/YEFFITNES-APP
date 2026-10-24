"use client";
import { useState } from "react";
import Link from "next/link";
import { useClients, usePlans, useSetPlan } from "@/lib/queries";
import { initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/Modal";
import { TrainingTab } from "./TrainingTab";
import { RecentWorkouts } from "./RecentWorkouts";
import { ProgressPanels } from "@/components/portal/ProgressPanels";
const TABS = ["Resumen", "Entrenamiento", "Nutrición", "Progreso", "Notas privadas"];
const SOON: Record<string, string> = { "Nutrición": "Aquí se armará el plan de nutrición del cliente a partir de plantillas.", "Notas privadas": "Notas solo para ti: el cliente nunca las ve." };
export function ClientFicha({ id }: { id: string }) {
  const { data, isPending } = useClients(), { data: plans } = usePlans(), setPlan = useSetPlan();
  const [tab, setTab] = useState("Resumen");
  const c = data?.find((x) => x.id === id);
  const [sel, setSel] = useState<string | null>(null);
  if (isPending) return <Skeleton rows={3} />;
  if (!c) return <div><Link href="/coach/clientes" className="back-link">← Volver a clientes</Link><div className="card"><p style={{ fontSize: 14 }}>No encontramos a este cliente.</p></div></div>;
  const chosen = sel ?? c.planId ?? "";
  const since = new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const status = { pending: "Pendiente", active: "Activo", paused: "Pausado" }[c.status];
  return (
    <div>
      <Link href="/coach/clientes" className="back-link">← Volver a clientes</Link>
      <div className="ficha-header"><div className="ficha-avatar">{initials(c.name)}</div>
        <div><div className="ficha-name">{c.name}</div><div className="ficha-meta">Cliente desde {since} · {c.plan ? `Plan ${c.plan}` : "Sin plan"}</div></div></div>
      <div className="tab-row">{TABS.map((t) => <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Resumen" ? (
        <>
          <div className="mini-kpi-strip">
            <div className="mini-kpi"><div className="mini-kpi-label">Estado</div><div className="mini-kpi-val">{status}</div></div>
            <div className="mini-kpi"><div className="mini-kpi-label">Plan</div><div className="mini-kpi-val">{c.plan ?? "—"}</div></div>
            <div className="mini-kpi"><div className="mini-kpi-label">Registro</div><div className="mini-kpi-val">{new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</div></div>
          </div>
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-tag">Plan y acceso</div>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0 14px", lineHeight: 1.5 }}>Al asignar un plan el cliente queda activo y ve solo lo que ese plan incluye. Sin plan, todo aparece bloqueado.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select aria-label="Plan" value={chosen} onChange={(e) => setSel(e.target.value)} style={{ height: 38, borderRadius: 11, border: "1px solid var(--line)", padding: "0 12px", fontSize: 13, flex: 1, minWidth: 180 }}>
                <option value="">Sin plan (pendiente)</option>{plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="primary-btn" disabled={setPlan.isPending || chosen === (c.planId ?? "")} onClick={() => setPlan.mutate({ id: c.id, planId: chosen || null }, { onSuccess: () => setSel(null) })}>Guardar</button>
            </div>
          </div>
          <RecentWorkouts clientId={c.id} />
        </>
      ) : tab === "Entrenamiento" ? <TrainingTab clientId={c.id} clientName={c.name} /> : tab === "Progreso" ? <ProgressPanels clientId={c.id} mode="coach" /> : <div className="card"><div className="card-tag">{tab}</div><p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 10 }}>{SOON[tab]} <span style={{ color: "var(--accent)", fontWeight: 700 }}>Próximamente.</span></p></div>}
    </div>
  );
}
