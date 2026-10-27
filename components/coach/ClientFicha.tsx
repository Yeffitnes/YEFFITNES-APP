"use client";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import Link from "next/link";
import { useClientBookings, useClients, usePlans, useSetObjective, useSetPlan } from "@/lib/queries";
import { initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/Modal";
import { TrainingTab } from "./TrainingTab";
import { RecentWorkouts } from "./RecentWorkouts";
import { NotesTab } from "./NotesTab";
import { NutritionTab } from "./NutritionTab";
import { ThreadView } from "@/components/ui/ThreadView";
import { hhmm } from "@/lib/dates";
import { TodayCard } from "./TodayCard";
import { ProgressPanels } from "@/components/portal/ProgressPanels";
const TABS = ["Resumen", "Entrenamiento", "Nutrición", "Progreso", "Mensajes", "Agenda", "Notas privadas"];
const SOON: Record<string, string> = {};
export function ClientFicha({ id }: { id: string }) {
  const { data, isPending } = useClients(), { data: plans } = usePlans(), setPlan = useSetPlan();
  const [tab, setTab] = useState("Resumen");
  const c = data?.find((x) => x.id === id);
  const [sel, setSel] = useState<string | null>(null);
  if (isPending) return <Skeleton rows={3} />;
  if (!c) return <div><Link href="/coach/clientes" className="back-link"><Icon name="back" size={14} /> Volver a clientes</Link><div className="card"><p style={{ fontSize: 14 }}>No encontramos a este cliente.</p></div></div>;
  const chosen = sel ?? c.planId ?? "";
  const since = new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const status = { pending: "Pendiente", active: "Activo", paused: "Pausado" }[c.status];
  return (
    <div>
      <Link href="/coach/clientes" className="back-link"><Icon name="back" size={14} /> Volver a clientes</Link>
      <div className="ficha-header"><div className="ficha-avatar">{initials(c.name)}</div>
        <div><div className="ficha-name">{c.name}</div><div className="ficha-meta">Cliente desde {since} · {c.plan ? `Plan ${c.plan}` : "Sin plan"}</div></div></div>
      <div className="tab-row">{TABS.map((t) => <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Resumen" ? (
        <>
          <TodayCard clientId={c.id} first={c.name.split(" ")[0]} onGo={setTab} />
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
          <ObjectiveCard clientId={c.id} value={c.objective ?? ""} first={c.name.split(" ")[0]} />
          <RecentWorkouts clientId={c.id} />
        </>
      ) : tab === "Entrenamiento" ? <TrainingTab clientId={c.id} clientName={c.name} /> : tab === "Progreso" ? <ProgressPanels clientId={c.id} mode="coach" /> : tab === "Nutrición" ? <NutritionTab clientId={c.id} clientName={c.name} hasFeature={!!plans?.find((p) => p.id === c.planId)?.features?.includes("nutrition")} /> : tab === "Mensajes" ? <ThreadView clientId={c.id} otherName={c.name.split(" ")[0]} coach /> : tab === "Agenda" ? <AgendaTab clientId={c.id} first={c.name.split(" ")[0]} /> : tab === "Notas privadas" ? <NotesTab clientId={c.id} clientName={c.name} /> : <div className="card"><div className="card-tag">{tab}</div><p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 10 }}>{SOON[tab]} <span style={{ color: "var(--accent)", fontWeight: 700 }}>Próximamente.</span></p></div>}
    </div>
  );
}

function ObjectiveCard({ clientId, value, first }: { clientId: string; value: string; first: string }) {
  const set = useSetObjective(clientId), [t, setT] = useState<string | null>(null), cur = t ?? value;
  return (
    <div className="card" style={{ maxWidth: 560, margin: "18px 0" }}>
      <div className="card-tag">Objetivo actual</div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0" }}>{first} lo ve en su pantalla “Hoy”.</p>
      <textarea aria-label="Objetivo actual" maxLength={500} value={cur} onChange={(e) => setT(e.target.value)} placeholder="Ej. Bajar grasa corporal manteniendo la fuerza en tren superior." style={{ width: "100%", minHeight: 70, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
      <div style={{ marginTop: 10 }}><button className="primary-btn" disabled={set.isPending || cur.trim() === value.trim()} onClick={() => set.mutate(cur, { onSuccess: () => setT(null) })}>{set.isPending ? "Guardando…" : "Guardar objetivo"}</button></div>
    </div>
  );
}

const BK: Record<string, string> = { confirmed: "Confirmada", cancelled: "Cancelada", completed: "Realizada", no_show: "No asistió" };
function AgendaTab({ clientId, first }: { clientId: string; first: string }) {
  const { data, isPending, isError, refetch } = useClientBookings(clientId);
  if (isPending) return <Skeleton rows={2} />;
  if (isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar la agenda. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>;
  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div className="card-tag" style={{ marginBottom: 0 }}>Sesiones de {first}</div><Link href="/coach/agenda" className="card-link">Ir a la agenda <Icon name="arrow" size={12} /></Link></div>
      {!data.length && <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 12 }}>{first} aún no tiene sesiones.</p>}
      {data.map((b) => <div key={b.id} className="info-list-row"><span style={{ fontWeight: 700 }}>{new Date(b.startsAt).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} · {hhmm(b.startsAt)}</span><span style={{ color: "var(--text-dim)" }}>{b.capacity > 1 ? "Clase grupal" : ""} {b.duration} min</span><span style={{ color: b.status === "confirmed" ? "#1C9A5B" : "var(--text-faint)", fontWeight: 700, fontSize: 12 }}>{BK[b.status] ?? b.status}</span></div>)}
    </div>
  );
}
