"use client";
// Resumen de la semana (pedido de Cristian, 30-oct; corregido el 4-nov): la semana de CADA cliente, 7 días desde que empezó con Jeff
// (lib/week.ts). La semana en curso cuenta solo los días que han pasado y no se puede enviar: "Enviarle el resumen" se activa cuando
// la semana termina. Jeff abre por defecto la última semana completa; el cliente, la que lleva en curso.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useClientLogs, useClientNutrition, useMeasures, useTrainingPlans } from "@/lib/queries";
import { isNewRecord, lastNDays, useClientReportDays, useHabitSpecs, useHabits, useMealLogsRange, useRecords, useWorkoutCount, MILESTONES } from "@/lib/extras";
import { clientWeeks, spanText, weekdayDate, type WeekSpan } from "@/lib/clientweek";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { WeekReport } from "@/components/WeekReport";
import { useSendWeek, useSentWeeks } from "@/lib/weeksum";
import { fmtHabit, goalText, habitStats, isLowS, lowDaysS, lowWord, shortDay, valueOf } from "@/lib/habits";

const kg = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")} kg`;
const dec = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const wdOf = (ymd: string) => { const d = new Date(`${ymd}T12:00:00`); return (d.getDay() + 6) % 7 + 1; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const WINDOW = 21;   // alcanza para la semana en curso, la anterior y la de antes (comparación del resumen enviado)

// Desde cuándo cuenta: el día en que se activó; sin ese dato, el inicio del plan o el registro.
export const useWeekStart = (clientId: string) => useQuery({ queryKey: ["week-start", clientId], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<string> => {
  const { data, error } = await db().from("clients").select("activated_at,plan_since,created_at").eq("id", clientId).single(); if (error) throw error;
  const r = data as { activated_at: string | null; plan_since: string | null; created_at: string };
  return r.activated_at ? new Date(r.activated_at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) : r.plan_since ?? new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
} });

export function useWeek(clientId: string, span: WeekSpan | null) {
  const days = span?.days ?? [], from = span?.from ?? "", to = span?.to ?? "", inSpan = (d: string) => d >= from && d <= to;
  const plans = useTrainingPlans(clientId), logs = useClientLogs(clientId), nut = useClientNutrition(clientId), meals = useMealLogsRange(clientId, WINDOW);
  const reps = useClientReportDays(clientId, WINDOW), hab = useHabits(clientId, WINDOW), specs = useHabitSpecs(clientId), recs = useRecords(clientId), ms = useMeasures(clientId);
  const pending = plans.isPending || logs.isPending || ms.isPending || specs.isPending;
  const plan = plans.data?.find((p) => p.status === "active");
  const planned = plan ? days.filter((d) => d >= plan.startsOn && plan.days.some((x) => x.weekday === wdOf(d))) : [];
  const weekLogs = (logs.data ?? []).filter((l) => inSpan(l.date) && l.completed);
  const effort = avg(weekLogs.map((l) => l.effort).filter((e): e is number => e != null));
  const mealDays = nut.data ? days.filter((d) => { const need = nut.data!.meals.filter((m) => m.weekday === null || m.weekday === wdOf(d)); if (!need.length) return false; const got = new Set((meals.data ?? []).filter((x) => x.date === d).map((x) => x.meal)); return need.every((m) => !!m.id && got.has(m.id)); }).length : null;
  const h = hab.data ? hab.data.filter((x) => inSpan(x.day)) : null;
  // Hábitos (12-nov): los activos de Jeff para este cliente, cada uno contra su meta.
  const habits = h ? (specs.data ?? []).map((s) => ({ s, st: habitStats(s, h, days) })).filter((x) => x.st.n > 0) : [];
  const avgOf = (k: string) => habits.find((x) => x.s.key === k)?.st.avg ?? null;
  const newRecs = (recs.data ?? []).filter((r) => inSpan(r.on) && isNewRecord(r));
  const wList = (ms.data ?? []).filter((m) => m.weight != null && m.date <= to), lastW = wList[wList.length - 1], baseW = [...wList].reverse().find((m) => m.date < from);
  const wDelta = lastW && baseW && lastW.date >= from ? (lastW.weight as number) - (baseW.weight as number) : null;
  const lows = h ? (specs.data ?? []).map((s) => ({ s, days: lowDaysS(s, h) })).filter((x) => x.days.length) : [];
  // Para el resumen enviado (13-nov): peso movido (repeticiones × kg de las series de trabajo), series hechas, mejor peso por ejercicio y por día.
  const work = weekLogs.flatMap((l) => l.sets.filter((s) => !s.warmup && s.reps != null).map((s) => ({ ...s, date: l.date })));
  const volume = work.reduce((a, s) => a + (s.reps ?? 0) * (s.weight ?? 0), 0);
  const byEx = new Map<string, number>(); for (const s of work) if (s.weight != null) byEx.set(s.exercise, Math.max(byEx.get(s.exercise) ?? 0, s.weight));
  const dailyVolume = days.map((d) => work.filter((s) => s.date === d).reduce((a, s) => a + (s.reps ?? 0) * (s.weight ?? 0), 0));
  const trainedDays = days.map((d) => weekLogs.some((l) => l.date === d));
  const habitDaily = h ? (specs.data ?? []).map((s) => ({ s, vals: days.map((d) => valueOf(h.find((x) => x.day === d), s)) })) : [];
  return { volume, sets: work.length, byEx, dailyVolume, trainedDays, habitDaily, pending, plan, planned: planned.length, done: weekLogs.length, effort, mealDays, reports: reps.data ? reps.data.filter(inSpan).length : null, habits, water: avgOf("water"), sleep: avgOf("sleep"), lows, goals: (specs.data ?? []).filter((s) => s.kind === "number" && s.goal != null), newRecs, lastW: lastW?.weight ?? null, wDelta };
}

export function WeekSummary({ clientId, first, mode }: { clientId: string; first: string; mode: "coach" | "client" }) {
  const coach = mode === "coach", start = useWeekStart(clientId), [pick, setPick] = useState<"current" | "last" | null>(null), [sending, setSending] = useState(false);
  const sent = useSentWeeks(coach ? clientId : "");
  const weeks = start.data ? clientWeeks(start.data) : null;
  const span = !weeks ? null : (pick ?? (coach ? "last" : "current")) === "last" && weeks.last ? weeks.last : weeks.current;
  const w = useWeek(clientId, span);
  if (start.isError && !start.data) return <div className="card" style={{ marginBottom: 16 }}><p role="alert" className="empty-note">No pudimos cargar el resumen de la semana. <button type="button" className="tech-link" onClick={() => start.refetch()}>Reintentar</button></p></div>;
  if (!weeks || !span || w.pending) return <div className="card" style={{ marginBottom: 16 }}><div className="sk" style={{ height: 120 }} /></div>;
  const total = span.days.length;   // días que cuentan: 7 si ya terminó; si no, los que van
  const tiles: { k: string; v: string; s?: string; low?: boolean }[] = [];
  if (w.plan) tiles.push(w.planned || w.done ? { k: "Entrenos", v: `${w.done}/${w.planned || w.done}`, s: w.effort ? `esfuerzo ${dec(w.effort)}/10` : undefined } : { k: "Entrenos", v: "–", s: "sin rutina estos días" });
  else if (w.done) tiles.push({ k: "Entrenos", v: String(w.done) });
  if (w.mealDays != null) tiles.push({ k: "Nutrición", v: `${w.mealDays}/${total}`, s: "días completos" });
  if (w.reports != null) tiles.push({ k: "Reportes", v: `${w.reports}/${total}` });
  for (const { s, st } of w.habits) tiles.push(s.kind === "check" ? { k: s.name, v: `${st.done}/${total}`, s: s.goal != null ? `días · meta ${s.goal} por semana` : "días hecho", low: st.ok === false }
    : { k: s.name, v: s.key === "water" ? dec(st.avg!) : s.key === "steps" ? Math.round(st.avg!).toLocaleString("es-CO") : s.key === "sleep" ? `${dec(st.avg!)} h` : fmtHabit(s, st.avg!), s: s.key === "water" ? "vasos al día" : s.key === "sleep" ? "por noche" : "al día", low: st.ok === false });
  if (w.lastW != null) tiles.push({ k: "Peso", v: kg(w.lastW), s: w.wDelta != null ? `${w.wDelta > 0 ? "+" : w.wDelta < 0 ? "−" : ""}${kg(Math.abs(w.wDelta))} en la semana` : undefined });
  const when = span.left === 1 ? "mañana" : `el ${weekdayDate(span.completesOn)}`;
  const sentNow = coach && span.complete ? sent.data?.find((x) => x.from === span.from) : undefined;
  return (
    <div className="card wk-card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><div className="card-tag">{coach ? "Resumen de la semana" : "Tu semana"}</div>
        <div className="card-title" style={{ fontSize: 15 }}>Semana {span.n} · {span.complete ? "completa" : `día ${span.day} de 7`}</div>
        <div className="card-meta">{span.complete ? spanText(span) : `Se completa ${when}`}</div></div>
        {coach && (span.complete
          ? <button type="button" className="pd-btn primary" onClick={() => setSending(true)}><Icon name="send" size={13} /> {sentNow ? "Ver o reenviar" : "Enviarle el resumen"}</button>
          : <button type="button" className="pd-btn wk-wait" disabled><Icon name="clock" size={13} /> {span.left === 1 ? "Falta 1 día" : `Faltan ${span.left} días`}</button>)}</div>
      {weeks.last && <div className="wk-tabs" role="group" aria-label="Elegir semana">
        <button type="button" className={span.complete ? "on" : ""} aria-pressed={span.complete} onClick={() => setPick("last")}>Semana {weeks.last.n} · completa</button>
        <button type="button" className={span.complete ? "" : "on"} aria-pressed={!span.complete} onClick={() => setPick("current")}>Semana {weeks.current.n} · en curso</button>
      </div>}
      {!tiles.length ? <p className="empty-note" style={{ marginTop: 6 }}>{coach ? `${first} no registró nada ${span.complete ? "en esa semana" : "esta semana"}.` : `Aún no hay nada registrado ${span.complete ? "en esa semana" : "esta semana"}.`}</p> : (
        <div className="wk-grid">{tiles.map((t) => <div key={t.k} className={`wk-tile${t.low ? " low" : ""}`}><small>{t.k}</small><b>{t.v}</b>{t.s && <span>{t.s}</span>}</div>)}</div>)}
      {!!w.lows.length && <div className="wk-lows" role="status"><Icon name="bell" size={14} /><span><b>{coach ? "Hábitos por debajo del mínimo" : "Días que te quedaste corto"}:</b> {w.lows.map((x) => `${lowWord(x.s)} ${x.days.length === 1 ? "1 día" : `${x.days.length} días`} (${x.days.map(shortDay).join(", ")})`).join(" · ")}. <small>{coach ? "Metas" : "Tus metas"}: {w.goals.map((s) => `${s.name.toLowerCase()} ${fmtHabit(s, s.goal!)}`).join(", ")}.</small></span></div>}
      {!!w.newRecs.length && <div className="wk-recs"><span className="card-tag" style={{ marginBottom: 4 }}>Récords de la semana</span>{w.newRecs.map((r) => <div key={r.exercise} className="wk-rec"><Icon name="up" size={13} /><b>{r.exercise}</b><span>{kg(r.best)} × {r.reps}{r.prev != null ? ` (antes ${kg(r.prev)})` : ""}</span></div>)}</div>}
      {coach && <p className="wk-note">{sentNow ? `Se lo enviaste el ${new Date(sentNow.sentAt).toLocaleDateString("es", { day: "numeric", month: "short" })} · ${sentNow.seenAt ? "ya lo vio" : "aún no lo abre"}.` : span.complete ? "“Enviarle el resumen” te muestra cómo lo verá (con gráficas y la comparación con la semana anterior) para que agregues tu comentario." : `Lleva ${weeks.dayN === 1 ? "1 día" : `${weeks.dayN} días`} contigo. Podrás enviarle el resumen cuando complete su semana.`}</p>}
      {sending && span.complete && <SendWeek clientId={clientId} first={first} n={span.n} from={span.from} prev={sentNow?.note ?? ""} again={!!sentNow} onClose={() => setSending(false)} />}
    </div>
  );
}

// Jeff ve exactamente lo que le llegará al cliente, escribe su comentario y lo envía (13-nov, 0053).
function SendWeek({ clientId, first, n, from, prev, again, onClose }: { clientId: string; first: string; n: number; from: string; prev: string; again: boolean; onClose: () => void }) {
  const send = useSendWeek(clientId), [note, setNote] = useState(prev);
  return (
    <Modal title={`Resumen de la semana ${n} para ${first}`} sub={again ? "Ya se lo enviaste. Si lo reenvías, le llega de nuevo con tu comentario actualizado." : "Así lo verá en su app. Agrega tu comentario: es lo primero que leerá."} onClose={onClose} wide>
      <label className="wr-note-in"><span>Tu comentario (opcional)</span>
        <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Ej.: ${first}, gran semana. Esta semana enfócate en dormir más.`} /></label>
      <WeekReport clientId={clientId} first={first} n={n} from={from} note={note.trim() || null} mode="preview" />
      <div className="wr-send"><button type="button" className="ghost-btn" onClick={onClose}>Cancelar</button>
        <button type="button" className="primary-btn" disabled={send.isPending} onClick={() => send.mutate({ n, from, note }, { onSuccess: onClose })}><Icon name="send" size={14} /> {send.isPending ? "Enviando…" : again ? "Reenviar" : "Enviar resumen"}</button></div>
    </Modal>
  );
}

// Récords de cada ejercicio y logros por constancia (Progreso: cliente y ficha de Jeff).
export function RecordsCard({ clientId, mode }: { clientId: string; mode: "coach" | "client" }) {
  const recs = useRecords(clientId), count = useWorkoutCount(clientId), coach = mode === "coach", from = lastNDays(7)[0];
  if (recs.data === null) return null;   // 0043 sin correr
  const list = [...(recs.data ?? [])].sort((a, b) => b.on.localeCompare(a.on) || b.best - a.best);
  const n = count.data?.full ?? 0, partial = (count.data?.finished ?? 0) - n, got = MILESTONES.filter((m) => n >= m), next = MILESTONES.find((m) => n < m);
  return (
    <div className="card rec-card">
      <div className="card-tag">{coach ? "Récords y logros" : "Tus récords y logros"}</div>
      <div className="card-title" style={{ fontSize: 16 }}>{count.isPending ? "…" : `${n} rutina${n === 1 ? "" : "s"} completa${n === 1 ? "" : "s"}`}</div>
      <div className="ach-row">{MILESTONES.map((m) => <span key={m} className={`ach${n >= m ? " on" : ""}`} title={n >= m ? "Logrado" : "Por lograr"}>{m}</span>)}</div>
      <p className="card-meta" style={{ margin: "6px 0 10px" }}>{next ? `${got.length ? "¡Vas muy bien! " : ""}Te ${next - n === 1 ? "falta 1 rutina completa" : `faltan ${next - n} rutinas completas`} para llegar a ${next}.` : "Completaste todos los logros. Impresionante."} Cuenta cuando haces todos los ejercicios de la rutina con todas sus series.{coach && partial > 0 ? ` Además terminó ${partial} ${partial === 1 ? "entrenamiento" : "entrenamientos"} sin hacer la rutina completa.` : ""}</p>
      {recs.isPending ? <div className="sk" style={{ height: 60 }} /> : !list.length ? <p className="empty-note">{coach ? "Aún no hay series con peso registradas." : "Cuando registres series con peso, aquí verás tu mejor marca de cada ejercicio."}</p>
        : <div className="rec-list">{list.slice(0, 12).map((r) => <div key={r.exercise} className="rec-row"><span className="rec-name">{r.exercise}{r.on >= from && isNewRecord(r) && <i className="rec-new">Nuevo</i>}</span><span className="rec-val">{kg(r.best)} × {r.reps}</span><span className="rec-date">{new Date(`${r.on}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}</span></div>)}</div>}
    </div>
  );
}

