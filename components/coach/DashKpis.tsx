"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useThreads } from "@/lib/messages";
import { localDate, useNutritionClients, useTodayActivity, type ClientRow, type CoachReport, type RecentLog } from "@/lib/queries";
import type { Attn } from "@/lib/attention";
import { useFollowUp } from "@/lib/followup";
import { ago, gradient, initials } from "@/lib/format";
import { hhmm } from "@/lib/dates";

type Panel = "active" | "trained" | "meals" | "reviews";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Row({ i, id, name, sub, urgent, href, write = true }: { i: number; id: string; name: string; sub: string; urgent?: boolean; href?: string; write?: boolean }) {
  return (
    <div className="dsh-row">
      <Link href={href ?? `/coach/clientes/${id}`} className="dsh-main"><div className="attn-avatar" style={{ background: gradient(i) }}>{initials(name)}</div><div className="attn-body"><div className="attn-name">{name}</div><div className={`attn-reason${urgent ? " urgent" : ""}`}>{sub}</div></div></Link>
      {write && <Link href={`/coach/mensajes?c=${id}`} className="dsh-write">Escribir</Link>}
    </div>
  );
}
function Section({ title, n, empty, children }: { title: string; n: number; empty: string; children?: React.ReactNode }) {
  return <section className="dsh-sec"><div className="dsh-sec-h"><b>{title}</b><span>{n}</span></div>{n === 0 ? <p className="dsh-empty">{empty}</p> : children}</section>;
}

