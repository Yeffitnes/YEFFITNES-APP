import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Jeff respondió (texto o audio) a un entrenamiento → notificación al cliente que lo lleva a Hoy, donde ve la respuesta (0038).
// La base solo devuelve dispositivos si quien llama es el coach del espacio, la respuesta es de hace menos de 10 min y no se avisó ya.
export async function POST(req: NextRequest) {
  const { logId } = (await req.json().catch(() => ({}))) as { logId?: string };
  if (!logId || !/^[0-9a-f-]{36}$/i.test(logId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("feedback_targets", { p_log: logId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { day_name: string; log_date: string })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const day = new Date(`${rows[0].log_date}T12:00:00Z`).toLocaleDateString("es", { weekday: "long", day: "numeric", timeZone: "UTC" });
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), {
    title: "Jeff respondió a tu entrenamiento", body: `${rows[0].day_name} · ${day}. Ábrelo en la app.`, url: "/inicio#respuestas", tag: `fb-${logId}`,
  });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
