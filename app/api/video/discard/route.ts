import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, deleteVideo } from "@/lib/bunny";
export const dynamic = "force-dynamic";
const ID = /^[0-9a-f-]{20,64}$/i;
// Descarta un vídeo que se subió pero no se usó (la subida falló o se cambió de vídeo): lo borra de Bunny y libera el cupo del día.
// La base decide si es de quien lo pide y si no está en uso; solo entonces se borra en Bunny.
export async function POST(req: NextRequest) {
  const { videoId } = (await req.json().catch(() => ({}))) as { videoId?: string };
  if (!videoId || !ID.test(videoId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: ok, error } = await supabase.rpc("discard_video_upload", { p_video: videoId });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  if (ok && bunnyConfigured()) await deleteVideo(videoId).catch(() => {});
  return NextResponse.json({ discarded: !!ok });
}
