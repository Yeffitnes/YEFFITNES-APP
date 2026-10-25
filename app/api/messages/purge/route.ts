import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured, deleteVideo } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Borra de Bunny los vídeos de mensajes ya borrados (se anotan en message_trash). Se ejecuta con la sesión del coach al abrir Mensajes.
export async function POST() {
  if (!bunnyConfigured()) return NextResponse.json({ deleted: 0 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("due_message_trash");      // vacío si no es coach
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  const done: string[] = [];
  for (const t of ((data ?? []) as { id: string; kind: string; ref: string }[]).filter((x) => x.kind === "video")) {
    try { await deleteVideo(t.ref); done.push(t.id); } catch { /* se reintenta la próxima vez */ }
  }
  if (done.length) await supabase.rpc("clear_message_trash", { p_ids: done });
  return NextResponse.json({ deleted: done.length });
}
