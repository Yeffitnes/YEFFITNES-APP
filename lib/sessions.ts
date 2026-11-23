"use client";
// Sesiones de hoy y de mañana para el panel de Yeff (22-nov, noche: "que lo primero que le salga sea la agenda"). Cada sesión se
// queda en la tarjeta hasta que termina. "Recordarle" manda un aviso al cliente (0063, una vez al día por sesión).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { missingColumn } from "@/lib/fetchers";

export type SoonSession = { bookingId: string; startsAt: string; duration: number; kind: string; capacity: number; clientId: string; clientName: string; remindedToday: boolean; canRemind: boolean };
const bogota = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export const useSoonSessions = () => useQuery({ queryKey: ["coach-upcoming", "soon"], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<SoonSession[]> => {
  const now = new Date(), until = new Date(now.getTime() + 2 * 86_400_000), since = new Date(now.getTime() - 4 * 3600_000);
  const q = (extra: string) => db().from("bookings").select(`id,status,client_id${extra},clients(profiles(full_name)),availability_slots!inner(starts_at,duration_min,kind,capacity)`)
    .eq("status", "confirmed").gte("availability_slots.starts_at", since.toISOString()).lt("availability_slots.starts_at", until.toISOString()).limit(200);
  let { data, error } = await q(",coach_reminded_at"), can = true;
  if (error && missingColumn(error)) { ({ data, error } = await q("")); can = false; }   // base sin la 0063
  if (error) throw error;
  type Raw = { id: string; client_id: string; coach_reminded_at?: string | null; clients: { profiles: { full_name: string } | null } | null; availability_slots: { starts_at: string; duration_min: number; kind: string; capacity: number } };
  const today = bogota(now), tomorrow = bogota(new Date(now.getTime() + 86_400_000));
  return (data as unknown as Raw[])
    .filter((b) => { const s = b.availability_slots, end = new Date(s.starts_at).getTime() + s.duration_min * 60_000, day = bogota(s.starts_at); return end > now.getTime() && (day === today || day === tomorrow); })
    .map((b) => ({ bookingId: b.id, startsAt: b.availability_slots.starts_at, duration: b.availability_slots.duration_min, kind: b.availability_slots.kind, capacity: b.availability_slots.capacity,
      clientId: b.client_id, clientName: b.clients?.profiles?.full_name || "Cliente", remindedToday: !!b.coach_reminded_at && bogota(b.coach_reminded_at) === today, canRemind: can }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
} });

export function useRemindSession() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const r = await fetch("/api/push/session-remind", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId }) });
      if (!r.ok) throw new Error("failed"); return (await r.json()) as { sent: number; reason?: string };
    },
    onSuccess: (r) => toast(r.sent ? "Recordatorio enviado a su teléfono" : r.reason === "push_not_configured" ? "Los avisos no están configurados en este sitio." : "No tiene los avisos activos en su teléfono. Escríbele por Mensajes.", !r.sent),
    onError: () => toast("No pudimos enviar el recordatorio. Inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["coach-upcoming"] }),
  });
}
export const isToday = (iso: string) => bogota(iso) === bogota(new Date());
