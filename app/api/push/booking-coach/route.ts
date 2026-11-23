import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Un cliente reservó o canceló una sesión → notificación a Yeff (0060). La pide el propio cliente justo después; la base solo
// devuelve los teléfonos del coach si la reserva es suya, el evento es de hace menos de 10 min y no se avisó ya.
export async function POST(req: NextRequest) {
  const { bookingId, kind } = (await req.json().catch(() => ({}))) as { bookingId?: string; kind?: string };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId) || (kind !== "booked" && kind !== "cancelled")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase.rpc("booking_coach_targets", { p_booking: bookingId, p_kind: kind });
  const rows = (data ?? []) as (Target & { client_name: string; starts_at: string; kind: string })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const r = rows[0], when = new Date(r.starts_at).toLocaleString("es", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  const what = r.kind === "initial" ? "Llamada inicial" : r.kind === "followup" ? "Seguimiento" : "Sesión";
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth: a }) => ({ endpoint, p256dh, auth: a })), kind === "booked"
    ? { title: `${r.client_name} reservó una sesión`, body: `${what} · ${when}.`, url: "/coach/agenda", tag: `bkc-${bookingId}` }
    : { title: `${r.client_name} canceló su sesión`, body: `${what} del ${when}. El horario quedó libre otra vez.`, url: "/coach/agenda", tag: `bkc-${bookingId}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
