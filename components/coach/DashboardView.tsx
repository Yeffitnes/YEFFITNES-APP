"use client";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { localDate, useActivePlanClients, useActivityFeed, useClients, useCoachReports, useCoachSlots, useRecentLogs, type CoachReport, type RecentLog } from "@/lib/queries";
import { useState } from "react";
import { gradient, initials } from "@/lib/format";
import { useThreads } from "@/lib/messages";
import { hhmm, sameDay } from "@/lib/dates";
import { useProfile } from "@/components/Providers";
import { attention } from "@/lib/attention";
import { Skeleton } from "@/components/ui/Modal";
import { DashKpis } from "./DashKpis";
import { FollowUpCard } from "./FollowUp";
import { AnnouncementsCard } from "./AnnouncementsCard";
import { ActivityCard } from "./ActivityCard";
export function DashboardView() {
  const { name } = useProfile(), clients = useClients(), logs = useRecentLogs(), plans = useActivePlanClients(), reports = useCoachReports();
  if (clients.isPending || logs.isPending || plans.isPending) return <div><div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} /><div className="sk" style={{ height: 90, marginBottom: 18 }} /><Skeleton rows={3} /></div>;
  if (clients.isError || logs.isError || plans.isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el panel. <button className="filter-chip" onClick={() => { clients.refetch(); logs.refetch(); plans.refetch(); }}>Reintentar</button></p></div>;
  const cl = clients.data, lg = logs.data, pending = cl.filter((c) => c.status === "pending").length;
  const attn = attention(cl, lg, new Set(plans.data));
  const unreviewed = lg.filter((l) => l.completed && !l.seen).length;
  const unseenReports = (reports.data ?? []).filter((r) => !r.seen).length;
  const sub = unseenReports ? `Tienes ${unseenReports} reporte${unseenReports > 1 ? "s" : ""} diario${unseenReports > 1 ? "s" : ""} por revisar.` : unreviewed ? `Tienes ${unreviewed} entrenamiento${unreviewed > 1 ? "s" : ""} esperando revisión.` : "No tienes revisiones pendientes.";
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Panel — {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div><h1>Hola, {name.split(" ")[0] || "Coach"}</h1>
        <p className="greeting-sub">{sub}{pending ? ` ${pending} cliente${pending > 1 ? "s" : ""} por activar.` : ""}</p></div></div>
      <DashKpis clients={cl} logs={lg} attn={attn} withPlan={new Set(plans.data)} reports={reports.data ?? []} />
      <div className="dash-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <FollowUpCard clients={cl} logs={lg} withPlan={new Set(plans.data)} reports={reports.data ?? []} attn={attn} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {unseenReports > 0 && <Link href="/coach/reportes" className="card card-dark" style={{ display: "block" }}><div className="card-tag">Reportes diarios</div><div className="card-title" style={{ fontSize: 15 }}>{unseenReports} por revisar <Icon name="arrow" size={13} /></div></Link>}
          <MessagesCard />
          <AgendaTodayCard />
          <ActivityCard />
          <AnnouncementsCard />
          <RecentToday logs={lg} reports={reports.data ?? []} />
        </div>
      </div>
    </div>
  );
}

