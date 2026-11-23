import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Yeff agendó a un cliente → notificación al cliente (0063). La pide el coach justo después; la base solo devuelve los teléfonos
// del cliente si quien llama es el coach del espacio, la reserva la hizo él hace menos de 10 min y no se avisó ya.
export async function POST(req: NextRequest) {
  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("booking_client_targets", { p_booking: bookingId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { starts_at: string; kind: string })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const r = rows[0], when = new Date(r.starts_at).toLocaleString("es", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  const what = r.kind === "initial" ? "Llamada inicial" : r.kind === "followup" ? "Seguimiento" : "Sesión";
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), { title: "Yeff te agendó una sesión", body: `${what} · ${when}. Agrégala a tu calendario desde Agenda.`, url: "/inicio/agenda", tag: `bkcl-${bookingId}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
