"use client";
import { WeekSummary } from "@/components/WeekSummary";
import { Icon } from "@/components/ui/Icon";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClientBookings, useClients, useRenewPlan, useObjectiveVideo, usePlans, useSetObjective, useSetPlan } from "@/lib/queries";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { ago, initials } from "@/lib/format";
import { planMonth, planMonthText, shortDate } from "@/lib/planmonth";
import type { ClientRow, Plan } from "@/lib/queries";
import { Skeleton } from "@/components/ui/Modal";
import { TrainingTab } from "./TrainingTab";
import { RecentWorkouts } from "./RecentWorkouts";
import { NotesTab } from "./NotesTab";
import { NutritionTab } from "./NutritionTab";
import { ThreadView } from "@/components/ui/ThreadView";
import { hhmm } from "@/lib/dates";
import { TodayCard } from "./TodayCard";
import { CancelModal, type CancelTarget } from "./AgendaView";
import { useNow } from "@/lib/use-now";
import { ProgressPanels } from "@/components/portal/ProgressPanels";
const TABS = ["Hoy", "Resumen", "Entrenamiento", "Nutrición", "Progreso", "Mensajes", "Agenda", "Notas privadas"];
const SOON: Record<string, string> = {};
export function ClientFicha({ id, tab: start }: { id: string; tab?: string }) {
  const { data, isPending } = useClients(), { data: plans } = usePlans();
  const [tab, setTab] = useState(start && TABS.includes(start) ? start : "Hoy");
  const c = data?.find((x) => x.id === id);
  if (isPending) return <Skeleton rows={3} />;
  if (!c) return <div><Link href="/coach/clientes" className="back-link"><Icon name="back" size={14} /> Volver a clientes</Link><div className="card"><p style={{ fontSize: 14 }}>No encontramos a este cliente.</p></div></div>;
  const since = new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const status = { pending: "Pendiente", active: "Activo", paused: "Pausado" }[c.status];
  return (
    <div>
      <Link href="/coach/clientes" className="back-link"><Icon name="back" size={14} /> Volver a clientes</Link>
      <div className="ficha-header"><div className="ficha-avatar">{initials(c.name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}><div className="ficha-name">{c.name}</div><div className="ficha-meta">Cliente desde {since} · {status}{c.heightCm ? ` · ${(c.heightCm / 100).toFixed(2).replace(".", ",")} m` : ""}{c.startWeight ? ` · empezó con ${String(c.startWeight).replace(".", ",")} kg` : ""}</div><PlanMonthLine c={c} /></div>
        <PlanPicker c={c} plans={plans ?? []} /></div>
      <div className="tab-row">{TABS.map((t) => <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Hoy" ? <TodayCard clientId={c.id} first={c.name.split(" ")[0]} onGo={setTab} /> : tab === "Resumen" ? (
        <>
          <div className="mini-kpi-strip">
            <div className="mini-kpi"><div className="mini-kpi-label">Estado</div><div className="mini-kpi-val">{status}</div></div>
            <div className="mini-kpi"><div className="mini-kpi-label">Registro</div><div className="mini-kpi-val">{new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</div></div>
          </div>
          <WeekSummary clientId={c.id} first={c.name.split(" ")[0]} mode="coach" />
          <ObjectiveCard clientId={c.id} value={c.objective ?? ""} first={c.name.split(" ")[0]} hasVideo={!!c.objectiveVideo} />
          <RecentWorkouts clientId={c.id} />
        </>
      ) : tab === "Entrenamiento" ? <TrainingTab clientId={c.id} clientName={c.name} /> : tab === "Progreso" ? <ProgressPanels clientId={c.id} mode="coach" /> : tab === "Nutrición" ? <NutritionTab clientId={c.id} clientName={c.name} hasFeature={!!plans?.find((p) => p.id === c.planId)?.features?.includes("nutrition")} /> : tab === "Mensajes" ? <ThreadView clientId={c.id} otherName={c.name.split(" ")[0]} coach /> : tab === "Agenda" ? <AgendaTab clientId={c.id} first={c.name.split(" ")[0]} /> : tab === "Notas privadas" ? <NotesTab clientId={c.id} clientName={c.name} /> : <div className="card"><div className="card-tag">{tab}</div><p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 10 }}>{SOON[tab]} <span style={{ color: "var(--accent)", fontWeight: 700 }}>Próximamente.</span></p></div>}
    </div>
  );
}

