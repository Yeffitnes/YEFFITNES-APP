import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
import { FEATURE_NAMES } from "@/lib/features";
export const dynamic = "force-dynamic";
// Un cliente activo pide una función que su plan no incluye (0058). La base de datos la anota (sale en el panel de Yeff como
// prioritaria) y, como mucho una vez cada 12 h por función, devuelve los teléfonos del coach para avisarle.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { feature } = (await req.json().catch(() => ({}))) as { feature?: string };
  if (!feature || !(feature in FEATURE_NAMES)) return NextResponse.json({ error: "bad_feature" }, { status: 400 });
  const { data, error } = await supabase.rpc("request_feature", { p_feature: feature });
  if (error) {
    const m = error.message ?? "";
    const code = /already_included/.test(m) ? "already_included" : /not_active/.test(m) ? "not_active" : /request_feature|function/.test(m) ? "not_ready" : "failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }
  const rows = (data ?? []) as (Target & { client_name: string })[];
  if (!rows.length || !pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth: a }) => ({ endpoint, p256dh, auth: a })), {
    title: "Solicitud de un cliente", body: `${rows[0].client_name} te pide ${FEATURE_NAMES[feature]}.`, url: "/coach#solicitudes", tag: `feature-${feature}`,
  });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
