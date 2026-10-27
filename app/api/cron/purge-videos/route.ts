import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, deleteVideo } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Lo llama el cron de Supabase cada hora con la cabecera x-cron-secret (migración 0033). Borra de Bunny, aunque Jeff no abra la app:
// los vídeos de reporte vencidos (32 h sin ver o 12 h después de verlos) y los vídeos huérfanos. La clave se valida DENTRO de la base de datos.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!bunnyConfigured()) return NextResponse.json({ ok: true, deleted: 0, note: "bunny_not_configured" });
  const db = createClient();
  const { data: due, error } = await db.rpc("due_report_videos_cron", { p_secret: secret });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  let deleted = 0, failed = 0;
  for (const v of (due ?? []) as { id: string; video_id: string }[]) {
    try { await deleteVideo(v.video_id); const { error: e2 } = await db.rpc("mark_video_deleted_cron", { p_secret: secret, p_id: v.id }); if (e2) failed++; else deleted++; } catch { failed++; }
  }
  const { data: orphans } = await db.rpc("due_orphan_videos_cron", { p_secret: secret });
  for (const o of (orphans ?? []) as { video_id: string }[]) {
    try { await deleteVideo(o.video_id); const { data: ok } = await db.rpc("discard_orphan_cron", { p_secret: secret, p_video: o.video_id }); if (ok) deleted++; } catch { failed++; }
  }
  return NextResponse.json({ ok: true, deleted, failed });
}
