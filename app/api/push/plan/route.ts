import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPushReport, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
const TXT = {
  training: { title: "Tu coach actualizó tu entrenamiento", body: "Hay cambios en tu rutina. Entra para verlos.", url: "/inicio/plan", tag: "plan-training" },
  nutrition: { title: "Tu coach actualizó tu nutrición", body: "Hay cambios en tu plan de nutrición. Entra para verlos.", url: "/inicio#nutricion", tag: "plan-nutrition" },
};
// Jeff cambió el plan de un cliente (0047). La base decide si toca avisar (solo el coach, cliente activo, máx. 1 cada 30 min por tipo).
export async function POST(req: NextRequest) {
  const { clientId, kind } = (await req.json().catch(() => ({}))) as { clientId?: string; kind?: "training" | "nutrition" };
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId) || (kind !== "training" && kind !== "nutrition")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const supabase = createClient();
  const { data, error } = await supabase.rpc("plan_change_targets", { p_client: clientId, p_kind: kind });
  if (error || !data?.length) return NextResponse.json({ ok: true, sent: 0 });
  const r = await sendPushReport(data as Target[], TXT[kind]);
  if (r.dead.length) await supabase.rpc("prune_push", { p_endpoints: r.dead });
  return NextResponse.json({ ok: true, sent: r.ok });
}
