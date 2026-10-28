import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
import { NUDGE_TXT, type NudgeKind } from "@/lib/nudges";
const NUDGE_URL: Record<NudgeKind, string> = { nothing: "/inicio", report: "/inicio#reporte", train: "/inicio#rutina", meals: "/inicio#nutricion" };
export const dynamic = "force-dynamic";
// Notificación del teléfono para un aviso YA guardado por send_nudge (migración 0037). Si esto falla, el aviso igual queda en la app del cliente.
export async function POST(req: NextRequest) {
  const { nudgeId } = (await req.json().catch(() => ({}))) as { nudgeId?: string };
  if (!nudgeId || !/^[0-9a-f-]{36}$/i.test(nudgeId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("nudge_push_targets", { p_nudge: nudgeId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { kind: NudgeKind })[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), { ...NUDGE_TXT[rows[0].kind], url: NUDGE_URL[rows[0].kind], tag: `nudge-${rows[0].kind}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
