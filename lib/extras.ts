"use client";
// Pedido de Cristian (30-oct, noche): programas, respuestas guardadas, hábitos, récords y resumen semanal (migración 0043).
// Si la 0043 aún no está corrida, estas lecturas fallan con "tabla/función no existe": las tarjetas se ocultan en vez de romper la pantalla.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { localDate } from "@/lib/fetchers";
import { notifyPlan, viaQueue } from "@/lib/queries";
import { queued, useQueueVersion } from "@/lib/offline";
import { useCallback } from "react";
import { DEFAULT_DEFS, specsFor, type ClientGoal, type HabitDay, type HabitDef } from "@/lib/habits";

export const missingObject = (e: { code?: string; message?: string } | null | undefined) => !!e && (e.code === "42P01" || e.code === "42883" || e.code === "PGRST202" || e.code === "PGRST205" || /does not exist|could not find/i.test(e.message ?? ""));
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };

// ---------- Programas ----------
export type Program = { id: string; name: string; weeks: number; notes: string | null; days: { weekday: number; templateId: string; routine: string }[] };
export const usePrograms = () => useQuery({ queryKey: ["programs"], staleTime: 120_000, queryFn: async (): Promise<Program[] | null> => {
  const { data, error } = await db().from("program_templates").select("id,name,weeks,notes,program_days(weekday,template_id,routine_templates(name))").eq("active", true).order("created_at", { ascending: false });
  if (error) { if (missingObject(error)) return null; throw error; }
  type Raw = { id: string; name: string; weeks: number; notes: string | null; program_days: { weekday: number; template_id: string; routine_templates: { name: string } | null }[] };
  return (data as unknown as Raw[]).map((p) => ({ id: p.id, name: p.name, weeks: p.weeks, notes: p.notes, days: p.program_days.map((d) => ({ weekday: d.weekday, templateId: d.template_id, routine: d.routine_templates?.name ?? "Rutina" })).sort((a, b) => a.weekday - b.weekday) }));
} });
export function useSaveProgram() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (p: { id?: string; name: string; weeks: number; notes: string; days: { weekday: number; template_id: string }[] }) => {
      const { error } = await db().rpc("save_program", { p_id: p.id ?? null, p_name: p.name, p_weeks: p.weeks, p_notes: p.notes, p_days: p.days }); if (error) throw error;
    },
    onSuccess: () => toast("Programa guardado"), onError: () => toast("No pudimos guardar el programa. Revisa el nombre y que tenga al menos un día.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}
export function useArchiveProgram() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await db().from("program_templates").update({ active: false }).eq("id", id); if (error) throw error; },
    onSuccess: () => toast("Programa archivado"), onError: () => toast("No pudimos archivarlo. Inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}
export function useApplyProgram(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (programId: string) => { const { error } = await db().rpc("apply_program", { p_client: clientId, p_program: programId }); if (error) throw error; },
    onSuccess: () => { toast("Programa asignado: ya tiene su semana completa"); notifyPlan(clientId, "training"); },
    onError: () => toast("No pudimos asignar el programa. Inténtalo de nuevo.", true),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["plans-of", clientId] }); void qc.invalidateQueries({ queryKey: ["active-plan-clients"] }); },
  });
}

// ---------- Respuestas guardadas ----------
export type Snippet = { id: string; body: string };
export const useSnippets = (enabled = true) => useQuery({ queryKey: ["snippets"], enabled, staleTime: 5 * 60_000, queryFn: async (): Promise<Snippet[] | null> => {
  const { data, error } = await db().from("coach_snippets").select("id,body").order("created_at"); if (error) { if (missingObject(error)) return null; throw error; }
  return data as Snippet[];
} });
export function useAddSnippet(workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (body: string) => { const { error } = await db().from("coach_snippets").insert({ workspace_id: workspaceId, body: body.trim().slice(0, 500) }); if (error) throw error; },
    onSuccess: () => toast("Respuesta guardada"), onError: () => toast("No pudimos guardar la respuesta.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["snippets"] }),
  });
}
export function useDeleteSnippet() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await db().from("coach_snippets").delete().eq("id", id); if (error) throw error; },
    onMutate: (id) => { qc.setQueryData<Snippet[] | null>(["snippets"], (l) => l?.filter((s) => s.id !== id) ?? l); },
    onError: () => toast("No pudimos borrarla.", true), onSettled: () => qc.invalidateQueries({ queryKey: ["snippets"] }),
  });
}

