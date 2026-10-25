import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
// Guarda (o quita) la suscripción push de ESTE dispositivo para la cuenta con sesión.
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; remove?: boolean } | null;
  if (!b?.endpoint || !/^https:\/\//.test(b.endpoint) || b.endpoint.length > 1000) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (b.remove) { await supabase.from("push_subscriptions").delete().eq("endpoint", b.endpoint); return NextResponse.json({ ok: true }); }
  if (!b.keys?.p256dh || !b.keys?.auth) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: b.endpoint, p_p256dh: b.keys.p256dh, p_auth: b.keys.auth });
  return error ? NextResponse.json({ error: "not_allowed" }, { status: 403 }) : NextResponse.json({ ok: true });
}