// Plan del cliente, arriba junto a su nombre (pedido de Cristian, 27-oct): se ve de primeras y se cambia con dos toques.
// Asignar un plan activa al cliente (y le llega "Tu plan está activo"); "Sin plan" lo deja pendiente con todo bloqueado.
// Mes de plan (0038): cuándo vence y botón para renovar otros 30 días.
function PlanMonthLine({ c }: { c: ClientRow }) {
  const renew = useRenewPlan(), m = c.status === "active" && c.planId ? planMonth(c.planSince) : null;
  if (!m) return null;
  return <div className={`plan-month${m.expired ? " expired" : m.soon ? " soon" : ""}`}>
    <span>Plan del {shortDate(m.since)} · {planMonthText(m)}</span>
    {(m.expired || m.soon) && <button type="button" disabled={renew.isPending} onClick={() => renew.mutate(c.id)}>{renew.isPending ? "Renovando…" : "Renovar 30 días"}</button>}
  </div>;
}
function PlanPicker({ c, plans }: { c: ClientRow; plans: Plan[] }) {
  const setPlan = useSetPlan(), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }, esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (planId: string | null) => { setOpen(false); if (planId !== c.planId) setPlan.mutate({ id: c.id, planId }); };
  const needs = !c.planId;
  return (
    <div className="plan-pick" ref={box}>
      <button type="button" className={`plan-pill${needs ? " needs" : ""}`} aria-haspopup="listbox" aria-expanded={open} disabled={setPlan.isPending} onClick={() => setOpen((v) => !v)}>
        <span className="plan-pill-lbl">{needs ? (c.accessRequestedAt ? `Pidió acceso ${ago(c.accessRequestedAt).toLowerCase()}` : "Sin plan") : "Plan"}</span>
        <b>{setPlan.isPending ? "Guardando…" : needs ? "Asignar plan" : c.plan}</b><Icon name="down" size={13} />
      </button>
      {open && <div className="plan-menu" role="listbox" aria-label="Elegir plan">
        {plans.map((p) => <button key={p.id} type="button" role="option" aria-selected={p.id === c.planId} className={p.id === c.planId ? "on" : ""} onClick={() => pick(p.id)}>{p.name}{p.id === c.planId && <Icon name="check" size={13} stroke={2.4} />}</button>)}
        <button type="button" role="option" aria-selected={!c.planId} className={`off${!c.planId ? " on" : ""}`} onClick={() => pick(null)}>Sin plan (todo bloqueado)</button>
      </div>}
    </div>
  );
}

