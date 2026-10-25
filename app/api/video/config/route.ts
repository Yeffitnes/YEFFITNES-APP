import { NextResponse } from "next/server";
import { bunnyConfigured } from "@/lib/bunny";
export const dynamic = "force-dynamic";
// Dice si la subida de vídeo está configurada (no revela ninguna clave).
export const GET = () => NextResponse.json({ enabled: bunnyConfigured() });
