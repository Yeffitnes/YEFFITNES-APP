import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, type Target } from "@/lib/push";
import { workoutAdvice } from "@/lib/progression";
export const dynamic = "force-dynamic";
// Se llama justo después de que el cliente termina su entrenamiento o su nutrición del día. Solo el propio cliente puede pedirlo, una vez por evento
// (lo valida push_event_targets en la base de datos) y los destinatarios son los dispositivos del coach de su espacio de trabajo.
type Row = Target & { kind: "training_done" | "nutrition_done" | "day_done"; client_name: string };
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ok: true, sent: 0 });
  const { date } = (await req.json().catch(() => ({}))) as { date?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase.rpc("push_event_targets", { p_date: date });
  const rows = (data ?? []) as Row[];
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });
  const kinds = new Set(rows.map((r) => r.kind)), name = rows[0].client_name;
  let body = kinds.has("day_done") ? `${name} completó su día: entrenamiento y nutrición.` : kinds.has("training_done") ? `${name} completó su entrenamiento de hoy.` : `${name} completó su plan de nutrición de hoy.`;
  let title = kinds.has("day_done") ? "Día completado" : "Cliente al día";
  // Sugerencia de peso (pedido de Cristian, 29-oct): si en algún ejercicio hizo más o menos repeticiones de las pedidas, Jeff lo sabe al instante.
  if (kinds.has("training_done") || kinds.has("day_done")) {
    const tip = await adviceText(supabase, date).catch(() => null);
    if (tip) { title = `Sugerencia de peso: ${name}`; body = `${body} ${tip}`; }
  }
  const byEndpoint: Record<string, Target> = {}; rows.forEach((r) => { byEndpoint[r.endpoint] = { endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }; });
  const targets = Object.values(byEndpoint);
  const dead = await sendPush(targets, { title, body: body.slice(0, 230), url: "/coach#ajustes", tag: `act-${name}` });
  if (dead.length) await supabase.rpc("prune_push", { p_endpoints: dead });
  return NextResponse.json({ ok: true, sent: targets.length - dead.length });
}

// Lee el entrenamiento de ese día CON LA SESIÓN DEL CLIENTE (la base solo le deja ver lo suyo) y arma la sugerencia en una frase.
async function adviceText(supabase: ReturnType<typeof createClient>, date: string): Promise<string | null> {
  const { data: log } = await supabase.from("workout_logs").select("effort,set_logs(plan_item_id,reps,weight,kind)").eq("log_date", date).maybeSingle();
  const sets = ((log?.set_logs ?? []) as { plan_item_id: string | null; reps: number | null; weight: number | null; kind: string }[]).map((x) => ({ itemId: x.plan_item_id, reps: x.reps, weight: x.weight, warmup: x.kind === "warmup" }));
  const ids = Array.from(new Set(sets.map((x) => x.itemId).filter((x): x is string => !!x))); if (!ids.length) return null;
  const { data: items } = await supabase.from("plan_items").select("id,reps,target_weight,exercises(name)").in("id", ids);
  const list = ((items ?? []) as unknown as { id: string; reps: string; target_weight: number | null; exercises: { name: string } | null }[]).map((i) => ({ id: i.id, name: i.exercises?.name ?? "un ejercicio", reps: i.reps, weight: i.target_weight }));
  const adv = workoutAdvice(sets, list, (log as { effort: number | null } | null)?.effort ?? null); if (!adv.length) return null;
  const t = (a: (typeof adv)[number]) => `${a.kind === "up" ? "subir" : "bajar"} el peso en ${a.name}${a.next != null ? ` (a ${a.next} kg)` : ""}`;
  return `Sugerencia: ${adv.slice(0, 2).map(t).join("; ")}${adv.length > 2 ? ` y ${adv.length - 2} más` : ""}.`;
}
