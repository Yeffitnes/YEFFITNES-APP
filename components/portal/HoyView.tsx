"use client";
import { useState } from "react";
import Link from "next/link";
import { useSignedAudio, useThread } from "@/lib/messages";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { localDate, useFinish, useLogs, useLogSet, useUnlogSet, useMe, useMyAnnouncements, useTrainingPlans, type PlanDay, type PlanItem, type SetLog, type WorkoutLog } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { ReportCard } from "./ReportCard";
import { TrainingGuide } from "./TrainingGuide";
import { DayDone } from "./DayDone";
import { FeaturedVideo, NutritionTodayCard, ObjectiveCard, ProgressCard, SessionCard } from "./HoySide";
import { CHECK_ICON } from "./icons";
import { VideoModal, PLAY_PATH } from "./VideoModal";
import { DAY_LONG, categoryLabel, weekDates } from "@/lib/week";
import { Icon } from "@/components/ui/Icon";
import { QuickRow } from "./QuickRow";
import { RoutineVideo } from "./RoutineVideo";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LBL = ["L", "M", "M", "J", "V", "S", "D"];
// Estado de cada día de la semana, para pintarlo: hecho / perdido / por hacer / descanso.
// Un día pasado sin registro NO se pinta en rojo: puede ser anterior al plan o un día sin entrenar. Solo se marca lo hecho.
function dayState(date: string, weekday: number, today: string, planDays: number[], logs: WorkoutLog[], planStart: string): { cls: string; title: string } {
  if (logs.some((l) => l.date === date && l.completed)) return { cls: "done", title: "completado" };
  if (date === today) return { cls: planDays.includes(weekday) ? "" : "rest", title: planDays.includes(weekday) ? "toca hoy" : "descanso" };
  if (!planDays.includes(weekday)) return { cls: "rest", title: "descanso" };
  if (date < today) return { cls: "past", title: date < planStart ? "antes de tu plan" : "sin registro" };
  return { cls: "todo", title: "por hacer" };
}
function streak(days: number[], logs: WorkoutLog[]) {
  if (!days.length) return 0;
  const done = new Set(logs.filter((l) => l.completed).map((l) => l.date)); let n = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (!days.includes((d.getDay() + 6) % 7 + 1)) continue; // día de descanso: no corta la racha
    if (done.has(localDate(d))) n++; else if (i === 0) continue; else break;
  }
  return n;
}
export function HoyView() {
  const { profileId, name } = useProfile(), me = useMe(profileId), cid = me.data?.id ?? "", ann = useMyAnnouncements(!!me.data?.features.includes("announcements"));
  const plans = useTrainingPlans(cid), logs = useLogs(cid);
  if (me.isPending || (cid && (plans.isPending || logs.isPending))) return <div aria-busy="true"><div className="sk" style={{ height: 30, width: 200, marginBottom: 22 }} /><div className="sk" style={{ height: 80, marginBottom: 18 }} /><div className="sk" style={{ height: 260 }} /></div>;
  if (me.isError || plans.isError || logs.isError) return <div className="card"><p role="alert" className="empty-note">No pudimos cargar tu día. Revisa tu conexión e inténtalo de nuevo.</p><button className="mini-btn primary" style={{ marginTop: 12 }} onClick={() => { me.refetch(); plans.refetch(); logs.refetch(); }}>Reintentar</button></div>;
  const today = localDate(), wd = (new Date().getDay() + 6) % 7 + 1;
  const plan = plans.data?.find((p) => p.status === "active"), day = plan?.days.find((d) => d.weekday === wd);
  const logList = logs.data ?? [], logToday = logList.find((l) => l.date === today);
  const first = name.split(" ")[0] || "";
  const sub = !plan ? "Tu coach está preparando tu plan." : day ? `Hoy toca ${day.name.toLowerCase()}.` : "Hoy es día de descanso. Recupérate bien.";
  const planWd = plan?.days.map((d) => d.weekday) ?? [], wk = weekDates(), n = streak(plan?.days.map((d) => d.weekday) ?? [], logList);
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">{cap(new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }))}</div><h1>Hola, {first}</h1><p className="greeting-sub">{sub}</p></div></div>
      <div className="streak-strip">
        <div className="streak-copy"><div className="streak-num"><span>{n}</span> {n === 1 ? "día" : "días"}</div><div className="streak-label">{n ? "seguidos cumpliendo tu rutina." : "Completa tu primera rutina para empezar tu racha."}</div></div>
        <div>
        <div className="week-strip">{wk.map((d, i) => { const st = dayState(d, i + 1, today, planWd, logList, plan?.startsOn ?? ""); return <div key={d} className="week-day"><div className={`week-dot ${st.cls}${d === today ? " today" : ""}`} title={`${DAY_LONG[i]} — ${st.title}`}>{st.cls === "done" ? <Icon name="check" size={13} stroke={2.6} /> : d === today ? <span className="week-letter">{LBL[i]}</span> : null}</div>{d !== today && <div className="week-day-label">{LBL[i]}</div>}</div>; })}</div>
        </div>
      </div>
      <div className="qrows">
      <FromCoach />
      {!!ann.data?.length && <QuickRow icon="megaphone" tone="idle" title={ann.data.length === 1 ? "Anuncio de tu coach" : `${ann.data.length} anuncios de tu coach`} sub={ann.data[0].title || ann.data[0].body.slice(0, 60)}>
        {ann.data.map((a) => <div key={a.id} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55 }}>{a.pinned && <Icon name="pin" size={13} style={{ marginRight: 5 }} />}{a.title && <b>{a.title} — </b>}{a.body}</div>)}
      </QuickRow>}
      {me.data && (me.data.features.includes("daily_report") ? <ReportCard clientId={cid} /> : <div style={{ marginBottom: 12 }}><FeatureGate features={me.data.features} feature="daily_report" name={name}><span /></FeatureGate></div>)}
      </div>
      <DayDone cid={cid} features={me.data?.features ?? []} trainingToday={!!day} trainingDone={!!logToday?.completed} />
      <FeaturedVideo />
      <div className="dash-grid">
        {me.data && !me.data.features.includes("training") ? <FeatureGate features={me.data.features} feature="training" name={name}><span /></FeatureGate>
          : !plan ? <div className="card card-routine"><div className="card-tag">Tu rutina</div><p className="empty-note">Todavía no tienes una rutina asignada. Cuando tu coach publique tu plan, aparecerá aquí.</p></div>
          : !day ? <div className="card card-routine"><div className="card-tag">Hoy</div><div className="card-title">Día de descanso</div><p className="empty-note">No tienes rutina hoy. El descanso también es parte del entrenamiento.</p></div>
          : <Routine key={day.id} cid={cid} day={day} title={day.name} items={day.items} log={logToday} today={today} guide={logList.filter((l) => l.completed).length < 2} />}
        <SessionCard cid={cid} />
        <ObjectiveCard />
        <NutritionTodayCard cid={cid} features={me.data?.features ?? []} name={name} />
        <ProgressCard cid={cid} features={me.data?.features ?? []} name={name} />
      </div>
    </>
  );
}
function Routine({ cid, day, title, items, log, today, guide }: { cid: string; day: PlanDay; title: string; items: PlanItem[]; log?: WorkoutLog; today: string; guide: boolean }) {
  const firstTodo = items.find((i) => (log?.sets.filter((x) => x.itemId === i.id).length ?? 0) < i.sets);
  const [open, setOpen] = useState<string | null>(log?.completed ? null : firstTodo?.id ?? null), [editing, setEditing] = useState(false), [video, setVideo] = useState<PlanItem | null>(null), [teaser, setTeaser] = useState<"yt" | "personal" | null>(null);
  const [effort, setEffort] = useState(log?.effort ?? 0), [note, setNote] = useState(log?.note ?? "");
  const finish = useFinish(cid);
  const saved = (id: string) => log?.sets.filter((s) => s.itemId === id) ?? [];
  const doneCount = items.filter((i) => saved(i.id).length >= i.sets).length;
  const anySet = (log?.sets.length ?? 0) > 0, closed = !!log?.completed && !editing;
  return (
    <div className="card card-routine">
      <div className="card-tag"><span className="live-dot" />Rutina de hoy</div>
      <div className="card-title">{title}</div>
      <div className="card-meta">{[`${items.length} ejercicios`, day.minutes ? `${day.minutes} min aprox.` : null, categoryLabel(day.category) ?? day.category].filter(Boolean).join(" · ")}</div>
      {day.hasPersonalVideo || day.videoRef ? <RoutineVideo personal={day.hasPersonalVideo} label={day.name} onOpen={() => setTeaser(day.hasPersonalVideo ? "personal" : "yt")} /> : <RoutineVideo locked label={day.name} />}
      {teaser === "personal" && <BunnyModal param={`day=${day.id}`} title={day.name} sub="Grabado para ti" onClose={() => setTeaser(null)} />}
      {teaser === "yt" && day.videoRef && <VideoModal ytId={day.videoRef} title={day.name} sub="Vídeo de la rutina" onClose={() => setTeaser(null)} />}
      {guide && !closed && <TrainingGuide />}
      <div className="routine-progress-bar"><div className="routine-progress-fill" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div>
      <div className="routine-progress-count">{doneCount} / {items.length} completados</div>
      <div className="exercise-list">{items.map((i, idx) => (
        <div key={i.id}>
          <div className={`ex-row${saved(i.id).length >= i.sets ? " done" : ""}`} role="button" tabIndex={0} aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === i.id ? null : i.id); } }}>
            <div className="ex-check" dangerouslySetInnerHTML={{ __html: CHECK_ICON }} /><div className="ex-name">{i.name}</div><div className="ex-meta">{saved(i.id).length}/{i.sets} · {i.sets}×{i.reps}{i.weight ? ` · ${i.weight} kg` : ""}</div>
          </div>
          {open === i.id && <div className="ex-panel">{i.videoRef && <button className="tech-link" onClick={() => setVideo(i)}><svg viewBox="0 0 20 20"><path d={PLAY_PATH} /></svg>Ver técnica</button>}{Array.from({ length: i.sets }, (_, k) => <SetRow key={k} hint={guide && !anySet && k === 0} cid={cid} item={i} n={k + 1} today={today} saved={saved(i.id).find((s) => s.setNumber === k + 1)} locked={closed} onLast={() => setOpen(items[idx + 1]?.id ?? null)} />)}</div>}
        </div>))}</div>
      {log?.coachComment && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--surface)", fontSize: 13.5, lineHeight: 1.55 }}><div className="card-tag">Comentario de tu coach</div>{log.coachComment}</div>}
      {video?.videoRef && <VideoModal ytId={video.videoRef} title={video.name} sub="Técnica del ejercicio" onClose={() => setVideo(null)} />}
      <Link href="/inicio/plan" className="tech-link" style={{ marginTop: 14, display: "inline-flex" }}>Ver rutina completa <Icon name="arrow" size={13} /></Link>
      <div style={{ marginTop: 18 }}>
        {closed ? <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span className="pill-done">COMPLETADO · ESFUERZO {log?.effort}/10</span><button className="mini-btn ghost" onClick={() => setEditing(true)}>Editar</button></div> : (
          <>
            <div className="card-tag" style={{ marginBottom: 0 }}>¿Qué tan exigente fue? (1 = suave, 10 = máximo)</div>
            <div className="effort-row">{Array.from({ length: 10 }, (_, k) => <button key={k} className={`effort-btn${effort === k + 1 ? " on" : ""}`} aria-label={`Esfuerzo ${k + 1}`} onClick={() => setEffort(k + 1)}>{k + 1}</button>)}</div>
            <textarea className="set-input" style={{ height: 70, padding: 10, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comentario para Jeff (opcional)" aria-label="Comentario para tu coach" />
            <button className="mini-btn primary" style={{ marginTop: 12, width: "100%", height: 44 }} disabled={!anySet || !effort || finish.isPending}
              onClick={() => finish.mutate({ date: today, effort, note }, { onSuccess: () => setEditing(false) })}>{finish.isPending ? "Guardando…" : "Terminar entrenamiento"}</button>
            {!anySet && <p className="routine-progress-count">Registra al menos una serie para poder terminar.</p>}
          </>)}
      </div>
    </div>
  );
}
function SetRow({ cid, item, n, today, saved, locked, onLast, hint }: { hint?: boolean; cid: string; item: PlanItem; n: number; today: string; saved?: SetLog; locked: boolean; onLast: () => void }) {
  const target = parseInt(item.reps, 10);
  // Las casillas ya traen lo planeado (editable y visible): "✓" guarda exactamente lo que se ve, nunca algo oculto.
  const log = useLogSet(cid), unlog = useUnlogSet(cid), [reps, setReps] = useState(saved?.reps != null ? String(saved.reps) : Number.isNaN(target) ? "" : String(target)), [w, setW] = useState(saved?.weight != null ? String(saved.weight) : item.weight != null ? String(item.weight) : "");
  // Un toque en ✓ basta: si no escribió nada, se guarda lo planeado (reps objetivo y peso objetivo).
  const repsVal = reps !== "" ? Number(reps) : Number.isNaN(target) ? NaN : target, wVal = w !== "" ? Number(w) : item.weight;
  const ok = repsVal >= 0 && (wVal == null || wVal >= 0) && !Number.isNaN(repsVal);
  const dirty = !!saved && ((saved.reps ?? null) !== (repsVal ?? null) || (saved.weight ?? null) !== (wVal ?? null));
  const toggle = () => { if (saved && !dirty) { if (!locked && !unlog.isPending) unlog.mutate({ date: today, itemId: item.id, setNumber: n }); return; } save(); };
  const save = () => { if (!ok || locked || log.isPending) return; log.mutate({ date: today, itemId: item.id, setNumber: n, reps: repsVal, weight: wVal ?? null }, { onSuccess: () => { if (n === item.sets) onLast(); } }); };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); save(); } };
  return (
    <div className="set-row">
      <label>SERIE {n}</label>
      <input className="set-input" inputMode="numeric" type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} placeholder={Number.isNaN(target) ? "reps" : `${target} reps`} aria-label={`Repeticiones serie ${n}`} disabled={locked} onKeyDown={onKey} />
      <input className="set-input" inputMode="decimal" type="number" min={0} step={0.5} value={w} onChange={(e) => setW(e.target.value)} placeholder={item.weight ? `${item.weight} kg` : "kg"} aria-label={`Peso serie ${n} en kilos`} disabled={locked} onKeyDown={onKey} />
      <button className={`set-save${saved ? " on" : ""}${hint && !saved ? " hint" : ""}`} disabled={(!ok && !saved) || log.isPending || unlog.isPending || locked} aria-label={saved && !dirty ? `Deshacer serie ${n}` : `Guardar serie ${n}`} title={saved && !dirty ? "Toca para deshacer" : "Guardar serie"} onClick={toggle}><Icon name="check" size={15} stroke={2.2} /></button>
    </div>
  );
}

