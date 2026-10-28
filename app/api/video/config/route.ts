import { NextResponse } from "next/server";
import { bunnyConfigured } from "@/lib/bunny";
// Dice si la subida de vídeo está configurada (no revela ninguna clave).
// Fija al publicar (sale del CDN, no despierta al servidor): si cambian las claves de Bunny, hay que volver a publicar.
export const dynamic = "force-static";
export const GET = () => NextResponse.json({ enabled: bunnyConfigured() });
