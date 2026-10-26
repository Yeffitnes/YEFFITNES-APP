import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
// Se llama justo después de enviar un mensaje. Solo el remitente puede pedirlo, una sola vez por mensaje (lo valida push_targets en la base de datos).
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const { messageId } = (await req.json().catch(() => ({}))) as { messageId?: string };
  if (!messageId || !/^[0-9a-f-]{36}$/i.test(messageId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: m } = await supabase.from("messages").select("sender,body,image_path,audio_path,video_id,youtube_id,client_id").eq("id", messageId).maybeSingle();
  if (!m) return NextResponse.json({ ok: true, sent: 0 });
  const { data: targets } = await supabase.rpc("push_targets", { p_message: messageId });
  if (!targets?.length) return NextResponse.json({ ok: true, sent: 0 });
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle();
  const preview = m.body ? (m.body.length > 110 ? m.body.slice(0, 107) + "…" : m.body) : m.audio_path ? "Te envió un audio" : m.video_id || m.youtube_id ? "Te envió un vídeo" : "Te envió una foto";
  const fromCoach = m.sender === "coach";
  const dead = await sendPush(targets as Target[], {
    title: fromCoach ? "Mensaje de tu coach" : `${me?.full_name || "Un cliente"} te escribió`, body: preview,
    url: fromCoach ? "/inicio/mensajes" : `/coach/mensajes?c=${m.client_id}`, tag: `msg-${m.client_id}`,
  });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: (targets as Target[]).length - dead.length });
}
