"use client";
// Resumen de la semana (pedido de Cristian, 30-oct, noche): lo que hizo el cliente en los últimos 7 días, en una sola tarjeta.
// Jeff lo ve en la ficha (Resumen) y puede mandárselo con un toque; el cliente ve el suyo en Progreso.
import Link from "next/link";
import { useClientLogs, useClientNutrition, useMeasures, useTrainingPlans } from "@/lib/queries";
import { isNewRecord, lastNDays, useClientReportDays, useHabits, useMealLogsRange, useRecords, useWorkoutCount, MILESTONES } from "@/lib/extras";
import { Icon } from "@/components/ui/Icon";
import { HABIT_MIN, HABIT_TXT, isLow, lowDays, shortDay, type HabitKey } from "@/lib/habits";

const kg = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")} kg`;
const dec = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const wdOf = (ymd: string) => { const d = new Date(`${ymd}T12:00:00`); return (d.getDay() + 6) % 7 + 1; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function useWeek(clientId: string) {
  const days = lastNDays(7), from = days[0];
  const plans = useTrainingPlans(clientId), logs = useClientLogs(clientId), nut = useClientNutrition(clientId), meals = useMealLogsRange(clientId, 7);
  const reps = useClientReportDays(clientId, 7), hab = useHabits(clientId, 7), recs = useRecords(clientId), ms = useMeasures(clientId);
  const pending = plans.isPending || logs.isPending || ms.isPending;
  const plan = plans.data?.find((p) => p.status === "active");
  const planned = plan ? days.filter((d) => d >= plan.startsOn && plan.days.some((x) => x.weekday === wdOf(d))) : [];
  const weekLogs = (logs.data ?? []).filter((l) => l.date >= from && l.completed);
  const effort = avg(weekLogs.map((l) => l.effort).filter((e): e is number => e != null));
  const mealDays = nut.data ? days.filter((d) => { const need = nut.data!.meals.filter((m) => m.weekday === null || m.weekday === wdOf(d)); if (!need.length) return false; const got = new Set((meals.data ?? []).filter((x) => x.date === d).map((x) => x.meal)); return need.every((m) => !!m.id && got.has(m.id)); }).length : null;
  const h = hab.data ?? null;
  const water = h ? avg(h.map((x) => x.water).filter((x): x is number => x != null)) : null, steps = h ? avg(h.map((x) => x.steps).filter((x): x is number => x != null)) : null, sleep = h ? avg(h.map((x) => x.sleep).filter((x): x is number => x != null)) : null;
  const newRecs = (recs.data ?? []).filter((r) => r.on >= from && isNewRecord(r));
  const wList = (ms.data ?? []).filter((m) => m.weight != null), lastW = wList[wList.length - 1], baseW = [...wList].reverse().find((m) => m.date < from);
  const wDelta = lastW && baseW && lastW.date >= from ? (lastW.weight as number) - (baseW.weight as number) : null;
  const lows = h ? ((["sleep", "water", "steps"] as HabitKey[]).map((k) => ({ k, days: lowDays(h, k) })).filter((x) => x.days.length)) : [];
  return { pending, plan, planned: planned.length, done: weekLogs.length, effort, mealDays, reports: reps.data?.length ?? null, water, steps, sleep, habits: h !== null && h.length > 0, lows, newRecs, lastW: lastW?.weight ?? null, wDelta };
}

export function WeekSummary({ clientId, first, mode }: { clientId: string; first: string; mode: "coach" | "client" }) {
  const w = useWeek(clientId), coach = mode === "coach";
  if (w.pending) return <div className="card" style={{ marginBottom: 16 }}><div className="sk" style={{ height: 120 }} /></div>;
  const tiles: { k: string; v: string; s?: string; low?: boolean }[] = [];
  if (w.plan) tiles.push({ k: "Entrenos", v: `${w.done}/${w.planned || w.done}`, s: w.effort ? `esfuerzo ${dec(w.effort)}/10` : undefined });
  else if (w.done) tiles.push({ k: "Entrenos", v: String(w.done) });
  if (w.mealDays != null) tiles.push({ k: "Nutrición", v: `${w.mealDays}/7`, s: "días completos" });
  if (w.reports != null) tiles.push({ k: "Reportes", v: `${w.reports}/7` });
  if (w.water != null) tiles.push({ k: "Agua", v: dec(w.water), s: "vasos al día", low: isLow("water", w.water) });
  if (w.steps != null) tiles.push({ k: "Pasos", v: Math.round(w.steps).toLocaleString("es-CO"), s: "al día", low: isLow("steps", w.steps) });
  if (w.sleep != null) tiles.push({ k: "Sueño", v: `${dec(w.sleep)} h`, s: "por noche", low: isLow("sleep", w.sleep) });
  if (w.lastW != null) tiles.push({ k: "Peso", v: kg(w.lastW), s: w.wDelta != null ? `${w.wDelta > 0 ? "+" : w.wDelta < 0 ? "−" : ""}${kg(Math.abs(w.wDelta))} en la semana` : undefined });
  const msg = [
    `Resumen de tu semana, ${first}:`,
    w.plan ? `entrenaste ${w.done} de ${w.planned || w.done} días` : w.done ? `entrenaste ${w.done} días` : null,
    w.mealDays != null ? `nutrición completa ${w.mealDays} de 7 días` : null,
    w.sleep != null ? `dormiste ${dec(w.sleep)} h por noche` : null,
    w.water != null ? `${dec(w.water)} vasos de agua al día` : null,
    w.newRecs.length ? `${w.newRecs.length === 1 ? "1 récord nuevo" : `${w.newRecs.length} récords nuevos`} (${w.newRecs.slice(0, 2).map((r) => `${r.exercise} ${kg(r.best)}`).join(", ")})` : null,
  ].filter(Boolean).join(" · ").replace(":  · ", ": ").replace(": · ", ": ") + ". ";
  return (
    <div className="card wk-card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><div className="card-tag">{coach ? "Resumen de la semana" : "Tu semana"}</div><div className="card-title" style={{ fontSize: 15 }}>Últimos 7 días</div></div>
        {coach && <Link className="pd-btn primary" style={{ textDecoration: "none" }} href={`/coach/mensajes?c=${clientId}&t=${encodeURIComponent(msg)}`}><Icon name="send" size={13} /> Enviarle el resumen</Link>}</div>
      {!tiles.length ? <p className="empty-note" style={{ marginTop: 6 }}>{coach ? `${first} no registró nada en los últimos 7 días.` : "Aún no hay nada registrado esta semana."}</p> : (
        <div className="wk-grid">{tiles.map((t) => <div key={t.k} className={`wk-tile${t.low ? " low" : ""}`}><small>{t.k}</small><b>{t.v}</b>{t.s && <span>{t.s}</span>}</div>)}</div>)}
      {!!w.lows.length && <div className="wk-lows" role="status"><Icon name="bell" size={14} /><span><b>{coach ? "Hábitos por debajo del mínimo" : "Días que te quedaste corto"}:</b> {w.lows.map((x) => `${HABIT_TXT[x.k].low} ${x.days.length === 1 ? "1 día" : `${x.days.length} días`} (${x.days.map(shortDay).join(", ")})`).join(" · ")}. <small>Mínimo: {HABIT_MIN.water} vasos, {HABIT_MIN.sleep} h de sueño, {HABIT_TXT.steps.unit(HABIT_MIN.steps)} pasos.</small></span></div>}
      {!!w.newRecs.length && <div className="wk-recs"><span className="card-tag" style={{ marginBottom: 4 }}>Récords de la semana</span>{w.newRecs.map((r) => <div key={r.exercise} className="wk-rec"><Icon name="up" size={13} /><b>{r.exercise}</b><span>{kg(r.best)} × {r.reps}{r.prev != null ? ` (antes ${kg(r.prev)})` : ""}</span></div>)}</div>}
      {coach && <p className="wk-note">“Enviarle el resumen” abre Mensajes con este resumen ya escrito para que agregues tu comentario.</p>}
    </div>
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

// Historial de hábitos (pedido de Cristian, 2-nov): los últimos 30 días, igual para Jeff y para el cliente (Progreso).
// Por hábito: promedio de los días anotados, mejor día y cuántos días anotó; arriba, la racha de días seguidos anotando.
// Sin metas: las metas de Jeff están NO DEFINIDO, así que no se marca "cumplido".
type HabK = "water" | "steps" | "sleep";
const HAB: { k: HabK; t: string; unit: (n: number) => string }[] = [
  { k: "water", t: "Agua", unit: (n) => `${dec(n)} ${n === 1 ? "vaso" : "vasos"}` },
  { k: "steps", t: "Pasos", unit: (n) => Math.round(n).toLocaleString("es-CO") },
  { k: "sleep", t: "Sueño", unit: (n) => `${dec(n)} h` },
];
export function HabitsHistory({ clientId, mode }: { clientId: string; mode: "coach" | "client" }) {
  const h = useHabits(clientId, 30), days = lastNDays(30);
  if (h.isPending) return <div className="card" style={{ marginBottom: 18 }}><div className="sk" style={{ height: 120 }} /></div>;
  if (!h.data) return null;   // 0043 sin correr
  const by = new Map(h.data.map((x) => [x.day, x]));
  const any = (d: string) => { const x = by.get(d); return !!x && (x.water != null || x.steps != null || x.sleep != null); };
  // Racha: días seguidos anotando, contando hasta hoy (si hoy aún no anota, cuenta hasta ayer).
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (any(days[i])) streak++; else if (i === days.length - 1) continue; else break; }
  const logged = days.filter(any).length;
  return (
    <div className="card hab-hist" style={{ marginBottom: 18 }}>
      <div className="card-tag">{mode === "coach" ? "Hábitos (30 días)" : "Tus hábitos (30 días)"}</div>
      {!logged ? <p className="empty-note">{mode === "coach" ? "Aún no anota agua, pasos ni sueño." : "Cuando anotes tu agua, pasos y sueño en Hoy, aquí verás tu historial y tus mejores días."}</p> : <>
        <div className="card-title" style={{ fontSize: 16 }}>{streak > 1 ? `${streak} días seguidos anotando` : `${mode === "coach" ? "Anotó" : "Anotaste"} ${logged} de los últimos 30 días`}</div>
        {HAB.map(({ k, t, unit }) => {
          const vals = days.map((d) => (by.get(d)?.[k] ?? null) as number | null), got = vals.filter((v): v is number => v != null);
          if (!got.length) return null;
          const max = Math.max(...got), bestI = vals.lastIndexOf(max), mean = got.reduce((a, b) => a + b, 0) / got.length, lowN = got.filter((v) => isLow(k, v)).length;
          return (
            <div key={k} className="hh-row">
              <div className="hh-head"><b>{t}</b><span>promedio {unit(mean)} · mejor día {unit(max)} ({new Date(`${days[bestI]}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}) · {got.length} {got.length === 1 ? "día" : "días"}{lowN ? ` · ${lowN} con ${HABIT_TXT[k].low}` : ""}</span></div>
              <div className="hh-bars" aria-hidden>{vals.map((v, i) => <i key={days[i]} className={v == null ? "none" : isLow(k, v) ? "low" : i === bestI ? "best" : ""} style={{ height: v == null ? 3 : `${Math.max(8, (v / (max || 1)) * 100)}%` }} />)}</div>
            </div>);
        })}
        <p className="hh-note">Cada barra es un día: la negra es el mejor día, las rojas quedaron por debajo del mínimo ({HABIT_MIN.water} vasos, {HABIT_MIN.sleep} h, {HABIT_TXT.steps.unit(HABIT_MIN.steps)} pasos) y las grises son días sin anotar.</p>
      </>}
    </div>
  );
}