// Tarjetas de resumen del dashboard: cada una se abre y muestra quién es, con acceso directo para escribirle.
export function DashKpis({ clients, logs, attn, withPlan, reports }: { clients: ClientRow[]; logs: RecentLog[]; attn: Attn[]; withPlan: Set<string>; reports: CoachReport[] }) {
  const [open, setOpen] = useState<Panel | null>(null);
  const threads = useThreads(), todayEv = useTodayActivity(), nutC = useNutritionClients();
  const today = localDate(), active = clients.filter((c) => c.status === "active"), toActivate = clients.filter((c) => c.status === "pending");
  const byId = new Map(clients.map((c) => [c.id, c]));
  // Último entrenamiento por cliente (para "última actividad").
  const last = new Map<string, string>(); for (const l of logs) if (l.completed && (!last.has(l.clientId) || l.date > last.get(l.clientId)!)) last.set(l.clientId, l.date);
  const lastTxt = (id: string) => last.has(id) ? `Último entrenamiento: ${ago(last.get(id)!)}` : "Sin entrenamientos registrados";
  const ev = todayEv.data ?? [];
  const trainedToday = logs.filter((l) => l.completed && l.date === today);
  const trainedIds = new Set([...trainedToday.map((l) => l.clientId), ...ev.filter((e) => e.kind !== "nutrition_done").map((e) => e.clientId)]);
  const missingTrain = active.filter((c) => withPlan.has(c.id) && !trainedIds.has(c.id));
  const nutSet = new Set(nutC.data ?? []), nutActive = active.filter((c) => nutSet.has(c.id));
  const mealsDoneIds = new Set(ev.filter((e) => e.kind !== "training_done").map((e) => e.clientId));
  const mealsDone = nutActive.filter((c) => mealsDoneIds.has(c.id)), mealsMissing = nutActive.filter((c) => !mealsDoneIds.has(c.id));
  const unreviewed = logs.filter((l) => l.completed && !l.seen), unseenReports = reports.filter((r) => !r.seen);
  const unreadThreads = (threads.data ?? []).filter((t) => t.unread > 0);
  const reviewsTotal = unreviewed.length + unseenReports.length + unreadThreads.length;
  const follow = useFollowUp(clients, logs, withPlan, reports, attn), toWrite = follow.filter((r) => r.missing > 0).length, nothing = follow.filter((r) => r.nothing).length;
  const K = ({ p, label, val, sub, alert }: { p: Panel | "follow"; label: string; val: number | string; sub: string; alert?: boolean }) => (
    <button type="button" className="kpi-card kpi-btn" onClick={() => (p === "follow" ? document.getElementById("seguimiento")?.scrollIntoView({ behavior: "smooth", block: "start" }) : setOpen(p))}><div className="kpi-label">{label}</div><div className="kpi-val">{val}</div><div className={`kpi-sub${alert ? " alert" : ""}`}>{sub}</div><span className="kpi-go" aria-hidden><Icon name="arrow" size={12} /></span></button>
  );
  return (
    <>
      <div className="kpi-strip">
        <K p="active" label="Clientes activos" val={active.length} sub={toActivate.length ? `${toActivate.length} por activar` : "Sin pendientes"} />
        <K p="trained" label="Entrenaron hoy" val={trainedIds.size} sub={`de ${withPlan.size ? active.filter((c) => withPlan.has(c.id)).length : active.length} con plan`} />
        <K p="meals" label="Nutrición hoy" val={mealsDone.length} sub={`de ${nutActive.length} con plan`} />
        <K p="reviews" label="Revisiones pendientes" val={reviewsTotal} sub={reviewsTotal ? "Requiere atención" : "Al día"} alert={reviewsTotal > 0} />
        <K p="follow" label="Por escribirles hoy" val={toWrite} sub={nothing ? `${nothing} sin nada hoy` : toWrite ? "Les falta algo de hoy" : "Todos al día"} alert={nothing > 0} />
      </div>
      {open === "active" && <Modal wide title="Clientes activos" sub={`${active.length} activo${active.length === 1 ? "" : "s"}`} onClose={() => setOpen(null)}>
        <Section title="Activos" n={active.length} empty="Aún no hay clientes activos.">{active.map((c, i) => <Row key={c.id} i={i} id={c.id} name={c.name} sub={`${c.plan ? `Plan ${c.plan}` : "Sin plan"} · ${lastTxt(c.id)}`} />)}</Section>
        {toActivate.length > 0 && <Section title="Por activar" n={toActivate.length} empty="">{toActivate.map((c, i) => <Row key={c.id} i={i} id={c.id} name={c.name} sub="Asígnale un plan para activarlo" write={false} />)}</Section>}
      </Modal>}
      {open === "trained" && <Modal wide title="Entrenamiento de hoy" sub={cap(new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }))} onClose={() => setOpen(null)}>
        <Section title="Ya entrenaron" n={trainedIds.size} empty="Nadie ha completado su entrenamiento todavía.">{Array.from(trainedIds).map((id, i) => { const c = byId.get(id), l = trainedToday.find((x) => x.clientId === id); return c ? <Row key={id} i={i} id={id} name={c.name} write={false} sub={l ? `${l.routine ?? "Entrenamiento"}${l.effort ? ` · esfuerzo ${l.effort}/10` : ""}${l.completedAt ? ` · ${hhmm(l.completedAt)}` : ""}` : "Entrenamiento completado"} /> : null; })}</Section>
        <Section title="Aún no entrenan hoy" n={missingTrain.length} empty="Todos los que tienen plan ya entrenaron.">{missingTrain.map((c, i) => <Row key={c.id} i={i} id={c.id} name={c.name} sub={lastTxt(c.id)} />)}</Section>
        {missingTrain.length > 0 && <p className="dsh-note">Algunos pueden tener hoy su día de descanso.</p>}
      </Modal>}
      {open === "meals" && <Modal wide title="Nutrición de hoy" sub="Clientes con plan de nutrición activo" onClose={() => setOpen(null)}>
        <Section title="Completaron su nutrición" n={mealsDone.length} empty="Nadie ha completado sus comidas todavía.">{mealsDone.map((c, i) => <Row key={c.id} i={i} id={c.id} name={c.name} write={false} sub="Todas las comidas del día marcadas" />)}</Section>
        <Section title="Les falta" n={mealsMissing.length} empty="Todos completaron su nutrición.">{mealsMissing.map((c, i) => <Row key={c.id} i={i} id={c.id} name={c.name} sub="Aún no completa las comidas de hoy" />)}</Section>
      </Modal>}
      {open === "reviews" && <Modal wide title="Revisiones pendientes" sub={`${reviewsTotal} por atender`} onClose={() => setOpen(null)}>
        <Section title="Reportes diarios" n={unseenReports.length} empty="No hay reportes por ver.">{unseenReports.map((r, i) => <Row key={r.id} i={i} id={r.clientId} href="/coach/reportes" write={false} name={r.clientName} sub={`${r.videoState === "uploaded" ? "Con vídeo · " : ""}${cap(ago(r.date))}`} />)}</Section>
        <Section title="Mensajes sin leer" n={unreadThreads.length} empty="No hay mensajes sin leer.">{unreadThreads.map((t, i) => <Row key={t.clientId} i={i} id={t.clientId} href={`/coach/mensajes?c=${t.clientId}`} write={false} name={t.name} sub={`${t.unread} sin leer`} />)}</Section>
        <Section title="Entrenamientos sin revisar" n={unreviewed.length} empty="No hay entrenamientos sin revisar.">{unreviewed.slice(0, 20).map((l, i) => <Row key={l.id} i={i} id={l.clientId} name={l.clientName} write={false} sub={`${l.routine ?? "Entrenamiento"}${l.effort ? ` · esfuerzo ${l.effort}/10` : ""} · ${cap(ago(l.date))}`} urgent={(l.effort ?? 0) >= 9} />)}</Section>
      </Modal>}
    </>
  );
}
