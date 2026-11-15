import type { AttnData, ClientRow, RecentLog } from "@/lib/queries";
export type Attn = { clientId: string; name: string; reason: string; urgent: boolean };
const dayNum = (iso: string) => Math.floor(new Date(iso.length === 10 ? iso + "T00:00:00" : iso).getTime() / 86400000);
const today = () => Math.floor(new Date(new Date().toDateString()).getTime() / 86400000);
// Reglas simples y explicables (sin IA): lo que Jeff necesita ver esta noche, de más a menos urgente.
export function attention(clients: ClientRow[], logs: RecentLog[], withPlan: Set<string>): Attn[] {
  const out: (Attn & { rank: number })[] = [];
  for (const c of clients.filter((x) => x.status === "active")) {
    const mine = logs.filter((l) => l.clientId === c.id && l.completed);
    const unseen = mine.filter((l) => !l.seen), reasons: { t: string; urgent: boolean; rank: number }[] = [];
    if (unseen.length) { const e = unseen[0].effort ?? 0; reasons.push({ t: `${unseen.length} entrenamiento${unseen.length > 1 ? "s" : ""} sin revisar${e ? ` · último esfuerzo ${e}/10` : ""}`, urgent: e >= 9, rank: e >= 9 ? 3 : 1 }); }
    if (!withPlan.has(c.id)) reasons.push({ t: "Aún no tiene un plan de entrenamiento asignado", urgent: false, rank: 2 });
    else {
      const last = mine[0] ? dayNum(mine[0].date) : dayNum(c.createdAt), d = today() - last;
      if (d >= 3) reasons.push({ t: mine[0] ? `Sin entrenar hace ${d} días` : "Aún no registra su primer entrenamiento", urgent: d >= 5, rank: d >= 5 ? 4 : 2 });
    }
    if (reasons.length) { reasons.sort((a, b) => b.rank - a.rank); out.push({ clientId: c.id, name: c.name, reason: reasons.map((r) => r.t).join(" · "), urgent: reasons.some((r) => r.urgent), rank: reasons[0].rank }); }
  }
  return out.sort((a, b) => b.rank - a.rank);
}

// ---- "Necesitan tu atención" (pedido de Cristian, 29-oct) ----
// Reglas simples y explicables sobre lo que devuelve coach_attention() (0041). Lo marcado PROPUESTA son umbrales a validar con Jeff.
export type NeedKind = "urgent" | "setup" | "call" | "review";
export type NeedTag = "inactive" | "report" | "no_training" | "no_days" | "empty_days" | "no_nutrition" | "first_call" | "month_call" | "review";
export type Need = { clientId: string; name: string; kind: NeedKind; tag: NeedTag; text: string; days?: number };
const bog = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const ymdOf = (iso: string) => (iso.length === 10 ? iso : new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }));
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
const maxYmd = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).map(ymdOf).sort().pop() ?? null;
export const INACTIVE_DAYS = 2, REPORT_DAYS = 2, CALL_DAY = 15, FIRST_CALL_DAYS = 3;   // PROPUESTA (CALL_DAY y INACTIVE/REPORT los pidió Cristian; FIRST_CALL_DAYS es propuesta)
export function needs(rows: AttnData[], names: Map<string, string>, today = bog()): Need[] {
  const out: Need[] = [];
  for (const r of rows) {
    const name = names.get(r.clientId) ?? "Cliente";
    const start = r.planSince ?? (r.activatedAt ? ymdOf(r.activatedAt) : ymdOf(r.createdAt)), sinceStart = Math.max(0, diffDays(today, start));
    const add = (kind: NeedKind, tag: NeedTag, text: string, days?: number) => out.push({ clientId: r.clientId, name, kind, tag, text, days });
    // Urgentes por contactar: sin ninguna actividad (entreno, comidas, reporte o mensaje) o sin reporte, 2 días o más.
    const lastAct = maxYmd([r.lastWorkout, r.lastReport, r.lastMeal, r.lastMessage]);
    const idle = lastAct ? diffDays(today, lastAct) : sinceStart;
    if (idle >= INACTIVE_DAYS) add("urgent", "inactive", lastAct ? `${idle} días sin ninguna actividad` : `Sin actividad desde que empezó (${idle} días)`, idle);
    else if (r.features.includes("daily_report")) {
      const noRep = r.lastReport ? diffDays(today, r.lastReport) : sinceStart;
      if (noRep >= REPORT_DAYS) add("urgent", "report", r.lastReport ? `${noRep} días sin reporte` : `Aún no envía su primer reporte (${noRep} días)`, noRep);
    }
    // Falta configurar: lo que su plan incluye y Jeff aún no le asigna.
    if (r.features.includes("training")) {
      if (!r.trainingPlan) add("setup", "no_training", "Sin rutina asignada");
      else if (!r.planDays) add("setup", "no_days", "Su rutina no tiene días asignados");
      else if (r.emptyDays) add("setup", "empty_days", `${r.emptyDays} día${r.emptyDays === 1 ? "" : "s"} de su rutina sin ejercicios`);
    }
    if (r.features.includes("nutrition") && !r.nutrition) add("setup", "no_nutrition", "Sin plan de nutrición asignado");
    // Llamada del mes: una por cada mes de plan (30 días desde plan_since). Alerta desde el día 15 si aún no la tiene ni agendada.
    if (!r.nextCall) {
      if (!r.lastCall) { if (sinceStart >= FIRST_CALL_DAYS) add("call", "first_call", `Aún no agenda su primera llamada (lleva ${sinceStart} días)`, sinceStart); }
      else {
        const into = sinceStart % 30, cycleStart = (() => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - into); return d.toISOString().slice(0, 10); })();
        if (into >= CALL_DAY && ymdOf(r.lastCall) < cycleStart) add("call", "month_call", `Llamada del mes sin agendar (día ${into + 1} de 30)`, into + 1);
      }
    }
    // Plan por revisar: Jeff marcó una fecha de revisión en la ficha (Entrenamiento → nivel y revisión) y ya llegó.
    if (r.reviewOn && r.reviewOn <= today) add("review", "review", diffDays(today, r.reviewOn) === 0 ? "Hoy toca revisar su plan" : `Revisar su plan (lo marcaste para hace ${diffDays(today, r.reviewOn)} días)`);
  }
  const rank: Record<NeedKind, number> = { urgent: 0, setup: 1, call: 2, review: 3 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (b.days ?? 0) - (a.days ?? 0) || a.name.localeCompare(b.name));
}
