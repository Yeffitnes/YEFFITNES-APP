"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSignedAudio, useThread } from "@/lib/messages";
import { BunnyModal, prefetchPlay } from "@/components/ui/BunnyModal";
import { localDate, useFinish, useLogs, useLogSet, useUnlogSet, useMe, useMyAnnouncements, useTrainingPlans, type PlanDay, type PlanItem, type SetLog, type WorkoutLog } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { ReportCard } from "./ReportCard";
import { TrainingGuide } from "./TrainingGuide";
import { DayDone } from "./DayDone";
import { FeaturedVideo, NutritionTodayCard, ObjectiveCard, ProgressCard, SessionCard } from "./HoySide";
import { CHECK_ICON } from "./icons";
import { VideoModal, PLAY_PATH, warmYoutube } from "./VideoModal";
import { DAY_LONG, categoryLabel, weekDates } from "@/lib/week";
import { Icon } from "@/components/ui/Icon";
import { QuickRow } from "./QuickRow";
import { RoutineVideo } from "./RoutineVideo";
import { ytThumb } from "@/lib/video-poster";
import { PendingSection, PlanWait } from "./LockedPanel";
import { repRange, repTarget, setTip } from "@/lib/progression";
import { NUDGE_TXT } from "@/lib/nudges";
import { FeedbackBody, LastTimeFeedback, extras } from "./FeedbackHistory";
import { ExPic, ExPicViewer } from "@/components/ExPic";
import { ANCHORS, focusAnchor, useFocusAnchor } from "@/lib/focus";
import { feedbackUnseen, hasFeedback, useClientNutrition, useCoachCancels, useMarkFeedbackSeen, useMealLogs, useMyNudges, useTodayReport, type NudgeKind } from "@/lib/queries";
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
  if (me.data?.status === "pending") return <PendingSection eyebrow={cap(new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }))} title={`Hola, ${name.split(" ")[0] || ""}`} panels={[
    { tag: "Hoy", title: "Tu entrenamiento del día", sub: "Rutina, series y peso de cada ejercicio, armados por Jeff para ti." },
    { tag: "Reporte", title: "Reporte diario", sub: "Un vídeo corto y un comentario para que Jeff vea cómo vas." },
    { tag: "Nutrición", title: "Tu nutrición de hoy", sub: "Tus comidas del día para marcarlas a medida que cumples." },
    { tag: "Progreso", title: "Tu progreso", sub: "Peso, medidas y fotos para ver tu cambio semana a semana." },
    { tag: "Agenda", title: "Llamada con Jeff", sub: "Reserva tu llamada para conocerse y ajustar tu plan." },
    { tag: "Vídeo", title: "Vídeo de la semana", sub: "El mensaje de Jeff para empezar la semana." },
  ]} />;
  const today = localDate(), wd = (new Date().getDay() + 6) % 7 + 1;
  const plan = plans.data?.find((p) => p.status === "active"), day = plan?.days.find((d) => d.weekday === wd);
  const logList = logs.data ?? [], logToday = logList.find((l) => l.date === today);
  const first = name.split(" ")[0] || "";
  const sub = !plan ? "Después de tu primera llamada, Jeff arma tu rutina y tu nutrición para ti." : day ? `Hoy toca ${day.name.toLowerCase()}.` : "Hoy es día de descanso. Recupérate bien.";
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
      <CoachNudges cid={cid} trainingDone={!!logToday?.completed} />
      <CoachFeedback cid={cid} logs={logList} />
      <CoachCancels cid={cid} />
      {!!ann.data?.length && <QuickRow icon="megaphone" tone="idle" title={ann.data.length === 1 ? "Anuncio de tu coach" : `${ann.data.length} anuncios de tu coach`} sub={ann.data[0].title || ann.data[0].body.slice(0, 60)}>
        {ann.data.map((a) => <div key={a.id} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55 }}>{a.pinned && <Icon name="pin" size={13} style={{ marginRight: 5 }} />}{a.title && <b>{a.title} — </b>}{a.body}</div>)}
      </QuickRow>}
      {me.data && (me.data.features.includes("daily_report") ? (plan ? <ReportCard clientId={cid} /> : <div style={{ marginBottom: 12 }}><PlanWait kind="report" /></div>) : <div style={{ marginBottom: 12 }}><FeatureGate features={me.data.features} feature="daily_report" name={name}><span /></FeatureGate></div>)}
      </div>
      <DayDone cid={cid} features={me.data?.features ?? []} trainingToday={!!day} trainingDone={!!logToday?.completed} />
      <FeaturedVideo />
      <div className="dash-grid">
        {me.data && !me.data.features.includes("training") ? <FeatureGate features={me.data.features} feature="training" name={name}><span /></FeatureGate>
          : !plan ? <PlanWait kind="training" />
          : !day ? <div className="card card-routine"><div className="card-tag">Hoy</div><div className="card-title">Día de descanso</div><p className="empty-note">No tienes rutina hoy. El descanso también es parte del entrenamiento.</p></div>
          : <Routine key={day.id} cid={cid} day={day} title={day.name} items={day.items} log={logToday} logs={logList} today={today} guide={logList.filter((l) => l.completed).length < 2} />}
        <SessionCard cid={cid} />
        <ObjectiveCard />
        <NutritionTodayCard cid={cid} features={me.data?.features ?? []} name={name} />
        <ProgressCard cid={cid} features={me.data?.features ?? []} name={name} />
      </div>
    </>
  );
}
function Routine({ cid, day, title, items, log, logs, today, guide }: { cid: string; day: PlanDay; title: string; items: PlanItem[]; log?: WorkoutLog; logs: WorkoutLog[]; today: string; guide: boolean }) {
  // Todos los ejercicios empiezan cerrados (pedido de Cristian, 28-oct): el cliente abre el que va a hacer.
  const [open, setOpen] = useState<string | null>(null), [editing, setEditing] = useState(false), [video, setVideo] = useState<PlanItem | null>(null), [teaser, setTeaser] = useState<"yt" | "personal" | null>(null), [pic, setPic] = useState<PlanItem | null>(null);
  const [effort, setEffort] = useState(log?.effort ?? 0), [note, setNote] = useState(log?.note ?? ""), [unfold, setUnfold] = useState(false);
  useFocusAnchor("rutina", () => setUnfold(true));
  const finish = useFinish(cid);
  const saved = (id: string) => log?.sets.filter((s) => s.itemId === id) ?? [];
  const doneCount = items.filter((i) => new Set(saved(i.id).filter((s) => s.setNumber <= i.sets).map((s) => s.setNumber)).size >= i.sets).length;
  const anySet = (log?.sets.length ?? 0) > 0, closed = !!log?.completed && !editing;
  // Pasa al siguiente ejercicio SOLO cuando el que está abierto tiene TODAS sus series marcadas (pedido de Cristian, 29-oct).
  // Antes bastaba con marcar la última serie: si se tocaba por error, el ejercicio se plegaba y saltaba al otro aunque faltaran series.
  const doneNow = (i: PlanItem) => new Set(saved(i.id).filter((s) => s.setNumber <= i.sets).map((s) => s.setNumber)).size >= i.sets;
  const doneKey = items.map((i) => (doneNow(i) ? "1" : "0")).join(""), prevDone = useRef<string | null>(null);
  useEffect(() => {
    const was = prevDone.current; prevDone.current = doneKey;
    if (was === null || !open) return;
    const k = items.findIndex((i) => i.id === open);
    if (k < 0 || doneKey[k] !== "1" || was[k] === "1") return;   // el abierto no acaba de completarse
    const next = items.find((i, j) => j > k && doneKey[j] !== "1") ?? items.find((i, j) => doneKey[j] !== "1" && j !== k);
    setOpen(next?.id ?? null);
  }, [doneKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Terminado: la tarjeta se pliega en un resumen (pedido de Cristian, 27-oct). Se despliega para verla o editarla.
  if (closed && !unfold) return (
    <div id="rutina" className="card card-routine fold-card">
      <button type="button" className="fold-head" aria-expanded={false} onClick={() => setUnfold(true)}>
        <span className="fold-ok"><Icon name="check" size={16} stroke={2.4} /></span>
        <span className="fold-txt"><span className="card-tag" style={{ marginBottom: 2 }}>Rutina de hoy · completada</span><b>{title}</b><small>{log?.sets.length ?? 0} series registradas{log?.effort ? ` · esfuerzo ${log.effort}/10` : ""}</small></span>
        <Icon name="down" size={16} />
      </button>
      {log && hasFeedback(log) && !feedbackUnseen(log) && <div className="fold-coach"><div className="card-tag">Respuesta de tu coach</div><FeedbackBody log={log} /></div>}
      <div className="fold-actions"><button type="button" className="mini-btn ghost" onClick={() => setUnfold(true)}>Ver detalle</button><button type="button" className="mini-btn ghost" onClick={() => { setUnfold(true); setEditing(true); }}>Editar</button></div>
    </div>);
  return (
    <div id="rutina" className={`card card-routine${log?.completed ? " fold-open" : ""}`}>
      {log?.completed && !editing && <button type="button" className="fold-close" onClick={() => setUnfold(false)}>Plegar <Icon name="up" size={13} /></button>}
      <div className="card-tag"><span className="live-dot" />Rutina de hoy</div>
      <div className="card-title">{title}</div>
      <div className="card-meta">{[`${items.length} ejercicios`, day.minutes ? `${day.minutes} min aprox.` : null, categoryLabel(day.category) ?? day.category].filter(Boolean).join(" · ")}</div>
      {!log?.completed && <LastTimeFeedback logs={logs} dayId={day.id} dayName={day.name} today={today} />}
      {day.hasPersonalVideo || day.videoRef ? <RoutineVideo personal={day.hasPersonalVideo} label={day.name} poster={day.hasPersonalVideo ? day.poster : ytThumb(day.videoRef)} onWarm={() => (day.hasPersonalVideo ? prefetchPlay(`day=${day.id}`) : warmYoutube())} onOpen={() => setTeaser(day.hasPersonalVideo ? "personal" : "yt")} /> : <RoutineVideo locked label={day.name} />}
      {teaser === "personal" && <BunnyModal param={`day=${day.id}`} title={day.name} sub="Grabado para ti" onClose={() => setTeaser(null)} />}
      {teaser === "yt" && day.videoRef && <VideoModal ytId={day.videoRef} title={day.name} sub="Vídeo de la rutina" onClose={() => setTeaser(null)} />}
      {guide && !closed && <TrainingGuide />}
      <div className="routine-progress-bar"><div className="routine-progress-fill" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div>
      <div className="routine-progress-count">{doneCount} / {items.length} completados</div>
      <div className="exercise-list">{items.map((i) => (
        <div key={i.id}>
          <div className={`ex-row${doneNow(i) ? " done" : ""}`} role="button" tabIndex={0} aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === i.id ? null : i.id); } }}>
            <div className="ex-check" dangerouslySetInnerHTML={{ __html: CHECK_ICON }} /><ExPic image={i.image} name={i.name} size={40} className="sm" onClick={() => setPic(i)} /><div className="ex-name">{i.name}</div><div className="ex-meta">{saved(i.id).length}/{i.sets} · {i.sets}×{i.reps}{i.weight ? ` · ${i.weight} kg` : ""}</div>
          </div>
          {open === i.id && <div className="ex-panel">{i.videoRef && <button className="tech-link" onClick={() => setVideo(i)}><svg viewBox="0 0 20 20"><path d={PLAY_PATH} /></svg>Ver técnica</button>}{Array.from({ length: i.sets }, (_, k) => <SetRow key={k} hint={guide && !anySet && k === 0} cid={cid} item={i} n={k + 1} today={today} saved={saved(i.id).find((s) => s.setNumber === k + 1)} locked={closed} />)}<RepTip item={i} sets={saved(i.id)} /></div>}
        </div>))}</div>
      {log && hasFeedback(log) && !feedbackUnseen(log) && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--surface)", fontSize: 13.5, lineHeight: 1.55 }}><div className="card-tag">Respuesta de tu coach</div><FeedbackBody log={log} /></div>}
      {video?.videoRef && <VideoModal ytId={video.videoRef} title={video.name} sub="Técnica del ejercicio" onClose={() => setVideo(null)} />}
      {pic && <ExPicViewer image={pic.image} name={pic.name} note={pic.instructions} onClose={() => setPic(null)} />}
      <Link href="/inicio/plan" className="tech-link" style={{ marginTop: 14, display: "inline-flex" }}>Ver rutina completa <Icon name="arrow" size={13} /></Link>
      <div style={{ marginTop: 18 }}>
        {closed ? <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span className="pill-done">COMPLETADO · ESFUERZO {log?.effort}/10</span><button className="mini-btn ghost" onClick={() => setEditing(true)}>Editar</button></div> : (
          <>
            <div className="card-tag" style={{ marginBottom: 0 }}>¿Qué tan exigente fue? (1 = suave, 10 = máximo)</div>
            <div className="effort-row">{Array.from({ length: 10 }, (_, k) => <button key={k} className={`effort-btn${effort === k + 1 ? " on" : ""}`} aria-label={`Esfuerzo ${k + 1}`} onClick={() => setEffort(k + 1)}>{k + 1}</button>)}</div>
            <textarea className="set-input" style={{ height: 70, padding: 10, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comentario para Jeff (opcional)" aria-label="Comentario para tu coach" />
            <button className="mini-btn primary" style={{ marginTop: 12, width: "100%", height: 44 }} disabled={!anySet || !effort || finish.isPending}
              onClick={() => finish.mutate({ date: today, effort, note }, { onSuccess: () => { setEditing(false); setUnfold(false); } })}>{finish.isPending ? "Guardando…" : "Terminar entrenamiento"}</button>
            {!anySet && <p className="routine-progress-count">Registra al menos una serie para poder terminar.</p>}
          </>)}
      </div>
    </div>
  );
}
// Rango de repeticiones (p. ej. 8-12): explica la regla y, tras la última serie guardada, aconseja subir o bajar el peso. No bloquea nada.
// Consejo del rango de repeticiones (pedido de Cristian, 28-oct): ya no es un texto fijo (en el teléfono se veía montado).
// Es un aviso corto que aparece solo un momento: al abrir el ejercicio (una vez al día) y después de guardar una serie fuera del rango.
// Desde el 29-oct también con repeticiones fijas ("10"): si hizo menos, bajar; si hizo más, subir.
function RepTip({ item, sets }: { item: PlanItem; sets: SetLog[] }) {
  const r = repTarget(item.reps);
  const last = [...sets].filter((x) => x.reps != null).sort((a, b) => b.setNumber - a.setNumber)[0];
  const tip = r && last ? setTip(r, last.reps!) : null;
  const key = tip ? `s${last!.setNumber}-${last!.reps}` : "intro";
  // El aviso de entrada sale una vez al día por ejercicio; se decide una sola vez al abrir el ejercicio.
  const [intro] = useState(() => {
    if (!r) return false;
    const k = `yf-rt-${item.id}-${localDate()}`;
    try { if (localStorage.getItem(k)) return false; localStorage.setItem(k, "1"); } catch { /* sin almacenamiento: se muestra */ }
    return true;
  });
  const [shown, setShown] = useState<string | null>(intro && key === "intro" ? "intro" : null);
  useEffect(() => { if (r && key !== "intro") setShown(key); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!shown) return; const t = setTimeout(() => setShown(null), shown === "intro" ? 9000 : 7000); return () => clearTimeout(t); }, [shown]);
  if (!r || shown !== key) return null;
  const w = item.weight != null ? ` con ${item.weight} kg` : "";
  const text = tip ?? (r.fixed
    ? `Haz tus ${item.sets} series${w} de ${r.min} repeticiones. Si haces más, la próxima vez sube un poco el peso; si no llegas a ${r.min}, bájalo. Escribe las repeticiones que hiciste de verdad. Si tienes dudas, pregúntale a Jeff.`
    : `Haz tus ${item.sets} series${w} buscando entre ${r.min} y ${r.max} repeticiones. Si pasas de ${r.max}, la próxima vez sube un poco el peso; si no llegas a ${r.min}, bájalo. Si tienes dudas, pregúntale a Jeff.`);
  return (
    <button type="button" className={`rep-pop${tip ? " warn" : ""}`} role="status" onClick={() => setShown(null)} aria-label="Cerrar consejo">
      <Icon name={tip ? (last!.reps! > r.max ? "up" : "down") : "dumbbell"} size={15} />
      <span>{text}</span>
      <i className="rep-pop-bar" style={{ animationDuration: tip ? "7s" : "9s" }} />
    </button>
  );
}
function SetRow({ cid, item, n, today, saved, locked, hint }: { hint?: boolean; cid: string; item: PlanItem; n: number; today: string; saved?: SetLog; locked: boolean }) {
  const range = repRange(item.reps), target = range ? NaN : parseInt(item.reps, 10);   // con rango, el cliente escribe lo que hizo de verdad
  // Las casillas ya traen lo planeado (editable y visible): "✓" guarda exactamente lo que se ve, nunca algo oculto.
  const log = useLogSet(cid), unlog = useUnlogSet(cid), [reps, setReps] = useState(saved?.reps != null ? String(saved.reps) : Number.isNaN(target) ? "" : String(target)), [w, setW] = useState(saved?.weight != null ? String(saved.weight) : item.weight != null ? String(item.weight) : "");
  // Un toque en ✓ basta: si no escribió nada, se guarda lo planeado (reps objetivo y peso objetivo).
  const repsVal = reps !== "" ? Number(reps) : Number.isNaN(target) ? NaN : target, wVal = w !== "" ? Number(w) : item.weight;
  const ok = repsVal >= 0 && (wVal == null || wVal >= 0) && !Number.isNaN(repsVal);
  const dirty = !!saved && ((saved.reps ?? null) !== (repsVal ?? null) || (saved.weight ?? null) !== (wVal ?? null));
  const toggle = () => { if (saved && !dirty) { if (!locked && !unlog.isPending) unlog.mutate({ date: today, itemId: item.id, setNumber: n }); return; } save(); };
  const save = () => { if (!ok || locked || log.isPending) return; log.mutate({ date: today, itemId: item.id, setNumber: n, reps: repsVal, weight: wVal ?? null }); };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); save(); } };
  return (
    <div className="set-row">
      <label>SERIE {n}</label>
      <input className="set-input" inputMode="numeric" type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} placeholder={range ? `${range.min}–${range.max}` : Number.isNaN(target) ? "reps" : `${target} reps`} aria-label={`Repeticiones serie ${n}`} disabled={locked} onKeyDown={onKey} />
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

