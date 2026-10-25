import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Se llama justo después de que el cliente termina su entrenamiento o su nutrición del día. Solo el propio cliente puede pedirlo, una vez por evento
// (lo valida push_event_targets en la base de datos) y los destinatarios son los dispositivos del coach de su espacio de trabajo.
type Row = Target & { kind: "training_done" | "nutrition_done" | "day_done"; client_name: string };
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const { date } = (await req.json().catch(() => ({}))) as { date?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase.rpc("push_event_targets", { p_date: date });
  const rows = (data ?? []) as Row[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const kinds = new Set(rows.map((r) => r.kind)), name = rows[0].client_name;
  const body = kinds.has("day_done") ? `${name} completó su día: entrenamiento y nutrición.` : kinds.has("training_done") ? `${name} completó su entrenamiento de hoy.` : `${name} completó su plan de nutrición de hoy.`;
  const byEndpoint: Record<string, Target> = {}; rows.forEach((r) => { byEndpoint[r.endpoint] = { endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }; });
  const targets = Object.values(byEndpoint);
  const dead = await sendPush(targets, { title: kinds.has("day_done") ? "Día completado" : "Cliente al día", body, url: "/coach", tag: `act-${name}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: targets.length - dead.length });
}
