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
  // Noche (0054): a quien le faltan hábitos por anotar hoy. Si también le falta el reporte, va en el MISMO aviso (no dos).
  const habitMiss = new Map<string, Target & { missing: string }>();
  if (kind === "night") {
    const hr = await createClient().rpc("due_habit_reminders_cron", { p_secret: secret });
    if (hr.error) console.error("due_habit_reminders_cron", hr.error.message);
    for (const r of (hr.data ?? []) as (Target & { missing: string })[]) habitMiss.set(r.endpoint, r);
    for (const r of rows) if (r.tag === "report" && habitMiss.has(r.endpoint)) { r.body = `Envía tu reporte y anota tus hábitos (te falta: ${habitMiss.get(r.endpoint)!.missing}).`; habitMiss.delete(r.endpoint); }
  }

  await Promise.all(rows.map(async (r) => { const dead = await sendPush([r], { title: r.title, body: r.body, url: r.url === "/inicio" && r.tag === "report" ? "/inicio#reporte" : r.url === "/inicio" && r.tag === "training" ? "/inicio#rutina" : r.url, tag: r.tag }); if (!dead.length) sent++; }));
  // Mañana: a Jeff le llegan los avisos de plan mensual (0048, 0051): 7, 2 y 1 día antes y el día que vence, una sola vez cada uno.
  // Si falla, no frena lo demás.
  let plans = 0;
  if (kind === "morning") {
    const exp = await createClient().rpc("due_plan_notices_cron", { p_secret: secret });
    if (exp.error) console.error("due_plan_notices_cron", exp.error.message);
    const list = (exp.data ?? []) as (Target & { stage: "d7" | "d2" | "d1" | "d0"; n: number; names: string })[];
    plans = Array.from(new Map(list.map((r) => [r.stage, r.n])).values()).reduce((a, b) => a + b, 0);
    const short = (t: string) => (t.length > 90 ? t.slice(0, 88) + "…" : t);
    await Promise.all(list.map((r) => sendPush([{ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }], r.stage === "d0"
      ? { title: r.n === 1 ? "Plan mensual vencido" : `${r.n} planes mensuales vencidos`, body: `${short(r.names)}: ya cumplió 30 días. Decide si lo renuevas o lo cancelas.`, url: "/coach#planes", tag: "plan-d0" }
      : r.stage === "d1" ? { title: r.n === 1 ? "Plan vence mañana" : `${r.n} planes vencen mañana`, body: `${short(r.names)}. Mañana decides si lo renuevas.`, url: "/coach#planes", tag: "plan-d1" }
      : { title: r.n === 1 ? "Plan por vencer" : `${r.n} planes por vencer`, body: `${short(r.names)}.`, url: "/coach#planes", tag: `plan-${r.stage}` },
    ).catch(() => [])));
  }
  let habits = 0;
  if (habitMiss.size) await Promise.all(Array.from(habitMiss.values()).map(async (r) => { const dead = await sendPush([r], { title: "¿Ya anotaste tus hábitos de hoy?", body: `Te falta: ${r.missing}. Un minuto antes de dormir.`, url: "/inicio#habitos", tag: "habits" }).catch(() => []); if (!dead.length) habits++; }));
  // Mañana (0054): a Jeff, quién quedó por debajo de su meta ayer o no anotó.
  if (kind === "morning") {
    const dg = await createClient().rpc("due_habit_digest_cron", { p_secret: secret });
    if (dg.error) console.error("due_habit_digest_cron", dg.error.message);
    const list = (dg.data ?? []) as (Target & { n: number; body: string })[];
    await Promise.all(list.map((r) => sendPush([r], { title: r.n === 1 ? "Hábitos de ayer: 1 cliente por debajo" : `Hábitos de ayer: ${r.n} clientes por debajo`, body: r.body.length > 140 ? r.body.slice(0, 138) + "…" : r.body, url: "/coach/habitos", tag: "habits-coach" }).catch(() => [])));
    habits += list.length ? 1 : 0;
  }
  // Mañana (0062): a Yeff, los clientes que completaron su semana y aún no tienen su resumen enviado.
  let weeks = 0;
  if (kind === "morning") {
    const ws = await createClient().rpc("due_week_summary_cron", { p_secret: secret });
    if (ws.error) console.error("due_week_summary_cron", ws.error.message);
    const list = (ws.data ?? []) as (Target & { n: number; body: string })[];
    await Promise.all(list.map((r) => sendPush([{ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }], { title: r.n === 1 ? "1 resumen de semana por enviar" : `${r.n} resúmenes de semana por enviar`, body: `Completaron su semana: ${r.body.length > 120 ? r.body.slice(0, 118) + "…" : r.body}. Revísalos y envíalos.`, url: "/coach#resumenes", tag: "week-sum" }).catch(() => [])));
    weeks = list.length ? 1 : 0;
  }
  return NextResponse.json({ ok: true, due: rows.length, sent, plans, habits, weeks });
}
