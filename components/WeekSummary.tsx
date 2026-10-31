"use client";
// Resumen de la semana (pedido de Cristian, 30-oct, noche): lo que hizo el cliente en los últimos 7 días, en una sola tarjeta.
// Jeff lo ve en la ficha (Resumen) y puede mandárselo con un toque; el cliente ve el suyo en Progreso.
import Link from "next/link";
import { useClientLogs, useClientNutrition, useMeasures, useTrainingPlans } from "@/lib/queries";
import { isNewRecord, lastNDays, useClientReportDays, useHabits, useMealLogsRange, useRecords, useWorkoutCount, MILESTONES } from "@/lib/extras";
import { Icon } from "@/components/ui/Icon";

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
  return { pending, plan, planned: planned.length, done: weekLogs.length, effort, mealDays, reports: reps.data?.length ?? null, water, steps, sleep, habits: h !== null && h.length > 0, newRecs, lastW: lastW?.weight ?? null, wDelta };
}

export function WeekSummary({ clientId, first, mode }: { clientId: string; first: string; mode: "coach" | "client" }) {
  const w = useWeek(clientId), coach = mode === "coach";
  if (w.pending) return <div className="card" style={{ marginBottom: 16 }}><div className="sk" style={{ height: 120 }} /></div>;
  const tiles: { k: string; v: string; s?: string }[] = [];
  if (w.plan) tiles.push({ k: "Entrenos", v: `${w.done}/${w.planned || w.done}`, s: w.effort ? `esfuerzo ${dec(w.effort)}/10` : undefined });
  else if (w.done) tiles.push({ k: "Entrenos", v: String(w.done) });
  if (w.mealDays != null) tiles.push({ k: "Nutrición", v: `${w.mealDays}/7`, s: "días completos" });
  if (w.reports != null) tiles.push({ k: "Reportes", v: `${w.reports}/7` });
  if (w.water != null) tiles.push({ k: "Agua", v: dec(w.water), s: "vasos al día" });
  if (w.steps != null) tiles.push({ k: "Pasos", v: Math.round(w.steps).toLocaleString("es"), s: "al día" });
  if (w.sleep != null) tiles.push({ k: "Sueño", v: `${dec(w.sleep)} h`, s: "por noche" });
  if (w.lastW != null) tiles.push({ k: "Peso", v: kg(w.lastW), s: w.wDelta != null ? `${w.wDelta > 0 ? "+" : w.wDelta < 0 ? "−" : ""}${kg(Math.abs(w.wDelta))} en la semana` : undefined });
  const msg = [
    `Resumen de tu semana, ${first}:`,
    w.plan ? `entrenaste ${w.done} de ${w.planned || w.done} días` : w.done ? `entrenaste ${w.done} días` : null,
    w.mealDays != null ? `nutrición completa ${w.mealDays} de 7 días` : null,
    w.newRecs.length ? `${w.newRecs.length === 1 ? "1 récord nuevo" : `${w.newRecs.length} récords nuevos`} (${w.newRecs.slice(0, 2).map((r) => `${r.exercise} ${kg(r.best)}`).join(", ")})` : null,
  ].filter(Boolean).join(" · ").replace(":  · ", ": ").replace(": · ", ": ") + ". ";
  return (
    <div className="card wk-card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><div className="card-tag">{coach ? "Resumen de la semana" : "Tu semana"}</div><div className="card-title" style={{ fontSize: 15 }}>Últimos 7 días</div></div>
        {coach && <Link className="pd-btn primary" style={{ textDecoration: "none" }} href={`/coach/mensajes?c=${clientId}&t=${encodeURIComponent(msg)}`}><Icon name="send" size={13} /> Enviarle el resumen</Link>}</div>
      {!tiles.length ? <p className="empty-note" style={{ marginTop: 6 }}>{coach ? `${first} no registró nada en los últimos 7 días.` : "Aún no hay nada registrado esta semana."}</p> : (
        <div className="wk-grid">{tiles.map((t) => <div key={t.k} className="wk-tile"><small>{t.k}</small><b>{t.v}</b>{t.s && <span>{t.s}</span>}</div>)}</div>)}
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
  const n = count.data ?? 0, got = MILESTONES.filter((m) => n >= m), next = MILESTONES.find((m) => n < m);
  return (
    <div className="card rec-card">
      <div className="card-tag">{coach ? "Récords y logros" : "Tus récords y logros"}</div>
      <div className="card-title" style={{ fontSize: 16 }}>{count.isPending ? "…" : `${n} entrenamiento${n === 1 ? "" : "s"} completado${n === 1 ? "" : "s"}`}</div>
      <div className="ach-row">{MILESTONES.map((m) => <span key={m} className={`ach${n >= m ? " on" : ""}`} title={n >= m ? "Logrado" : "Por lograr"}>{m}</span>)}</div>
      <p className="card-meta" style={{ margin: "6px 0 10px" }}>{next ? `${got.length ? "¡Vas muy bien! " : ""}Te faltan ${next - n} para llegar a ${next}.` : "Completaste todos los logros. Impresionante."}</p>
      {recs.isPending ? <div className="sk" style={{ height: 60 }} /> : !list.length ? <p className="empty-note">{coach ? "Aún no hay series con peso registradas." : "Cuando registres series con peso, aquí verás tu mejor marca de cada ejercicio."}</p>
        : <div className="rec-list">{list.slice(0, 12).map((r) => <div key={r.exercise} className="rec-row"><span className="rec-name">{r.exercise}{r.on >= from && isNewRecord(r) && <i className="rec-new">Nuevo</i>}</span><span className="rec-val">{kg(r.best)} × {r.reps}</span><span className="rec-date">{new Date(`${r.on}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}</span></div>)}</div>}
    </div>
  );
}