// Avisos rápidos de Jeff de hoy (Seguimiento → "Avisar"): visibles aquí aunque el teléfono no tenga notificaciones activas.
// Cada aviso se marca solo como hecho cuando el cliente cumple (reporte enviado, rutina terminada, comidas marcadas) y,
// cuando ya cumplió todo, la fila cambia a "Listo" y se pliega (pedido de Cristian, 28-oct).
function CoachNudges({ cid, trainingDone }: { cid: string; trainingDone: boolean }) {
  const n = useMyNudges(cid), list = n.data ?? [], today = localDate();
  const rep = useTodayReport(cid, today, list.includes("report") || list.includes("nothing"));
  const nut = useClientNutrition(list.includes("meals") ? cid : ""), ml = useMealLogs(list.includes("meals") ? cid : "", today), wd = (new Date().getDay() + 6) % 7 + 1;
  if (!list.length) return null;
  const meals = (nut.data?.meals ?? []).filter((m) => m.weekday === null || m.weekday === wd);
  const mealsDone = meals.length > 0 && meals.every((m) => !!m.id && (ml.data ?? []).includes(m.id)), anyMeal = (ml.data ?? []).length > 0;
  const done: Record<NudgeKind, boolean> = { report: !!rep.data, train: trainingDone, meals: mealsDone, nothing: !!rep.data || trainingDone || anyMeal };
  const DONE_TXT: Record<NudgeKind, string> = { report: "Reporte enviado", train: "Rutina hecha", meals: "Nutrición marcada", nothing: "Ya registraste algo hoy" };
  const allDone = list.every((k) => done[k]);
  return (
    <QuickRow key={allDone ? "ok" : "todo"} anchor="avisos" icon={allDone ? "check" : "bell"} tone={allDone ? "ok" : "new"}
      title={allDone ? "Listo: cumpliste lo que Jeff te pidió" : "Jeff te está esperando"}
      sub={allDone ? list.map((k) => DONE_TXT[k]).join(" · ") : NUDGE_TXT[list.find((k) => !done[k]) ?? list[0]].body}
      chip={allDone ? undefined : "Hoy"} defaultOpen={!allDone}>
      {list.map((k) => <div key={k} className={`nudge-line${done[k] ? " ok" : ""}`}>
        {done[k]
          ? <p className="nudge-done"><Icon name="check" size={14} stroke={2.4} />{DONE_TXT[k]}</p>
          : <>{list.length > 1 && <p>{NUDGE_TXT[k].body}</p>}
              {k !== "nothing" && <button type="button" className="mini-btn primary" onClick={() => focusAnchor(ANCHORS[k])}>{k === "report" ? "Hacer mi reporte" : k === "train" ? "Ir a mi rutina" : "Marcar mi nutrición"}</button>}</>}
      </div>)}
    </QuickRow>
  );
}

