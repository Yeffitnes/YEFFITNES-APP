import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { RoutineForm } from "@/components/coach/RoutineForm";
import { archiveRoutine, saveRoutine } from "../../actions";
const ERR: Record<string, string> = { datos: "Escribe un nombre y agrega al menos un ejercicio completo.", items: "No pudimos leer los ejercicios. Recarga e inténtalo de nuevo.", guardar: "No pudimos guardar. Inténtalo de nuevo." };
const F = { width: "100%", height: 40, borderRadius: 11, border: "1px solid var(--line)", padding: "0 12px", fontSize: 13.5, background: "#fff" } as const;
export default async function RutinaForm({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase } = await requireUser();
  const isNew = params.id === "nueva";
  const [{ data: exs }, { data: r }] = await Promise.all([
    supabase.from("exercises").select("id,name").eq("active", true).order("name"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("routine_templates").select("id,name,category,est_minutes,template_items(position,exercise_id,sets,reps,rest_seconds)").eq("id", params.id).maybeSingle(),
  ]);
  if (!isNew && !r) notFound();
  const items = ((r?.template_items as unknown as { position: number; exercise_id: string; sets: number; reps: string; rest_seconds: number | null }[]) ?? []).sort((a, b) => a.position - b.position);
  const lab = (t: string) => <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", display: "block", margin: "14px 0 6px" }}>{t}</label>;
  return (
    <div>
      <Link href="/coach/catalogo/rutinas" className="back-link">← Volver a rutinas</Link>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Catálogo</div><h1>{isNew ? "Nueva rutina" : r!.name}</h1></div></div>
      {!exs?.length ? <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Primero crea algunos ejercicios en el catálogo; después podrás armar la rutina con ellos.</p><Link href="/coach/catalogo/ejercicios/nuevo" className="primary-btn" style={{ marginTop: 14, display: "inline-flex" }}>Crear ejercicio</Link></div> : (
        <div className="card" style={{ maxWidth: 680 }}>
          <form action={saveRoutine}>
            {!isNew && <input type="hidden" name="id" value={r!.id} />}
            {lab("Nombre")}<input name="name" required defaultValue={r?.name} style={F} />
            {lab("Tipo (ej. Fuerza, HIIT)")}<input name="category" defaultValue={r?.category ?? ""} style={F} />
            {lab("Duración aproximada (minutos)")}<input name="est_minutes" type="number" min={1} defaultValue={r?.est_minutes ?? ""} style={F} />
            <RoutineForm exercises={exs} initial={items.map((i) => ({ exercise_id: i.exercise_id, sets: i.sets, reps: i.reps, rest_seconds: i.rest_seconds }))} />
            {searchParams.error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{ERR[searchParams.error] ?? ERR.guardar}</p>}
            <button className="primary-btn" style={{ marginTop: 18 }}>Guardar rutina</button>
          </form>
          {!isNew && <form action={archiveRoutine} style={{ marginTop: 14 }}><input type="hidden" name="id" value={r!.id} /><button className="ghost-btn" style={{ color: "var(--danger)" }}>Archivar rutina</button></form>}
        </div>)}
    </div>
  );
}
