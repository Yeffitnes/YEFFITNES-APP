import Link from "next/link";
import { requireUser } from "@/lib/session";
import { CatalogHead } from "@/components/coach/CatalogHead";
const CATS: [string, string][] = [["upper", "Tren superior"], ["lower", "Tren inferior"], ["core", "Core"], ["cardio", "Cardio"]];
export default async function Ejercicios({ searchParams }: { searchParams: { c?: string; v?: string; q?: string } }) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("exercises").select("id,name,category,muscle_group,equipment,difficulty,video_ref,template_items(count)").eq("active", true).order("name");
  const term = (searchParams.q ?? "").toLowerCase();
  const list = (data ?? []).filter((e) => (!searchParams.c || e.category === searchParams.c) && (!searchParams.v || e.video_ref) && (!term || e.name.toLowerCase().includes(term)));
  const chip = (href: string, t: string, on: boolean) => <Link key={t} href={href} className={`filter-chip${on ? " active" : ""}`}>{t}</Link>;
  return (
    <div>
      <CatalogHead tab="ejercicios" sub={`${data?.length ?? 0} ejercicios · contenido reutilizable en todas las rutinas`} addHref="/coach/catalogo/ejercicios/nuevo" addLabel="Nuevo ejercicio" />
      <form className="filter-row"><div className="search-box"><input name="q" defaultValue={searchParams.q} placeholder="Buscar ejercicio..." /></div>
        {chip("?", "Todos", !searchParams.c && !searchParams.v)}{CATS.map(([k, t]) => chip(`?c=${k}`, t, searchParams.c === k))}{chip("?v=1", "Con vídeo", !!searchParams.v)}</form>
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>No pudimos cargar los ejercicios. Recarga la página.</p>}
      {!error && !data?.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay ejercicios. Crea el primero con “Nuevo ejercicio”: después los podrás usar en todas tus rutinas.</p></div>}
      {!error && !!data?.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún ejercicio coincide con ese filtro.</p></div>}
      <div className="ex-grid">{list.map((e) => {
        const used = (e.template_items as unknown as { count: number }[])?.[0]?.count ?? 0;
        return (
          <Link key={e.id} href={`/coach/catalogo/ejercicios/${e.id}`} className="ex-card">
            <div className={`ex-thumb${e.video_ref ? "" : " no-video"}`}>{e.video_ref ? <div className="ex-thumb-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 24 24"><path d="M6 4l11 6-11 6V4z" /></svg>}</div>
            <div className="ex-body"><div className="ex-name">{e.name}</div><div className="ex-used">{used ? `Usado en ${used} ${used === 1 ? "rutina" : "rutinas"}` : "Sin usar aún"}</div>
              <div className="ex-tags">{e.muscle_group && <span className="ex-tag">{e.muscle_group}</span>}{e.equipment && <span className="ex-tag">{e.equipment}</span>}</div>
              <div className="ex-diff">{[1, 2, 3].map((n) => <span key={n} className={n <= e.difficulty ? "filled" : ""} />)}</div></div>
          </Link>);
      })}</div>
    </div>
  );
}
