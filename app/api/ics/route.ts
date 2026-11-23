import { NextResponse, type NextRequest } from "next/server";
import { icsText } from "@/lib/ics";
export const dynamic = "force-dynamic";
// Archivo de calendario servido de verdad (22-nov, noche): en iPhone, abrir un .ics con tipo text/calendar muestra directo
// "Agregar al calendario" (un enlace data: con descarga no siempre lo hace en la app instalada). Solo lleva hora, duración y tipo:
// ningún dato personal.
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams, start = p.get("s") ?? "", dur = Number(p.get("d") ?? "30"), kind = (p.get("k") ?? "").slice(0, 20), who = p.get("w") === "coach" ? "coach" : "client", name = (p.get("n") ?? "").slice(0, 60);
  if (Number.isNaN(Date.parse(start)) || !(dur > 0 && dur <= 600)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return new NextResponse(icsText({ startsAt: start, duration: dur, kind }, who, name), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="sesion-yeffitness.ics"', "cache-control": "no-store" } });
}
