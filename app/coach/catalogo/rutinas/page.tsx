import { requireUser } from "@/lib/session";
import { CatalogHead } from "@/components/coach/CatalogHead";
import { RoutineCard } from "@/components/coach/RoutineCard";
export default async function Rutinas() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("routine_templates").select("id,name,category,est_minutes,template_items(position,sets,reps,rest_seconds,exercises(name,video_ref))").eq("active", true).order("created_at", { ascending: false });
  type It = { position: number; sets: number; reps: string; rest_seconds: number | null; exercises: { name: string; video_ref: string | null } | null };
  return (
    <div>
      <CatalogHead tab="rutinas" sub={`${data?.length ?? 0} rutinas · colecciones reutilizables de ejercicios`} addHref="/coach/catalogo/rutinas/nueva" addLabel="Nueva rutina" />
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>No pudimos cargar las rutinas. Recarga la página.</p>}
      {!error && !data?.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay rutinas. Crea una con “Nueva rutina” juntando ejercicios de tu catálogo; luego se la asignarás a tus clientes.</p></div>}
      {data?.map((r) => {
        const its = ((r.template_items as unknown as It[]) ?? []).sort((a, b) => a.position - b.position);
        const meta = [`${its.length} ejercicios`, r.est_minutes ? `${r.est_minutes} min aprox.` : null, r.category].filter(Boolean).join(" · ");
        return <RoutineCard key={r.id} id={r.id} name={r.name} meta={meta} hasVideo={its.some((i) => i.exercises?.video_ref)} rows={its.map((i) => ({ name: i.exercises?.name ?? "—", sets: i.sets, reps: i.reps, rest: i.rest_seconds }))} />;
      })}
    </div>
  );
}
