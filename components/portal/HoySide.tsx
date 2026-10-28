"use client";
import { useState } from "react";
import { Guide } from "./Guide";
import { PlanWait } from "./LockedPanel";
import Link from "next/link";
import { localDate, useClientNutrition, useMaterialList, useMealLogs, useMeasures, useMyBookings, useOpenMaterial, useMe, type MaterialOpen } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { KIND_LABEL } from "@/lib/queries";
import { DAY3, hhmm } from "@/lib/dates";
import { todayWeekday } from "@/lib/week";
import { VideoModal } from "./VideoModal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { MealChecklist } from "./MealChecklist";
import { Icon } from "@/components/ui/Icon";
import { icsHref } from "@/lib/ics";
const ARROW = <svg viewBox="0 0 10 10"><path d="M2 5h6M5 2l3 3-3 3" /></svg>;
// Tarjetas laterales de "Hoy" (diseño portal-hoy): próxima sesión, objetivo, nutrición de hoy y progreso reciente.
const rel = (iso: string) => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = new Date(iso); d1.setHours(0, 0, 0, 0); const n = Math.round((d1.getTime() - d0.getTime()) / 86400000); return n <= 0 ? "Hoy" : n === 1 ? "Mañana" : n < 14 ? `En ${n} días` : n < 60 ? `En ${Math.round(n / 7)} semanas` : `En ${Math.round(n / 30)} meses`; };
export function SessionCard({ cid }: { cid: string }) {
  const { data, isPending } = useMyBookings(cid), b = data?.[0], more = (data?.length ?? 0) - 1;
  return (
    <div className="card card-session">{b && <span className="sess-guide gd-pop" title="¡Nos vemos!"><Guide size={40} pose="wave" talking={false} /></span>}<div className="card-tag"><span className="live-dot" />Próxima sesión</div>
      {isPending ? <div className="sk" style={{ height: 70 }} /> : !b ? <><p className="empty-note" style={{ marginTop: 10 }}>Aún no tienes una sesión reservada. Elige un horario para tu llamada con tu coach.</p><div className="session-actions"><Link href="/inicio/agenda" className="mini-btn primary" style={{ textDecoration: "none" }}>Reservar</Link></div></>
        : <><div className="session-block"><div className="session-date">{DAY3[(new Date(b.startsAt).getDay() + 6) % 7]}<span>{new Date(b.startsAt).getDate()}</span></div>
            <div><div className="session-name">{rel(b.startsAt)} · {hhmm(b.startsAt)}</div><div className="session-type">{KIND_LABEL[b.kind]} · {b.duration} min{more > 0 ? ` · +${more} más` : ""}</div></div></div>
          <div className="session-actions"><Link href="/inicio/agenda" className="mini-btn primary" style={{ textDecoration: "none", textAlign: "center" }}>Ver sesión</Link><a className="mini-btn ghost" href={icsHref(b)} download="sesion-yeffitnes.ics" style={{ textDecoration: "none", textAlign: "center" }}><Icon name="bell" size={14} /> Recordarme</a></div></>}
    </div>
  );
}
export function ObjectiveCard() {
  const { profileId } = useProfile(), me = useMe(profileId).data;
  const days = me?.objectiveAt ? Math.floor((Date.now() - new Date(me.objectiveAt).getTime()) / 86400000) : null;
  return (
    <div className="card card-objective"><div className="card-tag"><span className="live-dot" />Objetivo actual</div>
      {me?.objective ? <><p className="objective-text">{me.objective}</p><div className="objective-meta"><span className={`live-dot sm${days !== null && days > 30 ? " old" : ""}`} />{days === null ? "Definido por tu coach" : days <= 0 ? "Actualizado hoy" : `Actualizado hace ${days} día${days === 1 ? "" : "s"}`}</div></>
        : <p className="empty-note" style={{ marginTop: 10 }}>Tu coach aún no define tu objetivo. Aparecerá aquí.</p>}
    </div>
  );
}
export function NutritionTodayCard({ cid, features, name }: { cid: string; features: string[]; name: string }) {
  const has = features.includes("nutrition"), { data } = useClientNutrition(has ? cid : ""), wd = todayWeekday(), logs = useMealLogs(has ? cid : "", localDate()), [unfold, setUnfold] = useState(false);
  if (!has) return <div className="card-nutrition"><FeatureGate features={features} feature="nutrition" name={name}><span /></FeatureGate></div>;
  const meals = data ? [...data.meals.filter((m) => m.weekday === null), ...data.meals.filter((m) => m.weekday === wd)] : [];
  if (data === null) return <div className="card-nutrition"><PlanWait kind="nutrition" /></div>;
  // Todas las comidas marcadas: se pliega en un resumen y se despliega con un toque (pedido de Cristian, 27-oct).
  const allDone = meals.length > 0 && meals.every((m) => !!m.id && (logs.data ?? []).includes(m.id));
  if (allDone && !unfold) return (
    <div className="card card-nutrition fold-card">
      <button type="button" className="fold-head" aria-expanded={false} onClick={() => setUnfold(true)}>
        <span className="fold-ok"><Icon name="check" size={16} stroke={2.4} /></span>
        <span className="fold-txt"><span className="card-tag" style={{ marginBottom: 2 }}>Nutrición de hoy · completada</span><b>{meals.length} de {meals.length} comidas</b><small>Toca para ver o cambiar</small></span>
        <Icon name="down" size={16} />
      </button>
    </div>);
  return (
    <div className={`card card-nutrition${allDone ? " fold-open" : ""}`}>{allDone && <button type="button" className="fold-close" onClick={() => setUnfold(false)}>Plegar <Icon name="up" size={13} /></button>}<div className="card-tag">Tu plan de hoy</div><div className="card-title" style={{ fontSize: 15 }}>Nutrición</div>
      {!data ? <p className="empty-note" style={{ marginTop: 10 }}>Tu coach todavía no publica tu plan de nutrición.</p>
        : !meals.length ? <p className="empty-note" style={{ marginTop: 10 }}>No hay comidas cargadas para hoy.</p>
        : <MealChecklist clientId={cid} meals={meals} compact />}
      {!!data && <Link href="/inicio/plan" className="card-link" style={{ textDecoration: "none" }}>Ver plan completo {ARROW}</Link>}
    </div>
  );
}
export function ProgressCard({ cid, features, name }: { cid: string; features: string[]; name: string }) {
  const has = features.includes("progress"), { data } = useMeasures(has ? cid : "");
  if (!has) return <div className="card-progress"><FeatureGate features={features} feature="progress" name={name}><span /></FeatureGate></div>;
  const last = (k: "weight" | "waist") => { const v = (data ?? []).filter((m) => m[k] != null); return v.length ? { cur: v[v.length - 1][k] as number, prev: v.length > 1 ? (v[v.length - 2][k] as number) : null } : null; };
  const rows = [["Peso", "kg", last("weight")], ["Cintura", "cm", last("waist")]] as const;
  const pts = (data ?? []).filter((m) => m.weight != null).slice(-6).map((m) => m.weight as number);
  const lo = Math.min(...pts), hi = Math.max(...pts), line = pts.length > 1 ? pts.map((v, i) => `${(i / (pts.length - 1)) * 260},${hi === lo ? 30 : 54 - ((v - lo) / (hi - lo)) * 48}`).join(" ") : "";
  return (
    <div className="card card-progress"><div className="card-tag">Progreso reciente</div>
      {!data?.length ? <p className="empty-note" style={{ marginTop: 10 }}>Aún no registras medidas. Agrégalas en Progreso.</p> : <>
        {rows.map(([l, u, r]) => r && <div key={l} className="prog-metric"><span>{l}</span><span className="prog-val">{r.cur} {u}{r.prev != null && r.cur !== r.prev && <span className="prog-delta">{r.cur < r.prev ? "−" : "+"}{Math.abs(Math.round((r.cur - r.prev) * 10) / 10)}</span>}</span></div>)}
        {line && <svg className="prog-chart" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden><defs><linearGradient id="pgHoy" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#D41A40" /><stop offset="100%" stopColor="#B08A3E" /></linearGradient></defs><polyline points={line} fill="none" stroke="url(#pgHoy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>}</>}
      <Link href="/inicio/progreso" className="card-link" style={{ textDecoration: "none" }}>Ver evolución completa {ARROW}</Link>
    </div>
  );
}
export function FeaturedVideo() {
  const { data } = useMaterialList(), open = useOpenMaterial(), [shown, setShown] = useState<MaterialOpen | null>(null), f = data?.find((m) => m.featured && m.unlocked && m.kind === "video");
  if (!f) return null;   // se oculta por completo si no hay vídeo destacado
  return (
    <>
      <button className="featured-video-card" style={{ border: 0, width: "100%", textAlign: "left", font: "inherit" }} disabled={open.isPending} onClick={() => open.mutate(f.id, { onSuccess: setShown })}>
        <div className="fv-text"><div className="fv-tag">{f.featuredPeriod === "day" ? "Vídeo del día" : "Vídeo de la semana"}</div><div className="fv-title">{f.title}</div><div className="fv-caption">{f.featuredPeriod === "day" ? "El mensaje de tu coach para hoy." : "Tu coach comparte un mensaje corto para toda su comunidad esta semana."}</div><div className="fv-author"><span className="fv-avatar">J</span>Tu coach</div></div>
        <div className="fv-thumb"><div className="fv-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div></div></button>
      {shown?.videoRef && <VideoModal ytId={shown.videoRef} title={shown.title} sub={shown.category} onClose={() => setShown(null)} />}
      {shown && !shown.videoRef && shown.privateVideo && <BunnyModal param={`material=${shown.id}`} title={shown.title} sub={shown.category} onClose={() => setShown(null)} />}
    </>
  );
}