// ---------- Hábitos ----------
export type Habit = HabitDay;
// Con lo anotado sin señal encima (12-nov, lib/offline.ts).
export function useHabits(clientId: string, days = 7) {
  const v = useQueueVersion(clientId);
  const select = useCallback((d: Habit[] | null) => (d && v > 0 ? applyHabitQueue(clientId, d) : d), [clientId, v]); // eslint-disable-line react-hooks/exhaustive-deps
  return useHabitsQ(clientId, days, select);
}
function applyHabitQueue(cid: string, rows: Habit[]): Habit[] {
  const ops = [...queued(cid, "habit"), ...queued(cid, "habitx")]; if (!ops.length) return rows;
  let out = rows;
  for (const o of ops) {
    const cur = out.find((h) => h.day === o.date) ?? { day: o.date, water: null, steps: null, sleep: null, extra: {} };
    const next: Habit = o.t === "habit" ? { ...cur, ...(o.water != null ? { water: o.water } : {}), ...(o.steps != null ? { steps: o.steps } : {}), ...(o.sleep != null ? { sleep: o.sleep } : {}) }
      : { ...cur, extra: Object.fromEntries(Object.entries({ ...(cur.extra ?? {}), [o.habit]: o.value }).filter(([, x]) => x != null)) as Record<string, number> };
    out = [...out.filter((h) => h.day !== o.date), next].sort((a, b) => a.day.localeCompare(b.day));
  }
  return out;
}
const useHabitsQ = (clientId: string, days: number, select: (d: Habit[] | null) => Habit[] | null) => useQuery({ queryKey: ["habits", clientId, days], enabled: !!clientId, staleTime: 60_000, select, queryFn: async (): Promise<Habit[] | null> => {
  const q = (cols: string) => db().from("habit_logs").select(cols).eq("client_id", clientId).gte("day", daysAgo(days - 1)).order("day");
  let { data, error } = await q("day,water,steps,sleep,extra");
  if (error && error.code === "42703") ({ data, error } = await q("day,water,steps,sleep"));   // base sin la 0052
  if (error) { if (missingObject(error)) return null; throw error; }
  return (data as unknown as Habit[]).map((h) => ({ ...h, sleep: h.sleep == null ? null : Number(h.sleep), extra: h.extra ?? {} }));
} });
// Hábitos del negocio (0052). Sin la 0052: los tres de fábrica.
export const useHabitDefs = () => useQuery({ queryKey: ["habit-defs"], staleTime: 5 * 60_000, queryFn: async (): Promise<{ defs: HabitDef[]; ready: boolean }> => {
  const { data, error } = await db().from("habit_defs").select("id,key,name,unit,kind,goal,active,position").order("position");
  if (error) { if (missingObject(error)) return { defs: DEFAULT_DEFS, ready: false }; throw error; }
  const defs = (data as HabitDef[]).map((d) => ({ ...d, goal: d.goal == null ? null : Number(d.goal) }));
  return { defs: defs.length ? defs : DEFAULT_DEFS, ready: defs.length > 0 };
} });
// Metas por cliente (0052). El cliente solo recibe las suyas (RLS); Jeff, las de todos.
export const useClientGoals = () => useQuery({ queryKey: ["habit-goals"], staleTime: 5 * 60_000, queryFn: async (): Promise<ClientGoal[]> => {
  const { data, error } = await db().from("client_habit_goals").select("client_id,habit_id,goal,off");
  if (error) { if (missingObject(error)) return []; throw error; }
  return (data as { client_id: string; habit_id: string; goal: number | null; off: boolean }[]).map((g) => ({ clientId: g.client_id, habitId: g.habit_id, goal: g.goal == null ? null : Number(g.goal), off: g.off }));
} });
/** Los hábitos que aplican a un cliente, con su meta. */
export function useHabitSpecs(clientId: string) {
  const defs = useHabitDefs(), goals = useClientGoals();
  const data = defs.data && goals.data ? specsFor(defs.data.defs, goals.data, clientId) : undefined;
  return { data, isPending: defs.isPending || goals.isPending, isError: defs.isError || goals.isError };
}
// Jeff: lo anotado por todos sus clientes (para "Hábitos").
export const useAllHabitLogs = (days: number) => useQuery({ queryKey: ["habit-logs-all", days], staleTime: 60_000, queryFn: async (): Promise<(Habit & { clientId: string })[] | null> => {
  const q = (cols: string) => db().from("habit_logs").select(cols).gte("day", daysAgo(days)).order("day");
  let { data, error } = await q("client_id,day,water,steps,sleep,extra");
  if (error && error.code === "42703") ({ data, error } = await q("client_id,day,water,steps,sleep"));
  if (error) { if (missingObject(error)) return null; throw error; }
  return (data as unknown as (Habit & { client_id: string })[]).map((h) => ({ clientId: h.client_id, day: h.day, water: h.water, steps: h.steps, sleep: h.sleep == null ? null : Number(h.sleep), extra: h.extra ?? {} }));
} });
const HABIT_ERR: Record<string, string> = { bad_goal: "Esa meta no es válida.", bad_habit: "Revisa el nombre y la unidad.", too_many: "Ya hay 12 hábitos; apaga o reutiliza uno.", not_allowed: "No tienes permiso para esto." };
const habitErr = (e: unknown) => { const m = (e as { message?: string })?.message ?? ""; const k = Object.keys(HABIT_ERR).find((x) => m.includes(x)); return k ? HABIT_ERR[k] : "No pudimos guardarlo. Revisa tu conexión e inténtalo de nuevo."; };
export function useSaveHabitDef() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { id: string | null; name: string; unit: string | null; kind: "number" | "check"; goal: number | null; active: boolean }) => {
      const { error } = await db().rpc("save_habit_def", { p_id: v.id, p_name: v.name, p_unit: v.unit, p_kind: v.kind, p_goal: v.goal, p_active: v.active }); if (error) throw error; },
    onSuccess: (_d, v) => toast(v.id ? "Hábito guardado" : `Hábito agregado: ${v.name}. Ya lo ven tus clientes.`),
    onError: (e) => toast(habitErr(e), true),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["habit-defs"] }); },
  });
}
export function useSetClientGoal() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { clientId: string; habitId: string; goal: number | null; off: boolean }) => {
      const { error } = await db().rpc("set_client_habit_goal", { p_client: v.clientId, p_habit: v.habitId, p_goal: v.goal, p_off: v.off }); if (error) throw error; },
    onMutate: async (v) => { await qc.cancelQueries({ queryKey: ["habit-goals"] }); const prev = qc.getQueryData<ClientGoal[]>(["habit-goals"]);
      qc.setQueryData<ClientGoal[]>(["habit-goals"], (l = []) => [...l.filter((g) => !(g.clientId === v.clientId && g.habitId === v.habitId)), ...(v.goal != null || v.off ? [v] : [])]); return { prev }; },
    onError: (e, _v, ctx) => { qc.setQueryData(["habit-goals"], ctx?.prev); toast(habitErr(e), true); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["habit-goals"] }); },
  });
}
export function useLogHabit(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    networkMode: "always",
    mutationFn: (v: { day: string; water?: number; steps?: number; sleep?: number }) =>
      viaQueue(clientId, { t: "habit", date: v.day, water: v.water, steps: v.steps, sleep: v.sleep }, () => db().rpc("log_habit", { p_day: v.day, p_water: v.water ?? null, p_steps: v.steps ?? null, p_sleep: v.sleep ?? null })),
    onMutate: async (v) => {
      const keys = qc.getQueryCache().findAll({ queryKey: ["habits", clientId] }).map((q) => q.queryKey);
      keys.forEach((k) => qc.setQueryData<Habit[] | null>(k, (l) => {
        if (!l) return l; const cur = l.find((h) => h.day === v.day) ?? { day: v.day, water: null, steps: null, sleep: null };
        const next = { ...cur, ...(v.water != null ? { water: v.water } : {}), ...(v.steps != null ? { steps: v.steps } : {}), ...(v.sleep != null ? { sleep: v.sleep } : {}) };
        return [...l.filter((h) => h.day !== v.day), next].sort((a, b) => a.day.localeCompare(b.day));
      }));
    },
    onError: () => { toast("No pudimos guardar tu hábito. Revisa tu conexión.", true); void qc.invalidateQueries({ queryKey: ["habits", clientId] }); },
  });
}

