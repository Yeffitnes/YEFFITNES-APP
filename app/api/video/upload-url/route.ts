import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, createVideo, deleteVideo, uploadAuth } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// El cliente pide permiso para subir UN vídeo. Solo clientes activos con reporte diario en su plan (lo valida la base de datos).
export async function POST() {
  if (!bunnyConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: ok } = await supabase.rpc("can_report");
  if (!ok) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  let videoId: string;
  try { videoId = await createVideo(`reporte-${auth.user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`); }
  catch { return NextResponse.json({ error: "video_service_unavailable" }, { status: 502 }); }
  const { error } = await supabase.rpc("register_video_upload", { p_video_id: videoId });
  if (error) { await deleteVideo(videoId).catch(() => {}); return NextResponse.json({ error: error.message.includes("too_many") ? "too_many" : "not_allowed" }, { status: error.message.includes("too_many") ? 429 : 403 }); }
  return NextResponse.json(uploadAuth(videoId));
}
