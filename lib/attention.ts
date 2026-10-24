import type { ClientRow, RecentLog } from "@/lib/queries";
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
