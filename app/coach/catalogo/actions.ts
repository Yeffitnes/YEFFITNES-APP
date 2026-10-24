"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { youtubeId } from "@/lib/format";
const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
async function coachOnly() {
  const s = await requireUser();
  if (s.profile.role !== "coach") redirect("/inicio"); // además lo impide RLS
  return s;
}
export async function saveExercise(form: FormData) {
  const { supabase, profile } = await coachOnly();
  const id = txt(form, "id"), name = txt(form, "name");
  if (!name) redirect(`/coach/catalogo/ejercicios/${id || "nuevo"}?error=nombre`);
  const yt = txt(form, "video"), vid = youtubeId(yt);
  if (yt && !vid) redirect(`/coach/catalogo/ejercicios/${id || "nuevo"}?error=video`);
  const row = {
    name, category: txt(form, "category") || "other", muscle_group: txt(form, "muscle_group") || null, equipment: txt(form, "equipment") || null,
    difficulty: Math.min(3, Math.max(1, Number(form.get("difficulty")) || 1)), instructions: txt(form, "instructions") || null,
    video_provider: vid ? "youtube" : null, video_ref: vid,
  };
  const { error } = id ? await supabase.from("exercises").update(row).eq("id", id) : await supabase.from("exercises").insert({ ...row, workspace_id: profile.workspace_id });
  if (error) redirect(`/coach/catalogo/ejercicios/${id || "nuevo"}?error=guardar`);
  revalidatePath("/coach/catalogo/ejercicios");
  redirect("/coach/catalogo/ejercicios");
}
export async function archiveExercise(form: FormData) {
  const { supabase } = await coachOnly();
  await supabase.from("exercises").update({ active: false }).eq("id", txt(form, "id"));
  revalidatePath("/coach/catalogo/ejercicios");
  redirect("/coach/catalogo/ejercicios");
}
type Item = { exercise_id: string; sets: number; reps: string; rest_seconds: number | null };
export async function saveRoutine(form: FormData) {
  const { supabase, profile } = await coachOnly();
  const id = txt(form, "id"), name = txt(form, "name"), back = `/coach/catalogo/rutinas/${id || "nueva"}`;
  let items: Item[] = [];
  try { items = JSON.parse(txt(form, "items")); } catch { redirect(`${back}?error=items`); }
  items = items.filter((i) => i.exercise_id && i.sets > 0 && String(i.reps).trim());
  if (!name || !items.length) redirect(`${back}?error=datos`);
  const head = { name, category: txt(form, "category") || null, est_minutes: Number(form.get("est_minutes")) > 0 ? Number(form.get("est_minutes")) : null };
  let tid = id;
  if (id) { const { error } = await supabase.from("routine_templates").update(head).eq("id", id); if (error) redirect(`${back}?error=guardar`); }
  else { const { data, error } = await supabase.from("routine_templates").insert({ ...head, workspace_id: profile.workspace_id }).select("id").single(); if (error || !data) redirect(`${back}?error=guardar`); tid = data.id; }
  const { data: old } = await supabase.from("template_items").select("id").eq("template_id", tid);
  const { error: e2 } = await supabase.from("template_items").insert(items.map((i, p) => ({ workspace_id: profile.workspace_id, template_id: tid, exercise_id: i.exercise_id, position: p, sets: Math.round(i.sets), reps: String(i.reps).trim(), rest_seconds: i.rest_seconds })));
  if (e2) redirect(`${back.replace("nueva", tid)}?error=guardar`);
  if (old?.length) await supabase.from("template_items").delete().in("id", old.map((o) => o.id)); // se borran los viejos solo si los nuevos se guardaron
  revalidatePath("/coach/catalogo/rutinas");
  redirect("/coach/catalogo/rutinas");
}
export async function archiveRoutine(form: FormData) {
  const { supabase } = await coachOnly();
  await supabase.from("routine_templates").update({ active: false }).eq("id", txt(form, "id"));
  revalidatePath("/coach/catalogo/rutinas");
  redirect("/coach/catalogo/rutinas");
}