function ObjectiveCard({ clientId, value, first, hasVideo }: { clientId: string; value: string; first: string; hasVideo: boolean }) {
  const set = useSetObjective(clientId), [t, setT] = useState<string | null>(null), cur = t ?? value, vid = useObjectiveVideo(clientId), fileIn = useRef<HTMLInputElement>(null), [watch, setWatch] = useState(false), [vErr, setVErr] = useState("");
  const pickVideo = async (f: File | null) => { setVErr(""); if (!f) return; if (!f.type.startsWith("video/")) return setVErr("Elige un archivo de vídeo."); if (f.size > MAX_COACH_VIDEO_MB * 1024 * 1024) return setVErr("El vídeo es muy pesado."); const d = await videoDuration(f); if (d != null && d > MAX_COACH_VIDEO_SECONDS) return setVErr(`El vídeo dura más de ${MAX_COACH_VIDEO_SECONDS / 60} minutos.`); vid.upload(f); };
  return (
    <div className="card" style={{ maxWidth: 560, margin: "18px 0" }}>
      <div className="card-tag">Objetivo actual</div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0" }}>{first} lo ve en su pantalla “Hoy”. Puedes acompañarlo con un vídeo tuyo explicándolo.</p>
      <textarea aria-label="Objetivo actual" maxLength={500} value={cur} onChange={(e) => setT(e.target.value)} placeholder="Ej. Bajar grasa corporal manteniendo la fuerza en tren superior." style={{ width: "100%", minHeight: 70, border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 13.5, resize: "vertical" }} />
      <div style={{ marginTop: 10 }}><button className="primary-btn" disabled={set.isPending || cur.trim() === value.trim()} onClick={() => set.mutate(cur, { onSuccess: () => setT(null) })}>{set.isPending ? "Guardando…" : "Guardar objetivo"}</button></div>
      <div className="obj-video">
        <input ref={fileIn} type="file" accept="video/*" hidden onChange={(e) => { void pickVideo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        {hasVideo ? <>
          <button type="button" className="ghost-btn" onClick={() => setWatch(true)}><Icon name="play" size={12} /> Ver vídeo</button>
          <button type="button" className="ghost-btn" onClick={() => fileIn.current?.click()}>Cambiar vídeo</button>
          <button type="button" className="ghost-btn" disabled={vid.remove.isPending} onClick={() => vid.remove.mutate()}>Quitar</button>
        </> : <button type="button" className="ghost-btn" onClick={() => fileIn.current?.click()}><Icon name="video" size={13} /> Subir vídeo del objetivo</button>}
        {vErr && <p role="alert" style={{ color: "var(--accent)", fontSize: 12.5, width: "100%" }}>{vErr}</p>}
      </div>
      {watch && <BunnyModal param={`objective=${clientId}`} title="Vídeo del objetivo" onClose={() => setWatch(false)} />}
    </div>
  );
}

const BK: Record<string, string> = { confirmed: "Confirmada", cancelled: "Cancelada", completed: "Realizada", no_show: "No asistió" };
// Sesiones del cliente (pedido de Cristian, 29-oct): Jeff también puede cancelar desde aquí, sin ir a la Agenda. Las que ya pasaron
// salen como "Realizada" (antes seguían como "Confirmada").
function AgendaTab({ clientId, first }: { clientId: string; first: string }) {
  const { data, isPending, isError, refetch } = useClientBookings(clientId), now = useNow(), [cancel, setCancel] = useState<CancelTarget | null>(null), { data: clients } = useClients();
  if (isPending) return <Skeleton rows={2} />;
  if (isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar la agenda. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>;
  const name = clients?.find((c) => c.id === clientId)?.name ?? first;
  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div className="card-tag" style={{ marginBottom: 0 }}>Sesiones de {first}</div><Link href="/coach/agenda" className="card-link">Ir a la agenda <Icon name="arrow" size={12} /></Link></div>
      {!data.length && <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 12 }}>{first} aún no tiene sesiones.</p>}
      {data.map((b) => {
        const ended = new Date(b.startsAt).getTime() + b.duration * 60_000 <= now.getTime(), st = b.status === "confirmed" && ended ? "completed" : b.status;
        return <div key={b.id} className={`info-list-row bk-row ${st}`}><span style={{ fontWeight: 700 }}>{new Date(b.startsAt).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} · {hhmm(b.startsAt)}</span><span style={{ color: "var(--text-dim)" }}>{b.capacity > 1 ? "Clase grupal · " : ""}{b.duration} min{b.bookedBy === "coach" ? " · la agendaste tú" : ""}</span>
          <span className="bk-st">{BK[st] ?? st}</span>
          {st === "confirmed" && <button type="button" className="bk-cancel" onClick={() => setCancel({ bookingId: b.id, clientName: name, startsAt: b.startsAt })}>Cancelar</button>}</div>;
      })}
      {cancel && <CancelModal t={cancel} onClose={() => setCancel(null)} />}
    </div>
  );
}
