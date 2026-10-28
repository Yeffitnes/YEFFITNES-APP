"use client";
import { useState } from "react";
import { MAT_CATS, useCoachMaterials, useDeleteMaterial, useFeatureMaterial, useSaveMaterial, type CoachMaterial, type FeaturedPeriod, type MaterialInput } from "@/lib/queries";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { youtubeId } from "@/lib/format";
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const STAR = "M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.4-4.6-2.5-4.6 2.5.9-5.4-3.9-3.7 5.3-.7L10 2.5z";
const PERIOD: Record<FeaturedPeriod, string> = { day: "Vídeo del día", week: "Vídeo de la semana" };
const untilTxt = (m: CoachMaterial) => (m.featuredUntil ? (m.featuredPeriod === "day" ? "se ve en “Hoy” hasta la medianoche" : `se ve en “Hoy” hasta el ${new Date(m.featuredUntil + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric" })}`) : "se muestra en “Hoy” a todos tus clientes");
export function MaterialView() {
  const { data, isPending, isError, refetch } = useCoachMaterials(), feat = useFeatureMaterial(), del = useDeleteMaterial();
  const [q, setQ] = useState(""), [f, setF] = useState<"all" | "article" | "video">("all"), [edit, setEdit] = useState<CoachMaterial | "new" | null>(null), [rm, setRm] = useState<CoachMaterial | null>(null);
  const [star, setStar] = useState<CoachMaterial | null>(null), [watch, setWatch] = useState<CoachMaterial | null>(null), [newFeat, setNewFeat] = useState<FeaturedPeriod | null>(null);
  const all = data ?? [], featured = all.find((m) => m.featured);
  const list = all.filter((m) => (f === "all" || m.kind === f) && m.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Material educativo</div><h1>{data ? `${all.length} publicacion${all.length === 1 ? "" : "es"}` : "Material educativo"}</h1><p className="greeting-sub">Lo ven tus clientes activos según su plan. Un vídeo puede ser de YouTube (debe permitir “insertar”) o privado: lo subes desde aquí y solo lo ven tus clientes. Destaca uno como vídeo del día o de la semana para que salga en “Hoy”.</p></div>
        <button className="primary-btn" onClick={() => setEdit("new")}>Nuevo contenido</button></div>
      {/* Vídeo del día / de la semana a la vista (pedido de Cristian, 28-oct): antes solo se podía con la estrella de cada vídeo y no se encontraba. */}
      <div className="fv-panel">
        <span className="fv-panel-ic"><svg viewBox="0 0 20 20"><path d={STAR} /></svg></span>
        <div className="fv-panel-txt">
          <div className="fv-panel-tag">Vídeo destacado en Hoy</div>
          {featured ? <><b>{PERIOD[featured.featuredPeriod]}: {featured.title}</b><span>{untilTxt(featured).replace(/^se/, "Se")}.</span></>
            : <><b>Ahora no hay vídeo del día ni de la semana</b><span>Sube uno y sale arriba en la pantalla Hoy de todos tus clientes.</span></>}
        </div>
        <div className="fv-panel-acts">
          <button className="ghost-btn" onClick={() => setNewFeat("day")}>Subir vídeo del día</button>
          <button className="primary-btn" onClick={() => setNewFeat("week")}>Subir vídeo de la semana</button>
          {featured && <button className="ghost-btn" disabled={feat.isPending} onClick={() => feat.mutate({ id: featured.id, on: false })}>Quitar</button>}
        </div>
      </div>
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
            {m.kind === "video" ? (m.privateVideo ? <button type="button" className="play" aria-label={`Ver ${m.title}`} style={{ border: 0, cursor: "pointer" }} onClick={() => setWatch(m)}><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></button> : <div className="play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div>) : <svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>}
            {m.kind === "video" && <span className="mat-src">{m.privateVideo ? <><Icon name="lock" size={10} stroke={2} /> Privado</> : m.videoRef ? "YouTube" : "Sin vídeo aún"}</span>}
            {m.kind === "video" && m.tier === "basic" && m.published && (m.privateVideo || m.videoRef) && <button className={`featured-toggle${m.featured ? " active" : ""}`} disabled={feat.isPending} title="Destacar en Hoy" aria-pressed={m.featured} aria-label={m.featured ? PERIOD[m.featuredPeriod] : "Destacar en Hoy"} onClick={() => setStar(m)}><svg viewBox="0 0 20 20"><path d={STAR} /></svg></button>}
          </div>
          <div className="content-body"><div className="content-title">{m.title}</div><div className="content-cat">{m.category}{m.tier === "full" ? " · Plan completo" : ""}{m.published ? "" : m.kind === "video" && !m.privateVideo && !m.videoRef ? " · Subiendo o sin vídeo" : " · Borrador"}{m.featured ? ` · ${PERIOD[m.featuredPeriod]}` : ""}</div>
            <div className="content-meta"><span className="content-date">{fmt(m.date)}</span><span className="content-views">Visto por {m.views}</span></div></div>
        </div>))}</div>
      {edit && <MaterialForm item={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {newFeat && <MaterialForm item={null} feature={newFeat} onClose={() => setNewFeat(null)} />}
      {watch && <BunnyModal param={`material=${watch.id}`} title={watch.title} sub="Vídeo privado" onClose={() => setWatch(null)} />}
      {star && <Modal title="Destacar en Hoy" sub={`“${star.title}” sale arriba en la pantalla Hoy de todos tus clientes. Solo puede haber uno a la vez.`} onClose={() => setStar(null)}>
        <div className="star-opts">
          <button type="button" className="star-opt" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: true, period: "day" }, { onSuccess: () => setStar(null) })}><b>Vídeo del día</b><span>Se ve solo hoy, hasta la medianoche.</span></button>
          <button type="button" className="star-opt" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: true, period: "week" }, { onSuccess: () => setStar(null) })}><b>Vídeo de la semana</b><span>Se ve 7 días. Ideal para saludar y contar qué viene esta semana.</span></button>
        </div>
        <div className="modal-actions">{star.featured && <button className="modal-btn ghost" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: false }, { onSuccess: () => setStar(null) })}>Quitar destacado</button>}<button className="modal-btn ghost" onClick={() => setStar(null)}>Cancelar</button></div></Modal>}
      {rm && <Modal title="Eliminar contenido" sub={`“${rm.title}” dejará de verse y se borrará su conteo de vistas.`} onClose={() => setRm(null)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(null)}>Cancelar</button><button className="modal-btn primary" disabled={del.isPending} onClick={() => del.mutate(rm.id, { onSuccess: () => setRm(null) })}>{del.isPending ? "Eliminando…" : "Eliminar"}</button></div></Modal>}
    </div>
  );
}
function MaterialForm({ item, feature, onClose }: { item: CoachMaterial | null; feature?: FeaturedPeriod; onClose: () => void }) {
  const ws = useWorkspaceId(), save = useSaveMaterial(ws);
  const [v, setV] = useState({ kind: item?.kind ?? (feature ? "video" : "article"), title: item?.title ?? "", category: item?.category ?? (feature ? "Motivación" : MAT_CATS[0]), body: item?.body ?? "", video: item?.videoRef ? `https://youtu.be/${item.videoRef}` : "", src: (item?.privateVideo || feature ? "private" : "youtube") as "youtube" | "private", tier: item?.tier ?? "basic", published: item?.published ?? true }), [err, setErr] = useState("");
  const [file, setFile] = useState<File | null>(null), [checking, setChecking] = useState(false);
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(""); };
  const pick = async (f: File | null) => {
    setErr(""); if (!f) return; if (!f.type.startsWith("video/")) return setErr("Elige un archivo de vídeo.");
    if (f.size > MAX_COACH_VIDEO_MB * 1024 * 1024) return setErr(`El vídeo pesa más de ${MAX_COACH_VIDEO_MB / 1000} GB.`);
    setChecking(true); const d = await videoDuration(f); setChecking(false);
    if (d != null && d > MAX_COACH_VIDEO_SECONDS) return setErr(`El vídeo dura más de ${MAX_COACH_VIDEO_SECONDS / 60} minutos.`);
    setFile(f);
  };
  const submit = () => {
    if (!v.title.trim()) return setErr("Escribe un título.");
    const priv = v.kind === "video" && v.src === "private";
    const vid = v.kind === "video" && !priv ? youtubeId(v.video) : null;
    if (v.kind === "video" && !priv && !vid) return setErr("Pega un enlace de YouTube válido.");
    if (priv && !file && !item?.privateVideo) return setErr("Elige el vídeo que vas a subir.");
    if (v.kind === "article" && v.body.trim().length < 20) return setErr("El artículo es muy corto: escribe al menos una frase completa.");
    const input: MaterialInput = { id: item?.id, kind: v.kind, title: v.title, category: v.category, body: v.body, videoRef: vid ?? "", tier: feature ? "basic" : v.tier, published: feature ? true : v.published, file: priv ? file : null, keepPrivate: priv && !file, feature };
    save.mutate(input, { onSuccess: onClose });
  };
  return (
    <Modal title={feature ? PERIOD[feature] : item ? "Editar contenido" : "Nuevo contenido educativo"} sub={feature ? (feature === "day" ? "Sale arriba en Hoy de todos tus clientes solo hoy, hasta la medianoche. También queda guardado en Material." : "Sale arriba en Hoy de todos tus clientes durante 7 días. Ideal para saludar y contar qué viene esta semana. También queda guardado en Material.") : "Aparece en el portal de los clientes cuyo plan lo incluya."} onClose={onClose}>
      {!feature && <div className="type-select-row">
        <button type="button" className={`type-select-btn${v.kind === "article" ? " active" : ""}`} onClick={() => set({ kind: "article" })}><svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>Artículo</button>
        <button type="button" className={`type-select-btn${v.kind === "video" ? " active" : ""}`} onClick={() => set({ kind: "video" })}><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg>Vídeo</button>
      </div>}
      <div className="modal-field"><label htmlFor="mt">Título</label><input id="mt" value={v.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder={feature ? (feature === "day" ? "Ej. Hoy: hidrátate bien en el entreno" : "Ej. Semana 3: subimos intensidad") : "Ej. Cómo prevenir lesiones de rodilla"} /></div>
      <div className="modal-field"><label htmlFor="mc">Categoría</label><select id="mc" value={v.category} onChange={(e) => set({ category: e.target.value })}>{MAT_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
      {v.kind === "article"
        ? <div className="modal-field"><label htmlFor="mb">Contenido</label><textarea id="mb" value={v.body} onChange={(e) => set({ body: e.target.value })} placeholder="Escribe el artículo aquí..." /></div>
        : <>
          <div className="modal-field"><label>Dónde está el vídeo</label><div className="seg">
            <button type="button" className={v.src === "youtube" ? "on" : ""} onClick={() => set({ src: "youtube" })}>YouTube</button>
            <button type="button" className={v.src === "private" ? "on" : ""} onClick={() => set({ src: "private" })}><Icon name="lock" size={12} stroke={2} /> Privado</button></div></div>
          {v.src === "youtube"
            ? <div className="modal-field"><label htmlFor="mv">Enlace de YouTube</label><input id="mv" value={v.video} onChange={(e) => set({ video: e.target.value })} placeholder="https://youtu.be/..." /></div>
            : <div className="modal-field"><label htmlFor="mf">Vídeo privado</label>
                <input id="mf" type="file" accept="video/*" onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                <p className="field-hint">{checking ? "Revisando el vídeo…" : file ? `Listo para subir: ${file.name.slice(0, 40)}` : item?.privateVideo ? "Ya tiene un vídeo privado. Elige otro solo si quieres reemplazarlo." : `Hasta ${MAX_COACH_VIDEO_SECONDS / 60} min. Se sube en segundo plano: puedes seguir usando la app y se publica solo al terminar.`}</p></div>}
        </>}
      {!feature && <><div className="modal-field"><label htmlFor="mx">Quién lo ve</label><select id="mx" value={v.tier} onChange={(e) => set({ tier: e.target.value as "basic" | "full" })}><option value="basic">Todos los planes con material educativo</option><option value="full">Solo plan completo (biblioteca completa)</option></select></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, margin: "6px 0 2px" }}><input type="checkbox" checked={v.published} onChange={(e) => set({ published: e.target.checked })} />Publicado (desmárcalo para guardarlo como borrador)</label></>}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : feature ? (file ? "Subir y destacar" : "Publicar y destacar") : item ? "Guardar cambios" : "Publicar"}</button></div>
    </Modal>
  );
}
