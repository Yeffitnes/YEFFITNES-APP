"use client";
import { useState } from "react";
import { useLogs, useMe, useTrainingPlans, type PlanDay, type PlanItem } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { coachLink } from "@/lib/features";
import { DAY_LONG, DAY_SHORT, categoryLabel, todayWeekday, weekDates } from "@/lib/week";
import { gradient, initials } from "@/lib/format";
import { VideoModal, PLAY_PATH } from "./VideoModal";

const REST_ICON = "M4 10a6 6 0 0 0 9 5.2A7 7 0 0 1 6.8 4 6 6 0 0 0 4 10z";
export function MiPlanView() {
  const { profileId, name } = useProfile(), me = useMe(profileId), cid = me.data?.id ?? "";
  const plans = useTrainingPlans(cid), logs = useLogs(cid);
  const [mode, setMode] = useState<"training" | "nutrition">("training");
  const wd = todayWeekday(), [sel, setSel] = useState(wd);
  const [video, setVideo] = useState<PlanItem | null>(null);
  if (me.isPending || (cid && (plans.isPending || logs.isPending))) return <div aria-busy="true"><div className="sk" style={{ height: 30, width: 200, marginBottom: 22 }} /><div className="sk" style={{ height: 64, marginBottom: 18 }} /><div className="sk" style={{ height: 320 }} /></div>;
  if (me.isError || plans.isError || logs.isError) return <div className="card"><p role="alert" className="empty-note">No pudimos cargar tu plan. Revisa tu conexión e inténtalo de nuevo.</p><button className="mini-btn primary" style={{ marginTop: 12 }} onClick={() => { me.refetch(); plans.refetch(); logs.refetch(); }}>Reintentar</button></div>;
  const features = me.data?.features ?? [];
  const plan = plans.data?.find((p) => p.status === "active");
  const byDay = new Map<number, PlanDay>((plan?.days ?? []).map((d) => [d.weekday, d]));
  const trainDays = plan?.days.length ?? 0;
  const wa = coachLink(process.env.NEXT_PUBLIC_COACH_WHATSAPP, name);
  const todayDay = byDay.get(wd);
  const sub = !plan ? "Tu coach está preparando tu plan." : `${trainDays} ${trainDays === 1 ? "día" : "días"} de entrenamiento por semana. ${todayDay ? `Hoy toca ${todayDay.name.toLowerCase()}.` : "Hoy es día de descanso."}`;
  return (
    <>
      <div className="topbar">
        <div className="greeting"><div className="greeting-eyebrow">{plan?.name ?? "Tu coach"}</div><h1>Tu plan</h1><p className="greeting-sub">{sub}</p></div>
        {wa && <div className="topbar-actions"><a className="wa-btn" href={wa} target="_blank" rel="noreferrer"><svg viewBox="0 0 20 20"><path d="M4 16l1.1-3.2A6.6 6.6 0 1 1 8 15.6L4 16z" /></svg>Escribir a tu coach</a></div>}
      </div>
      <div className="mode-toggle" role="tablist" aria-label="Tipo de plan">
        <button role="tab" aria-selected={mode === "training"} className={`mode-btn${mode === "training" ? " active" : ""}`} onClick={() => setMode("training")}>Entrenamiento</button>
        <button role="tab" aria-selected={mode === "nutrition"} className={`mode-btn${mode === "nutrition" ? " active" : ""}`} onClick={() => setMode("nutrition")}>Nutrición</button>
      </div>
      {mode === "nutrition" ? (
        <FeatureGate features={features} feature="nutrition" name={name}><div className="card"><div className="card-tag">Plan nutricional</div><p className="empty-note">Tu coach todavía no publica tu plan de nutrición. Cuando lo haga, aparecerá aquí.</p></div></FeatureGate>
      ) : !features.includes("training") ? <FeatureGate features={features} feature="training" name={name}><span /></FeatureGate>
      : !plan ? <div className="card"><div className="card-tag">Tu rutina</div><p className="empty-note">Todavía no tienes una rutina asignada. Cuando tu coach publique tu plan, aparecerá aquí.</p></div>
      : (
        <>
          <div className="day-selector" role="tablist" aria-label="Días de la semana">
            {DAY_SHORT.map((l, i) => { const d = byDay.get(i + 1);
              return <button key={l} role="tab" aria-selected={sel === i + 1} className={`day-pill${sel === i + 1 ? " active" : ""}`} data-rest={d ? "0" : "1"} onClick={() => setSel(i + 1)} style={{ font: "inherit" }}>
                <div className="day-label">{l}</div><div className="day-tag">{d ? d.name : "Descanso"}</div><div className="day-dot" /></button>; })}
          </div>
          <div className="plan-grid">
            <DayCard day={byDay.get(sel)} weekday={sel} isToday={sel === wd} onVideo={setVideo} />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card">
                <div className="card-tag">Sobre este plan</div>
                <div className="card-title" style={{ fontSize: 16 }}>{plan.name}</div>
                <div className="plan-status"><span className="pulse" />Activo</div>
                <div style={{ marginTop: 14 }}>
                  <div className="plan-meta-row"><span>Inicio</span><span>{new Date(`${plan.startsOn}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                  <div className="plan-meta-row"><span>Entrenamientos por semana</span><span>{trainDays}</span></div>
                </div>
              </div>
              <WeekCard byDay={byDay} done={new Set((logs.data ?? []).filter((l) => l.completed).map((l) => l.date))} wd={wd} />
            </div>
          </div>
        </>
      )}
      {video?.videoRef && <VideoModal ytId={video.videoRef} title={video.name} sub="Técnica del ejercicio" onClose={() => setVideo(null)} />}
    </>
  );
}
function DayCard({ day, weekday, isToday, onVideo }: { day?: PlanDay; weekday: number; isToday: boolean; onVideo: (i: PlanItem) => void }) {
  if (!day) return (
    <div className="card card-day rest-card">
      <div className="rest-icon"><svg viewBox="0 0 20 20"><path d={REST_ICON} /></svg></div>
      <div className="rest-title">Día de descanso</div>
      <div className="rest-desc">{isToday ? "No tienes rutina hoy." : `No hay rutina asignada el ${DAY_LONG[weekday - 1].toLowerCase()}.`} Aprovecha para estirar, dormir bien y llegar fresco a tu próximo entrenamiento.</div>
    </div>
  );
  const meta = [`${day.items.length} ejercicio${day.items.length === 1 ? "" : "s"}`, day.minutes ? `${day.minutes} min aprox.` : null, categoryLabel(day.category)].filter(Boolean).join(" · ");
  return (
    <div className="card card-day">
      <div className="card-tag"><span style={{ width: 7, height: 7, borderRadius: "50%", background: isToday ? "var(--accent)" : "#D7DAE3" }} />{DAY_LONG[weekday - 1]}{isToday ? " · Hoy" : ""}</div>
      <div className="card-title">{day.name}</div>
      <div className="card-meta">{meta}</div>
      {!day.items.length ? <p className="empty-note" style={{ marginTop: 16 }}>Esta rutina todavía no tiene ejercicios.</p> : (
        <div className="exercise-list">{day.items.map((i, k) => (
          <div key={i.id} className="ex-row" style={{ cursor: "default" }}>
            <div className="ex-thumb" style={{ background: gradient(k) }}>{initials(i.name)}</div>
            <div className="ex-body"><div className="ex-name">{i.name}</div><div className="ex-sub">{[i.muscle, i.equipment].filter(Boolean).join(" · ") || "—"}</div></div>
            <div className="ex-meta">{i.sets}×{i.reps}{i.rest ? <><br />{i.rest}s desc.</> : null}{i.weight ? <><br />{i.weight} kg</> : null}</div>
            {i.videoRef && <button className="ex-play" aria-label={`Ver técnica: ${i.name}`} onClick={() => onVideo(i)}><svg viewBox="0 0 20 20"><path d={PLAY_PATH} /></svg></button>}
          </div>))}</div>
      )}
    </div>
  );
}
function WeekCard({ byDay, done, wd }: { byDay: Map<number, PlanDay>; done: Set<string>; wd: number }) {
  const dates = weekDates();
  return (
    <div className="card">
      <div className="card-tag">Tu semana</div>
      <div style={{ marginTop: 6 }}>{DAY_SHORT.map((l, i) => { const d = byDay.get(i + 1), trained = done.has(dates[i]);
        return <div key={l} className="week-ov-row"><span className={`week-ov-dot${trained ? " trained" : ""}${i + 1 === wd && !trained ? " today" : ""}`} /><span className="week-ov-day">{l}</span>
          <span className={`week-ov-name${d ? "" : " rest"}`}>{d ? `${d.name}${i + 1 === wd ? " · hoy" : ""}` : "Descanso"}</span></div>; })}</div>
    </div>
  );
}
