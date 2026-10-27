import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, deleteVideo } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Borra de Bunny los vídeos vencidos (24 h tras verlos, 7 días máx.). Se ejecuta con la sesión del coach al abrir "Reportes".
export async function POST() {
  if (!bunnyConfigured()) return NextResponse.json({ deleted: 0 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: due, error } = await supabase.rpc("due_report_videos");   // vacío si no es coach
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  let deleted = 0;
  for (const v of (due ?? []) as { id: string; video_id: string }[]) {
    try { await deleteVideo(v.video_id); const { error: e2 } = await supabase.rpc("mark_video_deleted", { p_id: v.id }); if (!e2) deleted++; } catch { /* se reintenta la próxima vez */ }
  }
  // Vídeos huérfanos (subidos hace más de 30 min y nunca usados): fuera de Bunny y del registro.
  const { data: orphans } = await supabase.rpc("due_orphan_videos");
  for (const o of (orphans ?? []) as { video_id: string }[]) {
    try { await deleteVideo(o.video_id); const { data: ok } = await supabase.rpc("discard_video_upload", { p_video: o.video_id }); if (ok) deleted++; } catch { /* se reintenta */ }
  }
  return NextResponse.json({ deleted });
}
