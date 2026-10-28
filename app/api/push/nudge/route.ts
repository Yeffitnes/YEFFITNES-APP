import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Aviso rápido de Jeff desde "Seguimiento de hoy" (migración 0036): un toque y al cliente le llega un aviso según lo que le falta.
// La base de datos valida que sea el coach de ese cliente y que no se repita el mismo aviso el mismo día.
const TXT: Record<string, { title: string; body: string }> = {
  nothing: { title: "Jeff te está esperando", body: "Hoy aún no registras nada. Entra, entrena, marca tu nutrición y envía tu reporte." },
  train: { title: "Tu entrenamiento de hoy", body: "Jeff está esperando tu entrenamiento de hoy. Cuando termines, regístralo en la app." },
  meals: { title: "Tu nutrición de hoy", body: "Jeff está esperando tu nutrición de hoy. Marca tus comidas en la app." },
  report: { title: "Tu reporte de hoy", body: "Jeff está esperando tu reporte de hoy: un vídeo corto y un comentario." },
};
export async function POST(req: NextRequest) {
  const { clientId, kind } = (await req.json().catch(() => ({}))) as { clientId?: string; kind?: string };
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId) || !kind || !TXT[kind]) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("nudge_targets", { p_client: clientId, p_kind: kind });
  if (error) return NextResponse.json({ error: /already_sent/.test(error.message) ? "already_sent" : "not_allowed" }, { status: 400 });
  const targets = (data ?? []) as Target[];
  if (!targets.length || !pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const dead = await sendPush(targets, { ...TXT[kind], url: "/inicio", tag: `nudge-${kind}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: targets.length - dead.length });
}
