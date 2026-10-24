import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { archiveExercise, saveExercise } from "../../actions";
const ERR: Record<string, string> = { nombre: "Escribe el nombre del ejercicio.", video: "Ese enlace de YouTube no es válido.", guardar: "No pudimos guardar. Inténtalo de nuevo." };
const F = { width: "100%", height: 40, borderRadius: 11, border: "1px solid var(--line)", padding: "0 12px", fontSize: 13.5, background: "#fff" } as const;
export default async function EjercicioForm({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase } = await requireUser();
  const isNew = params.id === "nuevo";
  const { data: e } = isNew ? { data: null } : await supabase.from("exercises").select("*").eq("id", params.id).maybeSingle();
  if (!isNew && !e) notFound();
  const lab = (t: string) => <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", display: "block", margin: "14px 0 6px" }}>{t}</label>;
  return (
    <div>
      <Link href="/coach/catalogo/ejercicios" className="back-link">← Volver a ejercicios</Link>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Catálogo</div><h1>{isNew ? "Nuevo ejercicio" : e!.name}</h1></div></div>
      <div className="card" style={{ maxWidth: 560 }}>
        <form action={saveExercise}>
          {!isNew && <input type="hidden" name="id" value={e!.id} />}
          {lab("Nombre")}<input name="name" required defaultValue={e?.name} style={F} />
          {lab("Zona")}<select name="category" defaultValue={e?.category ?? "other"} style={F}><option value="upper">Tren superior</option><option value="lower">Tren inferior</option><option value="core">Core</option><option value="cardio">Cardio</option><option value="other">Otro</option></select>
          {lab("Músculo (ej. Pecho)")}<input name="muscle_group" defaultValue={e?.muscle_group ?? ""} style={F} />
          {lab("Equipo (ej. Barra)")}<input name="equipment" defaultValue={e?.equipment ?? ""} style={F} />
          {lab("Dificultad")}<select name="difficulty" defaultValue={e?.difficulty ?? 1} style={F}><option value={1}>Baja</option><option value={2}>Media</option><option value={3}>Alta</option></select>
          {lab("Enlace de YouTube (opcional)")}<input name="video" defaultValue={e?.video_ref ? `https://youtu.be/${e.video_ref}` : ""} placeholder="https://youtu.be/..." style={F} />
          {lab("Instrucciones (opcional)")}<textarea name="instructions" defaultValue={e?.instructions ?? ""} rows={4} style={{ ...F, height: "auto", padding: 12 }} />
          {searchParams.error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{ERR[searchParams.error] ?? ERR.guardar}</p>}
          <button className="primary-btn" style={{ marginTop: 18 }}>Guardar ejercicio</button>
        </form>
        {!isNew && <form action={archiveExercise} style={{ marginTop: 14 }}><input type="hidden" name="id" value={e!.id} /><button className="ghost-btn" style={{ color: "var(--danger)" }}>Archivar ejercicio</button></form>}
      </div>
    </div>
  );
}
