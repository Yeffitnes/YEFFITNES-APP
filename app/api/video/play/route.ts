import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, embedUrl } from "@/lib/bunny";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
// Enlace temporal de reproducción. ?report=<id>: solo el coach. ?message=<id> / ?day=<id>: quien pertenece al hilo (cliente dueño o coach del espacio).
// La autorización la hace la base de datos (RLS): si no ve la fila, no hay vídeo.
export async function GET(req: NextRequest) {
  if (!bunnyConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const report = req.nextUrl.searchParams.get("report") ?? "", message = req.nextUrl.searchParams.get("message") ?? "", day = req.nextUrl.searchParams.get("day") ?? "", material = req.nextUrl.searchParams.get("material") ?? "";
  if (!UUID.test(report || message || day || material)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (material) {   // vídeo privado de Material (0035): la base de datos decide si su plan lo incluye
    const { data } = await supabase.rpc("material_video", { p_id: material });
    if (!data) return NextResponse.json({ error: "no_video" }, { status: 404 });
    return NextResponse.json({ url: embedUrl(data as string) });
  }
  if (day) {   // vídeo personalizado de un día del plan: lo ve su cliente (con el plan que incluya entrenamiento) o el coach
    const { data } = await supabase.from("plan_days").select("video_id").eq("id", day).maybeSingle();
    if (!data?.video_id) return NextResponse.json({ error: "no_video" }, { status: 404 });
    return NextResponse.json({ url: embedUrl(data.video_id) });
  }
  if (message) {
    const { data } = await supabase.from("messages").select("video_id").eq("id", message).maybeSingle();
    if (!data?.video_id) return NextResponse.json({ error: "no_video" }, { status: 404 });
    return NextResponse.json({ url: embedUrl(data.video_id) });
  }
  const { data: role } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (role?.role !== "coach") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await supabase.from("daily_reports").select("video_id,video_state").eq("id", report).maybeSingle();
  if (!data?.video_id || data.video_state !== "uploaded") return NextResponse.json({ error: "no_video" }, { status: 404 });
  return NextResponse.json({ url: embedUrl(data.video_id) });
}
