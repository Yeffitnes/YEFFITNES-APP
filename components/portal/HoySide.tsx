"use client";
import { useState } from "react";
import Link from "next/link";
import { useClientNutrition, useMaterialList, useMeasures, useMyBookings, useOpenMaterial, useMe, type MaterialOpen } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { KIND_LABEL } from "@/lib/queries";
import { DAY3, hhmm } from "@/lib/dates";
import { todayWeekday } from "@/lib/week";
import { VideoModal } from "./VideoModal";
const ARROW = <svg viewBox="0 0 10 10"><path d="M2 5h6M5 2l3 3-3 3" /></svg>;
// Tarjetas laterales de "Hoy" (diseño portal-hoy): próxima sesión, objetivo, nutrición de hoy y progreso reciente.
export function SessionCard({ cid }: { cid: string }) {
  const { data } = useMyBookings(cid), b = data?.[0];
  return (
    <div className="card card-session"><div className="card-tag">Próxima sesión</div>
      {!b ? <><p className="empty-note" style={{ marginTop: 10 }}>Aún no tienes una sesión reservada. Elige un horario para tu llamada con tu coach.</p><div className="session-actions"><Link href="/inicio/agenda" className="mini-btn primary" style={{ textDecoration: "none" }}>Reservar</Link></div></>
        : <><div className="card-title" style={{ fontSize: 15 }}>Reservada</div>
          <div className="session-block"><div className="session-date">{DAY3[(new Date(b.startsAt).getDay() + 6) % 7]}<span>{new Date(b.startsAt).getDate()}</span></div>
            <div><div className="session-name">{hhmm(b.startsAt)} — {b.duration} min</div><div className="session-type">{KIND_LABEL[b.kind]}</div></div></div>
          <div className="session-actions"><Link href="/inicio/agenda" className="mini-btn ghost" style={{ textDecoration: "none" }}>Ver o cambiar</Link></div></>}
    </div>
  );
}
export function ObjectiveCard() {
  const { profileId } = useProfile(), me = useMe(profileId).data;
  const days = me?.objectiveAt ? Math.floor((Date.now() - new Date(me.objectiveAt).getTime()) / 86400000) : null;
  return (
    <div className="card card-objective"><div className="card-tag">Objetivo actual</div><div className="card-title" style={{ fontSize: 15 }}>Definido por tu coach</div>
      {me?.objective ? <><p className="objective-text">{me.objective}</p><div className="objective-meta">{days === null ? "" : days <= 0 ? "Actualizado hoy" : `Actualizado hace ${days} día${days === 1 ? "" : "s"}`}</div></>
        : <p className="empty-note" style={{ marginTop: 10 }}>Tu coach aún no define tu objetivo. Aparecerá aquí.</p>}
    </div>
  );
}
export function NutritionTodayCard({ cid, features, name }: { cid: string; features: string[]; name: string }) {
  const has = features.includes("nutrition"), { data } = useClientNutrition(has ? cid : ""), wd = todayWeekday();
  if (!has) return <div className="card-nutrition"><FeatureGate features={features} feature="nutrition" name={name}><span /></FeatureGate></div>;
  const meals = data ? [...data.meals.filter((m) => m.weekday === null), ...data.meals.filter((m) => m.weekday === wd)] : [];
  return (
    <div className="card card-nutrition"><div className="card-tag">Tu plan de hoy</div><div className="card-title" style={{ fontSize: 15 }}>Nutrición</div>
      {!data ? <p className="empty-note" style={{ marginTop: 10 }}>Tu coach todavía no publica tu plan de nutrición.</p>
        : !meals.length ? <p className="empty-note" style={{ marginTop: 10 }}>No hay comidas cargadas para hoy.</p>
        : <div style={{ marginTop: 10 }}>{meals.slice(0, 5).map((m, i) => <div key={i} className="nutri-row"><b>{m.name}</b><span>{m.content.split("\n")[0]}</span></div>)}</div>}
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
        {rows.map(([l, u, r]) => r && <div key={l} className="prog-metric"><span>{l}</span><span className="prog-val">{r.cur} {u}{r.prev != null && r.cur !== r.prev && <span className="prog-delta">{r.cur < r.prev ? "↓" : "↑"}{Math.abs(Math.round((r.cur - r.prev) * 10) / 10)}</span>}</span></div>)}
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
        <div className="fv-text"><div className="fv-tag">Vídeo de la semana</div><div className="fv-title">{f.title}</div><div className="fv-caption">Tu coach comparte un mensaje corto para toda su comunidad — se actualiza cada semana.</div><div className="fv-author"><span className="fv-avatar">J</span>Tu coach</div></div>
        <div className="fv-thumb"><div className="fv-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div></div></button>
      {shown?.videoRef && <VideoModal ytId={shown.videoRef} title={shown.title} sub={shown.category} onClose={() => setShown(null)} />}
    </>
  );
}
