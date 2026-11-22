import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
// Eliminar un cliente por completo (22-nov, pedido de Yeff; 0059). Solo el coach de su espacio (lo revisa delete_client en la base).
// Primero sus fotos de progreso (Storage no se borra en cadena), después la cuenta: con ella se va todo lo suyo. Sus vídeos de Bunny
// quedan en la basura y se borran solos la próxima vez que Yeff abre Mensajes.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req: Request) {
  const sb = createClient();
  const { data: au } = await sb.auth.getUser();
  if (!au.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { clientId } = (await req.json().catch(() => ({}))) as { clientId?: string };
  if (!clientId || !UUID.test(clientId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { data: me } = await sb.from("profiles").select("role,workspace_id").eq("id", au.user.id).maybeSingle();
  if (me?.role !== "coach") return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  let photos = 0;
  try {   // si Storage falla, se sigue: las fotos quedarían huérfanas pero la cuenta se borra igual (se dice en la respuesta)
    const { data: rows } = await sb.from("progress_photos").select("storage_path").eq("client_id", clientId);
    const paths = (rows ?? []).map((r: { storage_path: string }) => r.storage_path).filter((x) => x.startsWith(`${me.workspace_id}/${clientId}/`));
    if (paths.length) { const { data: gone } = await sb.storage.from("progress-photos").remove(paths); photos = gone?.length ?? 0; }
  } catch { photos = -1; }
  const { data, error } = await sb.rpc("delete_client", { p_client: clientId });
  if (error) {
    const m = error.message ?? "", code = /not_found/.test(m) ? "not_found" : /not_allowed|not_a_client/.test(m) ? "not_allowed" : /delete_client|function/.test(m) ? "not_ready" : "failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(data as object), photos });
}
