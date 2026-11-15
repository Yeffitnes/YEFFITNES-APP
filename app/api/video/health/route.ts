import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bunnyConfigured } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Diagnóstico de vídeos (15-nov): ¿Bunny acepta la clave y la biblioteca de ESTE sitio? Solo para el coach. No crea nada ni muestra
// claves: lee la biblioteca y dice qué respondió Bunny. Abrir /api/video/health con la sesión de Jeff.
export async function GET() {
  const supabase = createClient(), { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: role } = await supabase.rpc("my_role"); if (role !== "coach") return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  if (!bunnyConfigured()) return NextResponse.json({ ok: false, motivo: "Faltan las variables BUNNY_* en este sitio." });
  const lib = process.env.BUNNY_LIBRARY_ID!, t0 = Date.now();
  try {
    const r = await fetch(`https://video.bunnycdn.com/library/${lib}/videos?page=1&itemsPerPage=1`, { headers: { AccessKey: process.env.BUNNY_API_KEY!, accept: "application/json" }, cache: "no-store" });
    const txt = (await r.text()).slice(0, 200);
    const motivo = r.ok ? "Bunny acepta la clave: los vídeos deberían funcionar." : r.status === 401 ? "Bunny rechaza la clave (401): la clave de la biblioteca en este sitio no es la correcta o se cambió en Bunny."
      : r.status === 403 ? "Bunny niega el acceso (403): revisa el saldo y el estado de la cuenta en Bunny." : r.status === 404 ? "Bunny no encuentra la biblioteca (404): el número de biblioteca en este sitio no es el correcto."
      : `Bunny respondió ${r.status}.`;
    return NextResponse.json({ ok: r.ok, estado: r.status, motivo, ms: Date.now() - t0, biblioteca: lib, respuesta: r.ok ? undefined : txt });
  } catch (e) { return NextResponse.json({ ok: false, motivo: "No se pudo conectar con Bunny desde el servidor.", detalle: String(e).slice(0, 160) }); }
}
