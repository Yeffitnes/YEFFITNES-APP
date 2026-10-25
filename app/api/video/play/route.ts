import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, embedUrl } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Solo el coach del espacio obtiene un enlace temporal para ver el vídeo de un reporte.
export async function GET(req: NextRequest) {
  if (!bunnyConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("report") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: role } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (role?.role !== "coach") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await supabase.from("daily_reports").select("video_id,video_state").eq("id", id).maybeSingle();   // RLS: solo reportes de su espacio
  if (!data?.video_id || data.video_state !== "uploaded") return NextResponse.json({ error: "no_video" }, { status: 404 });
  return NextResponse.json({ url: embedUrl(data.video_id) });
}
