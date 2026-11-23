// Resúmenes de la semana enviados por Jeff (0053).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { clientWeeks } from "@/lib/clientweek";
export type SentWeek = { id: string; clientId: string; n: number; from: string; to: string; note: string | null; sentAt: string; seenAt: string | null; messageId: string | null };
const missing = (e: { code?: string; message?: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? "");
const map = (r: { id: string; client_id: string; week_n: number; from_day: string; to_day: string; note: string | null; sent_at: string; seen_at: string | null; message_id: string | null }): SentWeek =>
  ({ id: r.id, clientId: r.client_id, n: r.week_n, from: r.from_day, to: r.to_day, note: r.note, sentAt: r.sent_at, seenAt: r.seen_at, messageId: r.message_id });
const COLS = "id,client_id,week_n,from_day,to_day,note,sent_at,seen_at,message_id";
/** Los de un cliente (Jeff) o los míos (cliente; RLS). null = falta la 0053. */
export const useSentWeeks = (clientId: string) => useQuery({ queryKey: ["week-sums", clientId], enabled: !!clientId, staleTime: 60_000, queryFn: async (): Promise<SentWeek[] | null> => {
  const { data, error } = await db().from("week_summaries").select(COLS).eq("client_id", clientId).order("from_day", { ascending: false });
  if (error) { if (missing(error)) return null; throw error; }
  return (data as Parameters<typeof map>[0][]).map(map);
} });
export const useSentWeek = (id: string) => useQuery({ queryKey: ["week-sum", id], enabled: !!id, queryFn: async (): Promise<SentWeek | null> => {
  const { data, error } = await db().from("week_summaries").select(COLS).eq("id", id).maybeSingle(); if (error) throw error; return data ? map(data as Parameters<typeof map>[0]) : null;
} });
export function useSendWeek(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { n: number; from: string; note: string }) => {
      const { data, error } = await db().rpc("send_week_summary", { p_client: clientId, p_week: v.n, p_from: v.from, p_note: v.note.trim() || null }); if (error) throw error;
      void fetch("/api/push/week", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ summaryId: data }) }).catch(() => {});
      return data as string;
    },
    onSuccess: () => { toast("Resumen enviado. Le llega una notificación y lo ve en su app."); void qc.invalidateQueries({ queryKey: ["week-sums"] }); void qc.invalidateQueries({ queryKey: ["messages"] }); },
    onError: (e) => toast(/week_not_done/.test((e as Error).message ?? "") ? "Esa semana aún no termina." : /function|schema cache/i.test((e as Error).message ?? "") ? "Falta correr la migración 0053 en Supabase." : "No pudimos enviarlo. Inténtalo de nuevo.", true),
  });
}
export function useSeeWeek() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { await db().rpc("see_week_summary", { p_id: id }); }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["week-sums"] }); void qc.invalidateQueries({ queryKey: ["thread"] }); void qc.invalidateQueries({ queryKey: ["unread"] }); } });
}

// Resúmenes por enviar (22-nov): clientes activos cuya última semana ya terminó y Yeff aún no le envió el resumen. La semana es la
// del cliente (bloques de 7 días desde que empezó, lib/clientweek.ts). Va al panel como prioridad y a la campana.
export type PendingWeek = { clientId: string; name: string; n: number; from: string; to: string; completedOn: string };
export const usePendingWeekSums = (enabled = true) => useQuery({ queryKey: ["week-sums", "pending"], enabled, staleTime: 60_000, refetchInterval: 5 * 60_000, queryFn: async (): Promise<PendingWeek[]> => {
  const since = new Date(Date.now() - 21 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const [c, s] = await Promise.all([
    db().from("clients").select("id,status,activated_at,plan_since,created_at,profiles!inner(full_name,role)").eq("status", "active"),
    db().from("week_summaries").select("client_id,from_day").gte("from_day", since),
  ]);
  if (c.error) throw c.error;
  const sent = new Set(s.error ? [] : ((s.data ?? []) as { client_id: string; from_day: string }[]).map((x) => `${x.client_id}|${x.from_day}`));
  if (s.error && !missing(s.error)) throw s.error;
  if (s.error) return [];   // sin la 0053 no hay resúmenes
  type R = { id: string; activated_at: string | null; plan_since: string | null; created_at: string; profiles: { full_name: string; role: string } };
  const bog = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return ((c.data ?? []) as unknown as R[]).filter((r) => r.profiles?.role === "client").flatMap((r) => {
    const start = r.activated_at ? bog(r.activated_at) : r.plan_since ?? bog(r.created_at), w = clientWeeks(start);
    return w.last && !sent.has(`${r.id}|${w.last.from}`) ? [{ clientId: r.id, name: r.profiles.full_name || "Cliente", n: w.last.n, from: w.last.from, to: w.last.to, completedOn: w.last.completesOn }] : [];
  }).sort((a, b) => b.completedOn.localeCompare(a.completedOn) || a.name.localeCompare(b.name));
} });