// Último mensaje de tu coach: una fila compacta que se abre. Nuevo = resaltada; ya leído = discreta.
function FromCoach() {
  const t = useThread(), last = [...(t.data ?? [])].reverse().find((m) => m.sender === "coach"), audio = useSignedAudio(last?.audioPath ?? null);
  if (!last) return null;
  const when = new Date(last.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" }), fresh = !last.readAt;
  const text = last.body ?? (last.audioPath ? "Te envió un audio" : last.hasVideo || last.youtubeId ? "Te envió un vídeo" : "Te envió una foto");
  return (
    <QuickRow icon="message" tone={fresh ? "new" : "idle"} title="Mensaje de tu coach" sub={`${when} · ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`} chip={fresh ? "Nuevo" : undefined} defaultOpen={fresh}>
      {last.audioPath && (audio.data ? <audio controls preload="metadata" src={audio.data} style={{ width: "100%", height: 38, marginBottom: last.body ? 10 : 0 }} /> : <p className="qrow-quote" style={{ fontStyle: "normal" }}>Cargando audio…</p>)}
      {(last.body || !last.audioPath) && <p className="qrow-quote" style={{ fontStyle: "normal", color: "var(--text)" }}>{text}</p>}
      <Link href="/inicio/mensajes" className="mini-btn primary" style={{ textDecoration: "none", display: "inline-flex", marginTop: 12 }}>Responder</Link>
    </QuickRow>
  );
}