// Respuestas de Jeff a tus entrenamientos (pedido de Cristian, 28-oct): aparecen aquí como aviso aparte, aunque sean de un día anterior
// (Jeff puede responder de madrugada o al día siguiente). No se responden: el cliente las lee o escucha y las marca como vistas.
function CoachFeedback({ cid, logs }: { cid: string; logs: WorkoutLog[] }) {
  const seen = useMarkFeedbackSeen(cid), since = localDate(new Date(Date.now() - 14 * 86_400_000)), list = logs.filter((l) => l.date >= since && feedbackUnseen(l)).slice(0, 5);   // solo las de las últimas 2 semanas
  useFocusAnchor("respuestas");
  if (!list.length) return null;
  return (
    <div id="respuestas" className="fb-list">
      {list.map((l) => {
        const day = cap(new Date(`${l.date}T12:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }));
        return (
          <QuickRow key={l.id} icon="message" tone="new" chip="Nuevo" defaultOpen={list.length === 1}
            title={`Jeff respondió a tu entrenamiento${l.routine ? ` de ${l.routine.toLowerCase()}` : ""}`}
            sub={`${day}${extras(l)}`}>
            <FeedbackBody log={l} />
            <div className="fb-foot"><span>No se responde. Queda guardada 7 días en Mensajes y te la recuerdo la próxima vez que toque esta rutina.</span>
              <button type="button" className="mini-btn primary" disabled={seen.isPending} onClick={() => seen.mutate(l.id)}>Marcar como visto</button></div>
          </QuickRow>);
      })}
    </div>
  );
}


// Sesión cancelada por Jeff (pedido de Cristian, 29-oct): además de la notificación del teléfono (que puede no llegar), sale aquí
// con el motivo hasta que el cliente toque "Entendido" (se recuerda en ese teléfono).
const CC_KEY = "yf-cc-seen";
function CoachCancels({ cid }: { cid: string }) {
  const q = useCoachCancels(cid), [seen, setSeen] = useState<string[]>([]);
  useEffect(() => { try { setSeen(JSON.parse(localStorage.getItem(CC_KEY) ?? "[]") as string[]); } catch { /* sin almacenamiento */ } }, []);
  const list = (q.data ?? []).filter((c) => !seen.includes(c.id));
  if (!list.length) return null;
  const ok = (id: string) => { const n = [...seen, id].slice(-50); setSeen(n); try { localStorage.setItem(CC_KEY, JSON.stringify(n)); } catch { /* nada */ } };
  return <>{list.map((c) => {
    const when = `${cap(new Date(c.startsAt).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }))} a las ${new Date(c.startsAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    return (
      <QuickRow key={c.id} icon="calendar" tone="new" chip="Agenda" defaultOpen title="Jeff canceló tu sesión" sub={when}>
        {c.reason && <p className="fb-text">“{c.reason}”</p>}
        <div className="fb-foot"><span>El horario quedó libre. Reserva otro cuando quieras.</span>
          <span style={{ display: "flex", gap: 8 }}><button type="button" className="mini-btn ghost" onClick={() => ok(c.id)}>Entendido</button><Link href="/inicio/agenda" className="mini-btn primary" style={{ textDecoration: "none" }} onClick={() => ok(c.id)}>Reservar otro horario</Link></span></div>
      </QuickRow>);
  })}</>;
}
