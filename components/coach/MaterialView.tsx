"use client";
import { useState } from "react";
import { MAT_CATS, useCoachMaterials, useDeleteMaterial, useFeatureMaterial, useSaveMaterial, type CoachMaterial, type MaterialInput } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { youtubeId } from "@/lib/format";
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const STAR = "M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.4-4.6-2.5-4.6 2.5.9-5.4-3.9-3.7 5.3-.7L10 2.5z";
export function MaterialView() {
  const { data, isPending, isError, refetch } = useCoachMaterials(), feat = useFeatureMaterial(), del = useDeleteMaterial();
  const [q, setQ] = useState(""), [f, setF] = useState<"all" | "article" | "video">("all"), [edit, setEdit] = useState<CoachMaterial | "new" | null>(null), [rm, setRm] = useState<CoachMaterial | null>(null);
  const all = data ?? [], featured = all.find((m) => m.featured);
  const list = all.filter((m) => (f === "all" || m.kind === f) && m.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Material educativo</div><h1>{data ? `${all.length} publicacion${all.length === 1 ? "" : "es"}` : "Material educativo"}</h1><p className="greeting-sub">Lo ven tus clientes activos según su plan. Los vídeos son enlaces de YouTube: deben ser tuyos o permitir “insertar”; los que tienen música con derechos suelen bloquearse (se ve “Vídeo no disponible”).</p></div>
        <button className="primary-btn" onClick={() => setEdit("new")}>Nuevo contenido</button></div>
      {featured && <div className="featured-banner"><svg viewBox="0 0 20 20"><path d={STAR} /></svg><span>Vídeo de la semana: <b>{featured.title}</b> — se muestra en “Hoy” a todos tus clientes.</span></div>}
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input type="text" placeholder="Buscar contenido..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contenido" /></div>
        {([["all", "Todos"], ["article", "Artículos"], ["video", "Vídeos"]] as const).map(([k, t]) => <button key={k} className={`filter-chip${f === k ? " active" : ""}`} onClick={() => setF(k)}>{t}</button>)}
      </div>
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el material. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !all.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no has publicado contenido. Crea el primero con “Nuevo contenido”: un artículo corto o un vídeo de YouTube.</p></div>}
      {data && !!all.length && !list.length && <p className="empty-note">Nada coincide con tu búsqueda.</p>}
      <div className="content-grid">{list.map((m) => (
        <div key={m.id} className="content-card" style={m.published ? undefined : { opacity: 0.6 }}>
          <div className="content-actions">
            <button aria-label={`Editar ${m.title}`} onClick={() => setEdit(m)}><svg viewBox="0 0 20 20"><path d="M13.5 3.5l3 3L7 16l-4 1 1-4 9.5-9.5z" /></svg></button>
            <button aria-label={`Eliminar ${m.title}`} onClick={() => setRm(m)}><svg viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" /></svg></button>
          </div>
          <div className={`content-thumb ${m.kind === "video" ? "video" : "articulo"}`}>
            {m.kind === "video" ? <div className="play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>}
            {m.kind === "video" && m.tier === "basic" && m.published && <button className={`featured-toggle${m.featured ? " active" : ""}`} disabled={feat.isPending} title="Destacar como vídeo de la semana" aria-pressed={m.featured} aria-label="Vídeo de la semana" onClick={() => feat.mutate({ id: m.id, on: !m.featured })}><svg viewBox="0 0 20 20"><path d={STAR} /></svg></button>}
          </div>
          <div className="content-body"><div className="content-title">{m.title}</div><div className="content-cat">{m.category}{m.tier === "full" ? " · Plan completo" : ""}{m.published ? "" : " · Borrador"}</div>
            <div className="content-meta"><span className="content-date">{fmt(m.date)}</span><span className="content-views">Visto por {m.views}</span></div></div>
        </div>))}</div>
      {edit && <MaterialForm item={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {rm && <Modal title="Eliminar contenido" sub={`“${rm.title}” dejará de verse y se borrará su conteo de vistas.`} onClose={() => setRm(null)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(null)}>Cancelar</button><button className="modal-btn primary" disabled={del.isPending} onClick={() => del.mutate(rm.id, { onSuccess: () => setRm(null) })}>{del.isPending ? "Eliminando…" : "Eliminar"}</button></div></Modal>}
    </div>
  );
}
function MaterialForm({ item, onClose }: { item: CoachMaterial | null; onClose: () => void }) {
  const ws = useWorkspaceId(), save = useSaveMaterial(ws);
  const [v, setV] = useState({ kind: item?.kind ?? "article", title: item?.title ?? "", category: item?.category ?? MAT_CATS[0], body: item?.body ?? "", video: item?.videoRef ? `https://youtu.be/${item.videoRef}` : "", tier: item?.tier ?? "basic", published: item?.published ?? true }), [err, setErr] = useState("");
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(""); };
  const submit = () => {
    if (!v.title.trim()) return setErr("Escribe un título.");
    const vid = v.kind === "video" ? youtubeId(v.video) : null;
    if (v.kind === "video" && !vid) return setErr("Pega un enlace de YouTube válido.");
    if (v.kind === "article" && v.body.trim().length < 20) return setErr("El artículo es muy corto: escribe al menos una frase completa.");
    const input: MaterialInput = { id: item?.id, kind: v.kind, title: v.title, category: v.category, body: v.body, videoRef: vid ?? "", tier: v.tier, published: v.published };
    save.mutate(input, { onSuccess: onClose });
  };
  return (
    <Modal title={item ? "Editar contenido" : "Nuevo contenido educativo"} sub="Aparece en el portal de los clientes cuyo plan lo incluya." onClose={onClose}>
      <div className="type-select-row">
        <button type="button" className={`type-select-btn${v.kind === "article" ? " active" : ""}`} onClick={() => set({ kind: "article" })}><svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>Artículo</button>
        <button type="button" className={`type-select-btn${v.kind === "video" ? " active" : ""}`} onClick={() => set({ kind: "video" })}><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg>Vídeo</button>
      </div>
      <div className="modal-field"><label htmlFor="mt">Título</label><input id="mt" value={v.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Ej. Cómo prevenir lesiones de rodilla" /></div>
      <div className="modal-field"><label htmlFor="mc">Categoría</label><select id="mc" value={v.category} onChange={(e) => set({ category: e.target.value })}>{MAT_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
      {v.kind === "article"
        ? <div className="modal-field"><label htmlFor="mb">Contenido</label><textarea id="mb" value={v.body} onChange={(e) => set({ body: e.target.value })} placeholder="Escribe el artículo aquí..." /></div>
        : <div className="modal-field"><label htmlFor="mv">Enlace de YouTube</label><input id="mv" value={v.video} onChange={(e) => set({ video: e.target.value })} placeholder="https://youtu.be/..." /></div>}
      <div className="modal-field"><label htmlFor="mx">Quién lo ve</label><select id="mx" value={v.tier} onChange={(e) => set({ tier: e.target.value as "basic" | "full" })}><option value="basic">Todos los planes con material educativo</option><option value="full">Solo plan completo (biblioteca completa)</option></select></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, margin: "6px 0 2px" }}><input type="checkbox" checked={v.published} onChange={(e) => set({ published: e.target.checked })} />Publicado (desmárcalo para guardarlo como borrador)</label>
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : item ? "Guardar cambios" : "Publicar"}</button></div>
    </Modal>
  );
}
