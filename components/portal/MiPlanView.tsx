"use client";
import { useState } from "react";
import { PlanWait } from "./LockedPanel";
import { useClientNutrition, useLogs, useMe, useTrainingPlans, type PlanDay, type PlanItem } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import {} from "@/lib/features";
import { DAY_LONG, DAY_SHORT, categoryLabel, todayWeekday, weekDates } from "@/lib/week";
import { gradient, initials } from "@/lib/format";
import { ExPic, ExPicViewer } from "@/components/ExPic";
import { VideoModal, PLAY_PATH } from "./VideoModal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { MealChecklist } from "./MealChecklist";
import { RoutineVideo } from "./RoutineVideo";

const LEVELS = [["beginner", "Principiante"], ["intermediate", "Intermedio"], ["advanced", "Avanzado"]] as const;
function relReview(d: string) {
  const days = Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days < 0) return `Hace ${-days} día${days === -1 ? "" : "s"}`;
  if (days < 14) return `En ${days} días`;
  return `En ${Math.round(days / 7)} semanas`;
}
// Nivel que fijó tu coach y por qué: la barra muestra dónde estás y hacia dónde puedes avanzar.
function LevelBlock({ level, reason }: { level: (typeof LEVELS)[number][0]; reason: string | null }) {
  const idx = LEVELS.findIndex(([k]) => k === level);
  return (
    <div className="level-block">
      <div className="level-head"><span className="level-tag">Tu nivel</span><b>{LEVELS[idx][1]}</b></div>
      <div className="level-steps" role="img" aria-label={`Nivel ${LEVELS[idx][1]}, paso ${idx + 1} de 3`}>{LEVELS.map(([k, l], i) => <span key={k} className={`level-step${i <= idx ? " on" : ""}${i === idx ? " now" : ""}`}><i />{l}</span>)}</div>
      {reason && <p className="level-reason"><b>Por qué:</b> {reason}</p>}
    </div>
  );
}
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
  const todayDay = byDay.get(wd);
  const sub = !plan ? "Después de tu primera llamada, Jeff arma tu plan para ti." : `${trainDays} ${trainDays === 1 ? "día" : "días"} de entrenamiento por semana. ${todayDay ? `Hoy toca ${todayDay.name.toLowerCase()}.` : "Hoy es día de descanso."}`;
  return (
    <>
      <div className="topbar">
        <div className="greeting"><div className="greeting-eyebrow">{plan?.name ?? "Tu coach"}</div><h1>Tu plan</h1><p className="greeting-sub">{sub}</p></div>
              </div>
      <div className="mode-toggle" role="tablist" aria-label="Tipo de plan">
        <button role="tab" aria-selected={mode === "training"} className={`mode-btn${mode === "training" ? " active" : ""}`} onClick={() => setMode("training")}>Entrenamiento</button>
        <button role="tab" aria-selected={mode === "nutrition"} className={`mode-btn${mode === "nutrition" ? " active" : ""}`} onClick={() => setMode("nutrition")}>Nutrición</button>
      </div>
      {mode === "nutrition" ? (
        <FeatureGate features={features} feature="nutrition" name={name}><NutritionPanel clientId={cid} /></FeatureGate>
      ) : !features.includes("training") ? <FeatureGate features={features} feature="training" name={name}><span /></FeatureGate>
      : !plan ? <PlanWait kind="training" />
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
                  {plan.reviewOn && <div className="plan-meta-row"><span>Próxima revisión</span><span>{relReview(plan.reviewOn)}</span></div>}
                </div>
                {plan.level && <LevelBlock level={plan.level} reason={plan.levelReason} />}
                {plan.coachNote && <div className="plan-note">“{plan.coachNote}”</div>}
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
  const [dv, setDv] = useState<"personal" | "yt" | null>(null), [pic, setPic] = useState<PlanItem | null>(null);
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
      {day.hasPersonalVideo || day.videoRef ? <RoutineVideo personal={day.hasPersonalVideo} label={day.name} onOpen={() => setDv(day.hasPersonalVideo ? "personal" : "yt")} /> : <RoutineVideo locked label={day.name} />}
      {dv === "personal" && <BunnyModal param={`day=${day.id}`} title={day.name} sub="Grabado para ti" onClose={() => setDv(null)} />}
      {pic && <ExPicViewer image={pic.image} name={pic.name} note={pic.instructions} onClose={() => setPic(null)} />}
      {dv === "yt" && day.videoRef && <VideoModal ytId={day.videoRef} title={day.name} sub="Vídeo de la rutina" onClose={() => setDv(null)} />}
      {!day.items.length ? <p className="empty-note" style={{ marginTop: 16 }}>Esta rutina todavía no tiene ejercicios.</p> : (
        <div className="exercise-list">{day.items.map((i, k) => (
          // Toda la fila abre la imagen y la indicación del ejercicio (pedido de Cristian, 28-oct); el botón de vídeo sigue aparte.
          <div key={i.id} className={`ex-row${i.image || i.instructions ? " tap" : ""}`} style={{ cursor: i.image || i.instructions ? "pointer" : "default" }}
            {...(i.image || i.instructions ? { role: "button", tabIndex: 0, "aria-label": `Ver cómo se hace: ${i.name}`, onClick: () => setPic(i), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPic(i); } } } : {})}>
            <ExPic image={i.image} name={i.name} size={48} onClick={() => setPic(i)} fallback={<div className="ex-thumb" style={{ background: gradient(k) }}>{initials(i.name)}</div>} />
            <div className="ex-body"><div className="ex-name">{i.name}</div><div className="ex-sub">{[i.muscle, i.equipment].filter(Boolean).join(" · ") || "—"}</div></div>
            <div className="ex-meta">{i.sets}×{i.reps}{i.rest ? <><br />{i.rest}s desc.</> : null}{i.weight ? <><br />{i.weight} kg</> : null}</div>
            {i.videoRef && <button className="ex-play" aria-label={`Ver técnica: ${i.name}`} onClick={(e) => { e.stopPropagation(); onVideo(i); }}><svg viewBox="0 0 20 20"><path d={PLAY_PATH} /></svg></button>}
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

function NutritionPanel({ clientId }: { clientId: string }) {
  const { data, isPending, isError, refetch } = useClientNutrition(clientId), [day, setDay] = useState(todayWeekday());
  if (isPending) return <div className="sk" style={{ height: 220 }} />;
  if (isError) return <div className="card"><p role="alert" className="empty-note">No pudimos cargar tu plan de nutrición.</p><button className="mini-btn primary" style={{ marginTop: 12 }} onClick={() => refetch()}>Reintentar</button></div>;
  if (!data) return <PlanWait kind="nutrition" />;
  const macros = [data.kcal != null && ["Calorías", `${data.kcal} kcal`], data.protein != null && ["Proteína", `${data.protein} g`], data.carbs != null && ["Carbohidratos", `${data.carbs} g`], data.fat != null && ["Grasas", `${data.fat} g`]].filter(Boolean) as string[][];
  const todays = [...data.meals.filter((m) => m.weekday === null), ...data.meals.filter((m) => m.weekday === day)];
  const recs = (data.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="plan-grid">
      <div className="card card-day">
        <div className="card-tag"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />Plan nutricional</div>
        <div className="card-title">{data.name}</div>
        <div className="card-meta">{todays.length} comida{todays.length === 1 ? "" : "s"} el {DAY_LONG[day - 1].toLowerCase()} · Actualizado {new Date(data.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</div>
        <div className="day-selector" role="tablist" aria-label="Día" style={{ marginTop: 14 }}>{DAY_SHORT.map((l, i) => (
          <button key={l} role="tab" aria-selected={day === i + 1} className={`day-pill${day === i + 1 ? " active" : ""}`} onClick={() => setDay(i + 1)} style={{ font: "inherit" }}><div className="day-label">{l}</div><div className="day-dot" /></button>))}</div>
        <div style={{ marginTop: 8 }}>{todays.length && day === todayWeekday() ? <MealChecklist clientId={clientId} meals={todays} /> : todays.length ? <>{<p className="guide-hint">Solo puedes marcar las comidas del día de hoy.</p>}{todays.map((m, i) => (
          <div key={i} className="meal-block"><div className="meal-label"><span className="meal-dot" />{m.name}</div><div className="meal-text" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div></div>))}</> : <p className="empty-note">No hay comidas cargadas para este día.</p>}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!!macros.length && <div className="card"><div className="card-tag">Tu objetivo diario</div><div style={{ marginTop: 6 }}>{macros.map(([k, v]) => <div key={k} className="nutri-row"><b>{k}</b><span>{v}</span></div>)}</div></div>}
        {!!recs.length && <div className="card"><div className="card-tag">Recomendaciones</div><div style={{ marginTop: 4 }}>{recs.map((r, i) => <div key={i} className="ex-row-static"><span className="ex-dot" /><span style={{ fontSize: 13 }}>{r}</span></div>)}</div></div>}
      </div>
    </div>
  );
}