// Hábitos que agregó Jeff (0052): número o sí/no. `value` nulo = borrar lo anotado ese día.
export function useLogHabitExtra(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    networkMode: "always",
    mutationFn: (v: { day: string; habit: string; value: number | null }) =>
      viaQueue(clientId, { t: "habitx", date: v.day, habit: v.habit, value: v.value }, () => db().rpc("log_habit_extra", { p_day: v.day, p_habit: v.habit, p_value: v.value })),
    onMutate: async (v) => {
      qc.getQueryCache().findAll({ queryKey: ["habits", clientId] }).forEach((q) => qc.setQueryData<Habit[] | null>(q.queryKey, (l) => {
        if (!l) return l; const cur = l.find((h) => h.day === v.day) ?? { day: v.day, water: null, steps: null, sleep: null, extra: {} };
        const extra = { ...(cur.extra ?? {}) }; if (v.value == null) delete extra[v.habit]; else extra[v.habit] = v.value;
        return [...l.filter((h) => h.day !== v.day), { ...cur, extra }].sort((a, b) => a.day.localeCompare(b.day));
      }));
    },
    onError: () => { toast("No pudimos guardar tu hábito. Revisa tu conexión.", true); void qc.invalidateQueries({ queryKey: ["habits", clientId] }); },
  });
}

