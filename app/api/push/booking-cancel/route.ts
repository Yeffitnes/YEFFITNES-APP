import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPushReport, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Jeff canceló la sesión de un cliente → notificación al cliente con la fecha (y el motivo, si Jeff lo escribió) que lo lleva a Agenda (0038).
// La base solo devuelve dispositivos si quien llama es el coach del espacio, la cancelación la hizo el coach hace menos de 10 min y no se avisó ya.
export async function POST(req: NextRequest) {
  const { bookingId, reason } = (await req.json().catch(() => ({}))) as { bookingId?: string; reason?: string };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("booking_cancel_targets", { p_booking: bookingId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { starts_at: string; reason?: string | null })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const when = new Date(rows[0].starts_at).toLocaleString("es", { weekday: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  // El motivo sale de la base (0041: bookings.cancel_reason); el del cuerpo de la petición queda solo para el código viejo.
  const why = (rows[0].reason ?? reason ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const r = await sendPushReport(rows.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), {
    title: "Jeff canceló tu sesión", body: `Era el ${when}.${why ? ` ${why}` : ""} Reserva otro horario en Agenda.`, url: "/inicio/agenda", tag: `bk-${bookingId}`,
  });
  if (r.dead.length) await supabase.rpc("prune_push", { p_endpoints: r.dead });
  return NextResponse.json({ ok: true, sent: r.ok, failed: r.failed });
}
