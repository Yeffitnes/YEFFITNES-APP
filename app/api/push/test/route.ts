import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { failReason, keyTag, pushConfigured, sendPushReport, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// "Probar avisos" (2-nov): envía una notificación de prueba a los teléfonos de la cuenta con sesión y dice qué pasó con cada uno.
// Sirve para saber, sin entrar a ningún panel, si este sitio tiene las claves, si la cuenta tiene teléfonos y si llegan.
export async function POST() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ configured: false, key: keyTag(), devices: 0, sent: 0 });
  const { data } = await supabase.rpc("my_push_devices");
  const list = (data ?? []) as Target[];
  if (!list.length) return NextResponse.json({ configured: true, key: keyTag(), devices: 0, sent: 0 });
  const r = await sendPushReport(list, { title: "Prueba de avisos", body: "Si ves esto, los avisos llegan a este teléfono.", url: "/", tag: "push-test" });
  if (r.dead.length) await supabase.rpc("prune_push", { p_endpoints: r.dead });
  return NextResponse.json({ configured: true, key: keyTag(), devices: list.length, sent: r.ok, reason: r.ok === list.length ? null : failReason(r.codes) });
}
