import { localDate, useNutritionClients, usePlans, useTodayActivity, type ClientRow, type CoachReport, type RecentLog } from "@/lib/queries";
import type { Attn } from "@/lib/attention";

export type Item = "done" | "missing" | "na";
export type FollowRow = { id: string; name: string; plan: string | null; train: Item; meals: Item; report: Item; missing: number; nothing: boolean; note: string | null; urgent: boolean };

// Qué ha hecho hoy cada cliente activo y qué le falta de lo que le corresponde (entrenar, nutrición, reporte diario).
// "Le corresponde" = tiene plan de entrenamiento activo / plan de nutrición activo / un plan que exige el reporte diario.
export function useFollowUp(clients: ClientRow[], logs: RecentLog[], withPlan: Set<string>, reports: CoachReport[], attn: Attn[]): FollowRow[] {
  const today = localDate(), ev = useTodayActivity().data ?? [], nut = new Set(useNutritionClients().data ?? []), plans = usePlans().data ?? [];
  const featuresOf = (planId: string | null) => plans.find((p) => p.id === planId)?.features ?? [];
  const trainedIds = new Set([...logs.filter((l) => l.completed && l.date === today).map((l) => l.clientId), ...ev.filter((e) => e.kind !== "nutrition_done").map((e) => e.clientId)]);
  const mealsIds = new Set(ev.filter((e) => e.kind !== "training_done").map((e) => e.clientId));
  const reportIds = new Set(reports.filter((r) => r.date === today).map((r) => r.clientId));
  const note = new Map(attn.map((a) => [a.clientId, a]));
  const rows = clients.filter((c) => c.status === "active").map((c): FollowRow => {
    const f = featuresOf(c.planId);
    const train: Item = withPlan.has(c.id) ? (trainedIds.has(c.id) ? "done" : "missing") : "na";
    const meals: Item = nut.has(c.id) ? (mealsIds.has(c.id) ? "done" : "missing") : "na";
    const report: Item = f.includes("daily_report") ? (reportIds.has(c.id) ? "done" : "missing") : "na";
    const all = [train, meals, report], required = all.filter((x) => x !== "na").length, missing = all.filter((x) => x === "missing").length;
    const a = note.get(c.id);
    return { id: c.id, name: c.name, plan: c.plan, train, meals, report, missing, nothing: required > 0 && missing === required, note: a?.reason ?? null, urgent: !!a?.urgent };
  });
  return rows.sort((a, b) => Number(b.nothing) - Number(a.nothing) || b.missing - a.missing || Number(b.urgent) - Number(a.urgent) || a.name.localeCompare(b.name));
}
