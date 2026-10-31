"use client";
// Pedido de Cristian (30-oct, noche): programas, respuestas guardadas, hábitos, récords y resumen semanal (migración 0043).
// Si la 0043 aún no está corrida, estas lecturas fallan con "tabla/función no existe": las tarjetas se ocultan en vez de romper la pantalla.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { localDate } from "@/lib/fetchers";

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
    onSuccess: () => toast("Programa asignado: ya tiene su semana completa"),
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
export type Habit = { day: string; water: number | null; steps: number | null; sleep: number | null };
export const useHabits = (clientId: string, days = 7) => useQuery({ queryKey: ["habits", clientId, days], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<Habit[] | null> => {
  const { data, error } = await db().from("habit_logs").select("day,water,steps,sleep").eq("client_id", clientId).gte("day", daysAgo(days - 1)).order("day");
  if (error) { if (missingObject(error)) return null; throw error; }
  return (data as Habit[]).map((h) => ({ ...h, sleep: h.sleep == null ? null : Number(h.sleep) }));
} });
export function useLogHabit(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { day: string; water?: number; steps?: number; sleep?: number }) => {
      const { error } = await db().rpc("log_habit", { p_day: v.day, p_water: v.water ?? null, p_steps: v.steps ?? null, p_sleep: v.sleep ?? null }); if (error) throw error;
    },
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
export const useWorkoutCount = (clientId: string) => useQuery({ queryKey: ["workout-count", clientId], enabled: !!clientId, staleTime: 5 * 60_000, queryFn: async (): Promise<number> => {
  const { count, error } = await db().from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", clientId).not("completed_at", "is", null); if (error) throw error; return count ?? 0;
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