// ---------- Récords ----------
export type Record_ = { exercise: string; best: number; reps: number; on: string; prev: number | null };
export const useRecords = (clientId: string) => useQuery({ queryKey: ["records", clientId], enabled: !!clientId, staleTime: 5 * 60_000, queryFn: async (): Promise<Record_[] | null> => {
  const { data, error } = await db().rpc("exercise_records", { p_client: clientId }); if (error) { if (missingObject(error)) return null; throw error; }
  type Raw = { exercise: string; best_weight: number; best_reps: number; best_on: string; prev_best: number | null };
  return (data as Raw[]).map((r) => ({ exercise: r.exercise, best: Number(r.best_weight), reps: r.best_reps, on: r.best_on, prev: r.prev_best == null ? null : Number(r.prev_best) }));
} });
/** Récord = superó su mejor peso anterior. La primera vez que hace un ejercicio no cuenta (no hay con qué comparar). */
export const isNewRecord = (r: Record_) => r.prev != null && r.best > r.prev;
/** El mejor peso ANTES de hoy (para saber si la serie que acaba de guardar es récord). */
export const bestBefore = (recs: Record_[] | null | undefined, exercise: string, today: string) => { const r = recs?.find((x) => x.exercise === exercise); if (!r) return null; return r.on === today ? r.prev : r.best; };
// Logros (pedido de Cristian, 2-nov): cuenta RUTINAS COMPLETAS, no entrenamientos terminados. Antes contaba cada vez que tocó
// "Terminar entrenamiento", aunque hubiera hecho un solo ejercicio. Completa = cada ejercicio de esa rutina con todas sus series.
// Si el día de la rutina ya no existe (Jeff lo dejó libre después), no se puede comprobar y no cuenta.
type CountRow = { plan_day_id: string | null; set_logs: { plan_item_id: string | null; set_number: number; kind: string }[]; plan_days: { plan_items: { id: string; sets: number }[] } | null };
export const isFullRoutine = (l: CountRow) => {
  const items = l.plan_days?.plan_items ?? []; if (!items.length) return false;
  return items.every((it) => new Set(l.set_logs.filter((s) => s.plan_item_id === it.id && s.kind === "work" && s.set_number <= it.sets).map((s) => s.set_number)).size >= it.sets);
};
export const useWorkoutCount = (clientId: string) => useQuery({ queryKey: ["workout-count", clientId], enabled: !!clientId, staleTime: 5 * 60_000, queryFn: async (): Promise<{ full: number; finished: number }> => {
  const { data, error } = await db().from("workout_logs").select("plan_day_id,set_logs(plan_item_id,set_number,kind),plan_days(plan_items(id,sets))").eq("client_id", clientId).not("completed_at", "is", null).limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as unknown as CountRow[];
  return { full: rows.filter(isFullRoutine).length, finished: rows.length };
} });
// Logros por entrenamientos completados (no inventa metas de Jeff: son hitos de constancia).
export const MILESTONES = [1, 5, 10, 25, 50, 100, 200];

// ---------- Resumen semanal ----------
export const useMealLogsRange = (clientId: string, days = 7) => useQuery({ queryKey: ["meal-logs-range", clientId, days], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<{ date: string; meal: string }[]> => {
  const { data, error } = await db().from("meal_logs").select("log_date,meal_id").eq("client_id", clientId).gte("log_date", daysAgo(days - 1)); if (error) throw error;
  return (data as { log_date: string; meal_id: string }[]).map((r) => ({ date: r.log_date, meal: r.meal_id }));
} });
export const useClientReportDays = (clientId: string, days = 7) => useQuery({ queryKey: ["report-days", clientId, days], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<string[]> => {
  const { data, error } = await db().from("daily_reports").select("report_date").eq("client_id", clientId).gte("report_date", daysAgo(days - 1)); if (error) throw error;
  return (data as { report_date: string }[]).map((r) => r.report_date);
} });
export const lastNDays = (n: number) => Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i));
