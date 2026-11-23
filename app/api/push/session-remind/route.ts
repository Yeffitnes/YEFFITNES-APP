import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPushReport, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// "Recordarle" en la tarjeta de sesiones del panel de Yeff (0063): aviso al cliente con la hora de su sesión. La base decide si
// toca (coach del espacio, sesión confirmada que no ha empezado, una vez al día) y devuelve los teléfonos del cliente.
export async function POST(req: NextRequest) {
  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("session_remind_targets", { p_booking: bookingId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { starts_at: string; kind: string })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0, reason: "already_or_none" });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0, reason: "push_not_configured" });
  const r = rows[0], st = new Date(r.starts_at), today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }), day = st.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const tmr = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const hour = st.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }).replace(/\s?a\.?\s?m\.?/i, " a. m.").replace(/\s?p\.?\s?m\.?/i, " p. m.");
  const when = day === today ? `hoy a las ${hour}` : day === tmr ? `mañana a las ${hour}` : `el ${st.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short", timeZone: "America/Bogota" })} a las ${hour}`;
  const what = r.kind === "initial" ? "tu llamada inicial" : r.kind === "followup" ? "tu sesión de seguimiento" : "tu sesión";
  const out = await sendPushReport(rows.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), { title: "Yeff te recuerda tu sesión", body: `Te espero ${when} para ${what}.`, url: "/inicio/agenda", tag: `rem-${bookingId}` });
  if (out.dead.length) await supabase.rpc("prune_push", { p_endpoints: out.dead });
  return NextResponse.json({ ok: true, sent: out.ok, failed: out.failed });
}
