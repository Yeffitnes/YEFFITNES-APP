import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
export const dynamic = "force-dynamic";
type Row = Target & { title: string; body: string; url: string; tag: string };
// Lo llama el cron de Supabase a horas fijas (?kind=morning|midday|night|session) con la cabecera x-cron-secret. La clave se valida DENTRO de la base de datos (due_reminders),
// que además marca cada aviso como enviado para no repetirlo. Sin clave válida no devuelve nada.
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0, note: "push_not_configured" });
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  if (!["morning", "midday", "night", "session"].includes(kind)) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  const { data, error } = await createClient().rpc("due_reminders", { p_secret: secret, p_kind: kind });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  const rows = (data ?? []) as Row[]; let sent = 0;
  await Promise.all(rows.map(async (r) => { const dead = await sendPush([r], { title: r.title, body: r.body, url: r.url === "/inicio" && r.tag === "report" ? "/inicio#reporte" : r.url === "/inicio" && r.tag === "training" ? "/inicio#rutina" : r.url, tag: r.tag }); if (!dead.length) sent++; }));
  // Mañana: a Jeff le llega UNA notificación por cada plan mensual que acaba de vencer (0038). Si falla, no frena lo demás.
  let plans = 0;
  if (kind === "morning") {
    const exp = await createClient().rpc("due_plan_expiry_cron", { p_secret: secret });
    const list = (exp.data ?? []) as (Target & { n: number; names: string })[];
    plans = list[0]?.n ?? 0;
    await Promise.all(list.map((r) => sendPush([{ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }], {
      title: r.n === 1 ? "Plan mensual vencido" : `${r.n} planes mensuales vencidos`,
      body: `${r.names.length > 90 ? r.names.slice(0, 88) + "…" : r.names}: ya cumplieron 30 días. Renueva o quita el plan.`, url: "/coach#planes", tag: "plan-expiry",
    }).catch(() => [])));
  }
  return NextResponse.json({ ok: true, due: rows.length, sent, plans });
}
