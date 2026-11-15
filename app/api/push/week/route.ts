import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Jeff envió el resumen de la semana (0053): avisa al cliente y lo lleva directo al resumen. Usa el mensaje que deja el envío
// (push_targets valida que lo pida Jeff, una sola vez por mensaje).
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const { summaryId } = (await req.json().catch(() => ({}))) as { summaryId?: string };
  if (!summaryId || !/^[0-9a-f-]{36}$/i.test(summaryId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: s } = await supabase.from("week_summaries").select("message_id,week_n").eq("id", summaryId).maybeSingle();
  if (!s?.message_id) return NextResponse.json({ ok: true, sent: 0 });
  const { data: targets } = await supabase.rpc("push_targets", { p_message: s.message_id });
  if (!targets?.length) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(targets as Target[], { title: "Tu resumen de la semana", body: `Jeff te envió el resumen de tu semana ${s.week_n}: lo que lograste y cómo vas frente a la anterior.`, url: `/inicio/resumen/${summaryId}`, tag: `week-${summaryId}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: (targets as Target[]).length - dead.length });
}
