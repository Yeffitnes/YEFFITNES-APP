"use client";
import Link from "next/link";
import { useActivePlanClients, useClients, useRecentLogs, localDate } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { attention } from "@/lib/attention";
import { ago, gradient, initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/Modal";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function DashboardView() {
  const { name } = useProfile(), clients = useClients(), logs = useRecentLogs(), plans = useActivePlanClients();
  if (clients.isPending || logs.isPending || plans.isPending) return <div><div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} /><div className="sk" style={{ height: 90, marginBottom: 18 }} /><Skeleton rows={3} /></div>;
  if (clients.isError || logs.isError || plans.isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el panel. <button className="filter-chip" onClick={() => { clients.refetch(); logs.refetch(); plans.refetch(); }}>Reintentar</button></p></div>;
  const cl = clients.data, lg = logs.data, active = cl.filter((c) => c.status === "active"), pending = cl.filter((c) => c.status === "pending").length;
  const attn = attention(cl, lg, new Set(plans.data)), today = localDate();
  const trainedToday = new Set(lg.filter((l) => l.completed && l.date === today).map((l) => l.clientId)).size;
  const unreviewed = lg.filter((l) => l.completed && !l.seen).length;
  const recent = lg.filter((l) => l.completed && l.completedAt).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, 6);
  const sub = unreviewed ? `Tienes ${unreviewed} entrenamiento${unreviewed > 1 ? "s" : ""} esperando revisión.` : "No tienes revisiones pendientes.";
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Panel — {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Hola, {name.split(" ")[0] || "Coach"}</h1>
        <p className="greeting-sub">{sub}{pending ? ` ${pending} cliente${pending > 1 ? "s" : ""} por activar.` : ""}</p></div></div>
      <div className="kpi-strip">
        <div className="kpi-card"><div className="kpi-label">Clientes activos</div><div className="kpi-val">{active.length}</div><div className="kpi-sub">{pending ? `${pending} por activar` : "Sin pendientes"}</div></div>
        <div className="kpi-card"><div className="kpi-label">Entrenaron hoy</div><div className="kpi-val">{trainedToday}</div><div className="kpi-sub">de {active.length} activos</div></div>
        <div className="kpi-card"><div className="kpi-label">Revisiones pendientes</div><div className="kpi-val">{unreviewed}</div><div className={`kpi-sub${unreviewed ? " alert" : ""}`}>{unreviewed ? "Requiere atención" : "Al día"}</div></div>
        <div className="kpi-card"><div className="kpi-label">Clientes por revisar</div><div className="kpi-val">{attn.length}</div><div className={`kpi-sub${attn.some((a) => a.urgent) ? " alert" : ""}`}>{attn.some((a) => a.urgent) ? "Hay casos urgentes" : "Ordenados por urgencia"}</div></div>
      </div>
      <div className="dash-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-tag">Necesitan atención</div><div className="card-title">Clientes por revisar</div></div><Link href="/coach/clientes" className="card-link">Ver todos →</Link></div>
            {!attn.length && <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 8 }}>{active.length ? "Todo al día. Ningún cliente necesita atención ahora." : "Aún no hay clientes activos. Activa a un cliente asignándole un plan."}</p>}
            {attn.map((a, i) => (
              <Link key={a.clientId} href={`/coach/clientes/${a.clientId}`} className="attn-row">
                <div className="attn-avatar" style={{ background: gradient(i) }}>{initials(a.name)}</div>
                <div className="attn-body"><div className="attn-name">{a.name}</div><div className={`attn-reason${a.urgent ? " urgent" : ""}`}>{a.reason}</div></div>
              </Link>))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-tag">Reciente</div><div className="card-title" style={{ fontSize: 15 }}>Actividad</div>
            {!recent.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8 }}>Cuando tus clientes terminen entrenamientos aparecerán aquí.</p>}
            <div style={{ marginTop: 8 }}>{recent.map((r) => (
              <Link key={r.id} href={`/coach/clientes/${r.clientId}`} className="activity-row">
                <div className="activity-icon"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" /></svg></div>
                <div><div className="activity-text"><b>{r.clientName}</b> terminó {r.routine ? r.routine.toLowerCase() : "su entrenamiento"}{r.effort ? ` · esfuerzo ${r.effort}/10` : ""}</div><div className="activity-time">{cap(ago(r.date))}</div></div>
              </Link>))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
