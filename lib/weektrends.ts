"use client";
// Semana a semana (22-nov, pedido de Cristian): en Progreso, comparar las semanas del cliente y ver su promedio en todo lo que
// cuenta el resumen: entrenos, rutinas completas (logros), esfuerzo, peso movido, récords, nutrición, reportes, hábitos y peso.
// Las semanas son las del cliente (bloques de 7 días desde que empezó con Yeff, lib/clientweek.ts). La comparación y el promedio
// usan solo semanas COMPLETAS; la semana en curso se muestra aparte, con los días que van.
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useClientNutrition, useMeasures, useTrainingPlans } from "@/lib/queries";
import { isFullRoutine, useClientReportDays, useHabitSpecs, useHabits, useMealLogsRange } from "@/lib/extras";
import { clientWeeks } from "@/lib/clientweek";
import { addDays } from "@/lib/planmonth";
import { habitStats, type HabitSpec } from "@/lib/habits";

export const TREND_WEEKS = 8;
const WINDOW = TREND_WEEKS * 7 + 7;
const wdOf = (ymd: string) => { const d = new Date(`${ymd}T12:00:00`); return (d.getDay() + 6) % 7 + 1; };
const range = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

type LogRow = { log_date: string; effort: number | null; plan_day_id: string | null; set_logs: { exercise_name: string; weight: number | null; reps: number | null; kind: string; plan_item_id: string | null; set_number: number }[]; plan_days: { plan_items: { id: string; sets: number }[] } | null };
// Todo el historial de entrenos terminados (para los récords hace falta saber el mejor peso de antes).
const useAllLogs = (clientId: string) => useQuery({ queryKey: ["trend-logs", clientId], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<LogRow[]> => {
  const { data, error } = await db().from("workout_logs").select("log_date,effort,plan_day_id,set_logs(exercise_name,weight,reps,kind,plan_item_id,set_number),plan_days(plan_items(id,sets))")
    .eq("client_id", clientId).not("completed_at", "is", null).order("log_date", { ascending: false }).limit(1000);
  // Los 1.000 más recientes (si hubiera más, se pierden los más viejos y no las semanas que se muestran); en orden de fecha.
  if (error) throw error; return ((data ?? []) as unknown as LogRow[]).reverse();
} });

/** La semana del cliente que empezó en `from`: `days` son los que cuentan (7, o los que van si está en curso). */
export type TrendWeek = { n: number; from: string; to: string; days: number; complete: boolean };
export type Metric = { key: string; label: string; unit: string; kind: "count" | "avg" | "last"; vals: (number | null)[]; of?: (number | null)[]; fmt: (v: number) => string; hint: string };

const dec = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const int = (n: number) => Math.round(n).toLocaleString("es-CO");

