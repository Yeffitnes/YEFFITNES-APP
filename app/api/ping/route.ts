import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// "Mantener despierta": una tarea programada de Supabase llama aquí cada 5 minutos de 5 a. m. a medianoche (Colombia)
// para que el servidor no se apague y la primera apertura de la app no espere a que arranque (en Netlify eso eran ~3 s o más).
// No toca la base ni hace nada más: cuesta lo mínimo. SQL para programarla en docs/PASO_A_PRODUCCION.md.
export const GET = () => NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
