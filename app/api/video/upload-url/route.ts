import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, createVideo, deleteVideo, uploadAuth } from "@/lib/bunny";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
// Permiso para subir UN vídeo a Bunny. purpose "report" (reporte diario del cliente), "message" (vídeo en un mensaje: cliente activo o coach)
// o "material" (vídeo privado de Material: solo el coach; 0035).
// La base de datos decide quién puede; aquí solo se crea el vídeo y se registra a quién pertenece.
export async function POST(req: NextRequest) {
  if (!bunnyConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { purpose?: string; clientId?: string };
  const purpose = body.purpose === "message" ? "message" : body.purpose === "material" ? "material" : "report";
  if (body.clientId && !UUID.test(body.clientId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (purpose === "report") { const { data: ok } = await supabase.rpc("can_report"); if (!ok) return NextResponse.json({ error: "not_allowed" }, { status: 403 }); }
  let videoId: string;
  try { videoId = await createVideo(`${purpose === "report" ? "reporte" : purpose === "material" ? "material" : "mensaje"}-${auth.user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`); }
  catch { return NextResponse.json({ error: "video_service_unavailable" }, { status: 502 }); }
  const { error } = purpose === "report"
    ? await supabase.rpc("register_video_upload", { p_video_id: videoId })
    : purpose === "material"
      ? await supabase.rpc("register_material_video", { p_video_id: videoId })
      : await supabase.rpc("register_message_video", { p_video_id: videoId, p_client: body.clientId ?? null });
  if (error) { await deleteVideo(videoId).catch(() => {}); const many = error.message.includes("too_many"); return NextResponse.json({ error: many ? "too_many" : "not_allowed" }, { status: many ? 429 : 403 }); }
  return NextResponse.json(uploadAuth(videoId));
}
