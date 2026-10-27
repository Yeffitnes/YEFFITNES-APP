import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// El cliente PENDIENTE pide acceso (migración 0034). La base de datos anota la solicitud y, como mucho una vez cada 12 h,
// devuelve los dispositivos del coach para avisarle. Aunque no haya push configurado, la solicitud queda anotada y Jeff la ve en Clientes.
export async function POST() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("request_access");
  if (error) return NextResponse.json({ error: /not_pending/.test(error.message) ? "not_pending" : "failed" }, { status: 400 });
  const rows = (data ?? []) as (Target & { client_name: string })[];
  if (!rows.length || !pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(rows.map(({ endpoint, p256dh, auth: a }) => ({ endpoint, p256dh, auth: a })), {
    title: "Solicitud de acceso", body: `${rows[0].client_name} creó su cuenta y te pide activar su plan.`, url: "/coach/clientes", tag: "access-request",
  });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: rows.length - dead.length });
}