function MessagesCard() {
  const t = useThreads(), unread = (t.data ?? []).filter((x) => x.unread > 0).slice(0, 4), total = (t.data ?? []).reduce((a, x) => a + x.unread, 0);
  if (!total) return null;
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-tag">Mensajes</div><div className="card-title" style={{ fontSize: 15 }}>{total} sin leer</div></div><Link href="/coach/mensajes" className="card-link">Abrir <Icon name="arrow" size={12} /></Link></div>
      {unread.map((x) => <Link key={x.clientId} href={`/coach/mensajes?c=${x.clientId}`} className="activity-row"><div className="activity-icon"><svg viewBox="0 0 20 20"><path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h10a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 14H9l-3.5 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7z" /></svg></div><div><div className="activity-text"><b>{x.name}</b>{x.unread > 1 ? ` (${x.unread})` : ""}: {x.lastBody ?? (x.lastKind === "video" ? "Vídeo" : "Foto")}</div></div></Link>)}
    </div>
  );
}
// Sesiones reservadas de hoy y aviso si aún no hay horarios publicados para la próxima semana.
function AgendaTodayCard() {
  const wk = useCoachSlots(0), nx = useCoachSlots(1), now = new Date();
  const todays = (wk.data ?? []).filter((s) => s.booking && sameDay(new Date(s.startsAt), now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nudge = nx.data && !nx.data.length && (now.getDay() === 0 || now.getDay() >= 4);
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-tag">Agenda</div><div className="card-title" style={{ fontSize: 15 }}>Sesiones de hoy</div></div><Link href="/coach/agenda" className="card-link">Ver agenda <Icon name="arrow" size={12} /></Link></div>
      {wk.isPending && <div className="sk" style={{ height: 48 }} />}
      {wk.data && !todays.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8 }}>No tienes sesiones reservadas hoy.</p>}
      {todays.map((s) => <div key={s.id} className="info-list-row"><span style={{ fontWeight: 700 }}>{hhmm(s.startsAt)}</span><span>{s.capacity > 1 ? `Clase grupal: ${s.bookings.map((b) => b.clientName).join(", ")}` : s.booking!.clientName}</span></div>)}
      {nudge && <Link href="/coach/agenda" className="attn-row" style={{ marginTop: 10 }}><div className="attn-body"><div className="attn-name">Publica tus horarios de la próxima semana</div><div className="attn-reason urgent">Aún no hay horarios disponibles para tus clientes.</div></div></Link>}
    </div>
  );
}

// "Actividad de hoy" agrupada por cliente (pedido de Cristian, 27-oct): una fila por cliente que se despliega con lo que hizo hoy.
// Solo cuenta lo de hoy; lo de días anteriores no aparece (y la actividad de más de 24 h se borra sola, migración 0036).
function RecentToday({ logs, reports }: { logs: RecentLog[]; reports: CoachReport[] }) {
  const feed = useActivityFeed(), [open, setOpen] = useState<string | null>(null), today = localDate();
  type Item = { at: string; text: string };
  const by = new Map<string, { name: string; items: Item[] }>();
  const add = (id: string, name: string, it: Item) => { const g = by.get(id) ?? { name, items: [] }; g.items.push(it); by.set(id, g); };
  logs.filter((l) => l.completed && l.completedAt && l.date === today).forEach((l) => add(l.clientId, l.clientName, { at: l.completedAt!, text: `Terminó ${l.routine ? l.routine.toLowerCase() : "su entrenamiento"}${l.effort ? ` · esfuerzo ${l.effort}/10` : ""}` }));
  (feed.data ?? []).filter((a) => a.kind === "nutrition_done").forEach((a) => add(a.clientId, a.clientName, { at: a.at, text: "Completó su nutrición" }));
  reports.filter((r) => r.date === today).forEach((r) => add(r.clientId, r.clientName, { at: r.sentAt, text: r.videoState === "uploaded" ? "Envió su reporte con vídeo" : "Envió su reporte" }));
  const groups = Array.from(by.entries()).map(([id, g]) => ({ id, ...g, items: g.items.sort((a, b) => b.at.localeCompare(a.at)) })).sort((a, b) => b.items[0].at.localeCompare(a.items[0].at));
  return (
    <div className="card">
      <div className="card-tag">Hoy</div><div className="card-title" style={{ fontSize: 15 }}>Actividad de tus clientes</div>
      {!groups.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8 }}>Cuando tus clientes entrenen, completen su nutrición o envíen su reporte hoy, aparecerán aquí.</p>}
      <div style={{ marginTop: 8 }}>{groups.map((g, i) => (
        <div key={g.id} className="act-group">
          <button type="button" className="act-group-head" aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
            <span className="attn-avatar" style={{ background: gradient(i), width: 30, height: 30, fontSize: 11 }}>{initials(g.name)}</span>
            <span className="act-group-name"><b>{g.name}</b><small>{g.items.length} {g.items.length === 1 ? "actividad" : "actividades"} · {hhmm(g.items[0].at)}</small></span>
            <Icon name={open === g.id ? "up" : "down"} size={14} />
          </button>
          {open === g.id && <div className="act-group-list">
            {g.items.map((it, k) => <div key={k} className="act-group-item"><span className="act-dot" /><span>{it.text}</span><time>{hhmm(it.at)}</time></div>)}
            <Link href={`/coach/clientes/${g.id}`} className="card-link" style={{ marginTop: 6 }}>Abrir ficha <Icon name="arrow" size={12} /></Link>
          </div>}
        </div>))}</div>
    </div>
  );
}