// Historial de hábitos (pedido de Cristian, 2-nov; metas de Jeff desde el 12-nov): los últimos 30 días, igual para Jeff y para el
// cliente (Progreso). Por hábito: promedio, mejor día y días por debajo de la meta (los de sí/no: días hechos). Arriba, la racha.
export function HabitsHistory({ clientId, mode }: { clientId: string; mode: "coach" | "client" }) {
  const h = useHabits(clientId, 30), specs = useHabitSpecs(clientId), days = lastNDays(30);
  if (h.isPending || specs.isPending) return <div className="card" style={{ marginBottom: 18 }}><div className="sk" style={{ height: 120 }} /></div>;
  if (!h.data || !specs.data?.length) return null;   // 0043 sin correr, o Jeff apagó todos
  const list = specs.data, by = new Map(h.data.map((x) => [x.day, x]));
  const any = (d: string) => list.some((s) => valueOf(by.get(d), s) != null);
  // Racha: días seguidos anotando, contando hasta hoy (si hoy aún no anota, cuenta hasta ayer).
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (any(days[i])) streak++; else if (i === days.length - 1) continue; else break; }
  const logged = days.filter(any).length, names = list.map((s) => s.name.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " ni $1");
  return (
    <div className="card hab-hist" style={{ marginBottom: 18 }}>
      <div className="card-tag">{mode === "coach" ? "Hábitos (30 días)" : "Tus hábitos (30 días)"}</div>
      {!logged ? <p className="empty-note">{mode === "coach" ? `Aún no anota ${names}.` : "Cuando anotes tus hábitos en Hoy, aquí verás tu historial y tus mejores días."}</p> : <>
        <div className="card-title" style={{ fontSize: 16 }}>{streak > 1 ? `${streak} días seguidos anotando` : `${mode === "coach" ? "Anotó" : "Anotaste"} ${logged} de los últimos 30 días`}</div>
        {list.map((s) => {
          const vals = days.map((d) => valueOf(by.get(d), s)), got = vals.filter((v): v is number => v != null);
          if (!got.length) return null;
          if (s.kind === "check") { const done = got.filter((v) => v > 0).length;
            return (<div key={s.id} className="hh-row"><div className="hh-head"><b>{s.name}</b><span>{done} {done === 1 ? "día hecho" : "días hechos"} de 30{s.goal != null ? ` · meta ${goalText(s)}` : ""}</span></div>
              <div className="hh-bars" aria-hidden>{vals.map((v, i) => <i key={days[i]} className={v ? "best" : "none"} style={{ height: v ? "100%" : 3 }} />)}</div></div>); }
          const max = Math.max(...got), bestI = vals.lastIndexOf(max), mean = got.reduce((a, b) => a + b, 0) / got.length, lowN = got.filter((v) => isLowS(s, v)).length;
          return (
            <div key={s.id} className="hh-row">
              <div className="hh-head"><b>{s.name}</b><span>promedio {fmtHabit(s, mean)} · mejor día {fmtHabit(s, max)} ({new Date(`${days[bestI]}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}) · {got.length} {got.length === 1 ? "día" : "días"}{lowN ? ` · ${lowN} con ${lowWord(s)}` : ""}</span></div>
              <div className="hh-bars" aria-hidden>{vals.map((v, i) => <i key={days[i]} className={v == null ? "none" : isLowS(s, v) ? "low" : i === bestI ? "best" : ""} style={{ height: v == null ? 3 : `${Math.max(8, (v / (max || 1)) * 100)}%` }} />)}</div>
            </div>);
        })}
        <p className="hh-note">Cada barra es un día: la negra es el mejor día (o un día hecho), las rojas quedaron por debajo de la meta y las grises son días sin anotar. Metas: {list.filter((s) => s.goal != null).map((s) => `${s.name.toLowerCase()} ${goalText(s)}`).join(", ")}.</p>
      </>}
    </div>
  );
}
