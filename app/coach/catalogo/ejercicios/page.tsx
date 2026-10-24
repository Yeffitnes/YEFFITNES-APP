import { requireUser } from "@/lib/session";
import { CatalogHead } from "@/components/coach/CatalogHead";
import { ExerciseGrid, type Ex } from "@/components/coach/ExerciseGrid";
export default async function Ejercicios() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("exercises").select("id,name,category,muscle_group,equipment,difficulty,video_ref,template_items(count)").eq("active", true).order("name");
  const items: Ex[] = (data ?? []).map((e) => ({ id: e.id, name: e.name, category: e.category, muscle: e.muscle_group, equipment: e.equipment, difficulty: e.difficulty, hasVideo: !!e.video_ref, used: (e.template_items as unknown as { count: number }[])?.[0]?.count ?? 0 }));
  return (
    <div>
      <CatalogHead tab="ejercicios" sub={`${items.length} ejercicios · contenido reutilizable en todas las rutinas`} addHref="/coach/catalogo/ejercicios/nuevo" addLabel="Nuevo ejercicio" />
      {error ? <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>No pudimos cargar los ejercicios. Recarga la página.</p> : <ExerciseGrid items={items} />}
    </div>
  );
}