export function useWeekTrends(clientId: string, start: string | undefined) {
  const plans = useTrainingPlans(clientId), logs = useAllLogs(clientId), nut = useClientNutrition(clientId), meals = useMealLogsRange(clientId, WINDOW);
  const reps = useClientReportDays(clientId, WINDOW), hab = useHabits(clientId, WINDOW), specs = useHabitSpecs(clientId), ms = useMeasures(clientId);
  const pending = !start || plans.isPending || logs.isPending || ms.isPending || specs.isPending || nut.isPending || meals.isPending || reps.isPending || hab.isPending;
  const error = logs.isError || ms.isError || meals.isError || reps.isError;
  if (pending || !start) return { pending: true as const, error, weeks: [] as TrendWeek[], metrics: [] as Metric[] };
  const cw = clientWeeks(start), first = Math.max(1, cw.current.n - TREND_WEEKS + 1);
  const weeks: TrendWeek[] = []; const spans: string[][] = [];
  for (let n = first; n <= cw.current.n; n++) {
    const from = addDays(start, (n - 1) * 7), to = addDays(from, 6), complete = n < cw.current.n;
    const days = complete ? range(from, to) : cw.current.days;
    weeks.push({ n, from, to, days: days.length, complete }); spans.push(days);
  }
  const inW = (i: number, d: string) => d >= weeks[i].from && d <= weeks[i].to;
  const L = logs.data ?? [];
  // Récords: el día en que el mejor peso de un ejercicio supera al mejor de antes (como "récords de la semana" del resumen).
  const best = new Map<string, number>(), recDays: string[] = [];
  for (const l of L) { const top = new Map<string, number>();
    for (const s of l.set_logs) if (s.kind !== "warmup" && s.weight != null && s.weight > 0) top.set(s.exercise_name, Math.max(top.get(s.exercise_name) ?? 0, s.weight));
    top.forEach((w, ex) => { const b = best.get(ex); if (b != null && w > b) recDays.push(l.log_date); if (b == null || w > b) best.set(ex, w); }); }
  const plan = plans.data?.find((p) => p.status === "active");
  const per = <T,>(f: (days: string[], i: number) => T) => spans.map((d, i) => f(d, i));
  const wl = per((_, i) => L.filter((l) => inW(i, l.log_date)));
  const metrics: Metric[] = [];
  metrics.push({ key: "train", label: "Entrenos", unit: "", kind: "count", vals: wl.map((x) => x.length), of: plan ? per((d) => d.filter((x) => x >= plan.startsOn && plan.days.some((p) => p.weekday === wdOf(x))).length || null) : undefined, fmt: int, hint: "entrenamientos terminados" });
  metrics.push({ key: "full", label: "Rutinas completas", unit: "", kind: "count", vals: wl.map((x) => x.filter((l) => isFullRoutine(l as Parameters<typeof isFullRoutine>[0])).length), fmt: int, hint: "logros: todas las series de la rutina" });
  metrics.push({ key: "effort", label: "Esfuerzo", unit: "/10", kind: "avg", vals: wl.map((x) => avg(x.map((l) => l.effort).filter((e): e is number => e != null))), fmt: dec, hint: "promedio de la semana" });
  metrics.push({ key: "volume", label: "Peso movido", unit: " kg", kind: "count", vals: wl.map((x) => x.reduce((a, l) => a + l.set_logs.filter((s) => s.kind !== "warmup").reduce((b, s) => b + (s.reps ?? 0) * (s.weight ?? 0), 0), 0)), fmt: int, hint: "repeticiones × kg" });
  metrics.push({ key: "recs", label: "Récords", unit: "", kind: "count", vals: per((_, i) => recDays.filter((d) => inW(i, d)).length), fmt: int, hint: "veces que superó el mejor peso" });
  if (nut.data) { const N = nut.data;
    metrics.push({ key: "meals", label: "Nutrición", unit: "", kind: "count", vals: per((d) => d.filter((x) => { const need = N.meals.filter((m) => m.weekday === null || m.weekday === wdOf(x)); if (!need.length) return false; const got = new Set((meals.data ?? []).filter((r) => r.date === x).map((r) => r.meal)); return need.every((m) => !!m.id && got.has(m.id)); }).length), of: per((d) => d.length), fmt: int, hint: "días con todas las comidas" }); }
  metrics.push({ key: "reports", label: "Reportes", unit: "", kind: "count", vals: per((_, i) => (reps.data ?? []).filter((d) => inW(i, d)).length), of: per((d) => d.length), fmt: int, hint: "días con reporte" });
  const H = hab.data ?? [];
  for (const s of (specs.data ?? []) as HabitSpec[]) {
    const st = per((d) => habitStats(s, H.filter((x) => d.includes(x.day)), d));
    if (!st.some((x) => x.n > 0)) continue;
    if (s.kind === "check") metrics.push({ key: `h-${s.key}`, label: s.name, unit: "", kind: "count", vals: st.map((x) => (x.n ? x.done : null)), of: per((d) => d.length), fmt: int, hint: "días hecho" });
    else metrics.push({ key: `h-${s.key}`, label: s.name, unit: s.key === "sleep" ? " h" : "", kind: "avg", vals: st.map((x) => x.avg), fmt: s.key === "steps" ? int : dec, hint: s.key === "water" ? "vasos al día, promedio" : s.key === "sleep" ? "horas por noche, promedio" : "promedio al día" });
  }
  const W = (ms.data ?? []).filter((m) => m.weight != null);
  if (W.length) metrics.push({ key: "weight", label: "Peso", unit: " kg", kind: "last", vals: per((_, i) => { const x = [...W].reverse().find((m) => inW(i, m.date)); return x ? (x.weight as number) : null; }), fmt: dec, hint: "última medición de la semana" });
  return { pending: false as const, error, weeks, metrics };
}

/** Semanas completas con dato: la última, la anterior y el promedio. El peso no se promedia: se compara con la anterior. */
export function compare(m: Metric, weeks: TrendWeek[]) {
  const done = weeks.map((w, i) => ({ w, v: m.vals[i] })).filter((x) => x.w.complete && x.v != null) as { w: TrendWeek; v: number }[];
  const last = done[done.length - 1] ?? null, prev = done[done.length - 2] ?? null;
  return { last, prev, delta: last && prev ? last.v - prev.v : null, mean: done.length ? done.reduce((a, x) => a + x.v, 0) / done.length : null, count: done.length };
}
