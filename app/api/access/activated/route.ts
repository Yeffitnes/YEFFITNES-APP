import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Jeff acaba de activar a un cliente: le llega "Tu plan está activo". Solo el coach de ese espacio, una vez, en los 10 min siguientes (lo valida activation_targets).
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const { clientId } = (await req.json().catch(() => ({}))) as { clientId?: string };
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase.rpc("activation_targets", { p_client: clientId });
  const targets = (data ?? []) as Target[];
  if (!targets.length) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(targets, { title: "Tu plan está activo", body: "Tu coach activó tu cuenta. Entra para conocer la app y empezar.", url: "/inicio", tag: "activated" });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: targets.length - dead.length });
}
