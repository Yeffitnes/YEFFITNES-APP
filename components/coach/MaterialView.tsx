"use client";
import { useEffect, useRef, useState } from "react";
import { MAT_CATS, useCoachMaterials, useDeleteMaterial, useFeatureMaterial, useSaveMaterial, type CoachMaterial, type FeaturedPeriod, type MaterialInput } from "@/lib/queries";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { BunnyModal, prefetchPlay } from "@/components/ui/BunnyModal";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { youtubeId } from "@/lib/format";
import { posterFromVideo, ytThumb } from "@/lib/video-poster";
import { VideoModal } from "@/components/portal/VideoModal";
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const STAR = "M10 2.5l2.3 4.9 5.3.7-3.9 3.7.9 5.4-4.6-2.5-4.6 2.5.9-5.4-3.9-3.7 5.3-.7L10 2.5z";
const PERIOD: Record<FeaturedPeriod, string> = { day: "Vídeo del día", week: "Vídeo de la semana" };
const untilTxt = (m: CoachMaterial) => (m.featuredUntil ? (m.featuredPeriod === "day" ? "se ve en “Hoy” hasta la medianoche" : `se ve en “Hoy” hasta el ${new Date(m.featuredUntil + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric" })}`) : "se muestra en “Hoy” a todos tus clientes");
export function MaterialView() {
  const { data, isPending, isError, refetch } = useCoachMaterials(), feat = useFeatureMaterial(), del = useDeleteMaterial();
  const [q, setQ] = useState(""), [f, setF] = useState<"all" | "article" | "video">("all"), [edit, setEdit] = useState<CoachMaterial | "new" | null>(null), [rm, setRm] = useState<CoachMaterial | null>(null);
  const [star, setStar] = useState<CoachMaterial | null>(null), [watch, setWatch] = useState<CoachMaterial | null>(null), [newFeat, setNewFeat] = useState<FeaturedPeriod | null>(null);
  const all = data ?? [], [yt, setYt] = useState<CoachMaterial | null>(null);
  const list = all.filter((m) => (f === "all" || m.kind === f) && m.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Material educativo</div><h1>{data ? `${all.length} publicacion${all.length === 1 ? "" : "es"}` : "Material educativo"}</h1><p className="greeting-sub">Lo ven tus clientes activos según su plan. Un vídeo puede ser de YouTube (debe permitir “insertar”) o privado: lo subes desde aquí y solo lo ven tus clientes. Destaca uno como vídeo del día o de la semana para que salga en “Hoy”.</p></div>
        <button className="primary-btn" onClick={() => setEdit("new")}>Nuevo contenido</button></div>
      {/* Vídeo del día y vídeo de la semana (29-oct): dos espacios, cada uno con lo suyo; pueden estar los dos a la vez.
          Antes era un solo destacado (el segundo quitaba al primero) y en el celular las letras de los botones se montaban. */}
      <div className="fv-slots">
        {(["day", "week"] as const).map((p) => { const m = all.find((x) => x.featured && x.featuredPeriod === p), poster = m ? m.poster ?? ytThumb(m.videoRef) : null;
          return (
            <div key={p} className={`fv-slot${m ? " on" : ""}`}>
              <button type="button" className="fv-slot-thumb" disabled={!m} aria-label={m ? `Ver ${m.title}` : undefined} onClick={() => m && (m.privateVideo ? setWatch(m) : m.videoRef && setYt(m))}>
                {poster && <span className="vposter" aria-hidden style={{ backgroundImage: `url("${poster}")` }} />}
                <span className="fv-slot-play">{m ? <svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg> : <svg viewBox="0 0 20 20" className="star"><path d={STAR} /></svg>}</span>
              </button>
              <div className="fv-slot-txt">
                <div className="fv-panel-tag">{PERIOD[p]}</div>
                <b>{m ? m.title : p === "day" ? "Sin vídeo del día" : "Sin vídeo de la semana"}</b>
                <span>{m ? untilTxt(m).replace(/^se/, "Se") + "." : p === "day" ? "Sale arriba en Hoy de todos tus clientes hasta la medianoche." : "Sale arriba en Hoy de todos tus clientes durante 7 días."}</span>
              </div>
              <div className="fv-slot-acts">
                <button type="button" className={m ? "fv-btn" : "fv-btn primary"} onClick={() => setNewFeat(p)}>{m ? "Cambiar" : "Subir"}</button>
                {m && <button type="button" className="fv-btn" disabled={feat.isPending} onClick={() => feat.mutate({ id: m.id, on: false })}>Quitar</button>}
              </div>
            </div>);
        })}
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
          {/* Toda la miniatura se puede tocar (29-oct): antes solo los vídeos privados tenían botón; los de YouTube eran un dibujo
              sin acción y por eso "unos abrían y otros no". Sin vídeo (la subida falló o sigue en curso) abre la edición para subirlo. */}
          <div className={`content-thumb ${m.kind === "video" ? "video" : "articulo"}`}>
            {m.kind === "video" && (m.poster || m.videoRef) && <span className="vposter" aria-hidden style={{ backgroundImage: `url("${m.poster ?? ytThumb(m.videoRef)}")` }} />}
            <button type="button" className="content-open" aria-label={m.kind === "video" ? (m.privateVideo || m.videoRef ? `Ver ${m.title}` : `Subir el vídeo de ${m.title}`) : `Abrir ${m.title}`}
              onPointerDown={() => m.privateVideo && prefetchPlay(`material=${m.id}`)}
              onClick={() => (m.kind !== "video" ? setEdit(m) : m.privateVideo ? setWatch(m) : m.videoRef ? setYt(m) : setEdit(m))}>
              {m.kind === "video" ? <span className="play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></span> : <svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>}
            </button>
            {m.kind === "video" && <span className="mat-src">{m.privateVideo ? <><Icon name="lock" size={10} stroke={2} /> Privado</> : m.videoRef ? "YouTube" : "Sin vídeo aún: toca para subirlo"}</span>}
            {m.kind === "video" && m.tier === "basic" && m.published && (m.privateVideo || m.videoRef) && <button className={`featured-toggle${m.featured ? " active" : ""}`} disabled={feat.isPending} title="Destacar en Hoy" aria-pressed={m.featured} aria-label={m.featured ? PERIOD[m.featuredPeriod] : "Destacar en Hoy"} onClick={() => setStar(m)}><svg viewBox="0 0 20 20"><path d={STAR} /></svg></button>}
          </div>
          <div className="content-body"><div className="content-title">{m.title}</div><div className="content-cat">{m.category}{m.tier === "full" ? " · Plan completo" : ""}{m.published ? "" : m.kind === "video" && !m.privateVideo && !m.videoRef ? " · Subiendo o sin vídeo" : " · Borrador"}{m.featured ? ` · ${PERIOD[m.featuredPeriod]}` : ""}</div>
            <div className="content-meta"><span className="content-date">{fmt(m.date)}</span><span className="content-views">Visto por {m.views}</span></div></div>
        </div>))}</div>
      {edit && <MaterialForm item={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {newFeat && <MaterialForm item={null} feature={newFeat} onClose={() => setNewFeat(null)} />}
      {watch && <BunnyModal param={`material=${watch.id}`} title={watch.title} sub="Vídeo privado" onClose={() => setWatch(null)} />}
      {yt?.videoRef && <VideoModal ytId={yt.videoRef} title={yt.title} sub="YouTube" onClose={() => setYt(null)} />}
      {star && <Modal title="Destacar en Hoy" sub={`“${star.title}” sale arriba en la pantalla Hoy de todos tus clientes. Puede haber un vídeo del día y uno de la semana a la vez.`} onClose={() => setStar(null)}>
        <div className="star-opts">
          <button type="button" className="star-opt" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: true, period: "day" }, { onSuccess: () => setStar(null) })}><b>Vídeo del día</b><span>Se ve solo hoy, hasta la medianoche.</span></button>
          <button type="button" className="star-opt" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: true, period: "week" }, { onSuccess: () => setStar(null) })}><b>Vídeo de la semana</b><span>Se ve 7 días. Ideal para saludar y contar qué viene esta semana.</span></button>
        </div>
        <div className="modal-actions">{star.featured && <button className="modal-btn ghost" disabled={feat.isPending} onClick={() => feat.mutate({ id: star.id, on: false }, { onSuccess: () => setStar(null) })}>Quitar destacado</button>}<button className="modal-btn ghost" onClick={() => setStar(null)}>Cancelar</button></div></Modal>}
      {rm && <Modal title="Eliminar contenido" sub={`“${rm.title}” dejará de verse para tus clientes y se borrará su conteo de vistas.${rm.privateVideo ? " El vídeo privado se borra de Bunny en las próximas horas." : ""}${rm.featured ? " También deja de estar destacado en Hoy." : ""}`} onClose={() => setRm(null)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(null)}>Cancelar</button><button className="modal-btn primary" disabled={del.isPending} onClick={() => del.mutate(rm.id, { onSuccess: () => setRm(null) })}>{del.isPending ? "Eliminando…" : "Eliminar"}</button></div></Modal>}
    </div>
  );
}
function MaterialForm({ item, feature, onClose }: { item: CoachMaterial | null; feature?: FeaturedPeriod; onClose: () => void }) {
  const ws = useWorkspaceId(), save = useSaveMaterial(ws), fileIn = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({ kind: item?.kind ?? (feature ? "video" : "article"), title: item?.title ?? "", category: item?.category ?? (feature ? "Motivación" : MAT_CATS[0]), body: item?.body ?? "", video: item?.videoRef ? `https://youtu.be/${item.videoRef}` : "", src: (item?.privateVideo || feature ? "private" : "youtube") as "youtube" | "private", tier: item?.tier ?? "basic", published: item?.published ?? true }), [err, setErr] = useState("");
  const [file, setFile] = useState<File | null>(null), [checking, setChecking] = useState(false), [poster, setPoster] = useState<string | null>(null), [prev, setPrev] = useState<string | null>(null);
  // Vista previa del vídeo antes de subirlo (pedido de Cristian, 29-oct): se ve en el formulario y se puede reproducir.
  useEffect(() => { if (!file) { setPrev(null); return; } const u = URL.createObjectURL(file); setPrev(u); return () => URL.revokeObjectURL(u); }, [file]);
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(""); };
  const pick = async (f: File | null) => {
    setErr(""); if (!f) return; if (!f.type.startsWith("video/")) return setErr("Elige un archivo de vídeo.");
    if (f.size > MAX_COACH_VIDEO_MB * 1024 * 1024) return setErr(`El vídeo pesa más de ${MAX_COACH_VIDEO_MB / 1000} GB.`);
    setChecking(true); const d = await videoDuration(f); setChecking(false);
    if (d != null && d > MAX_COACH_VIDEO_SECONDS) return setErr(`El vídeo dura más de ${MAX_COACH_VIDEO_SECONDS / 60} minutos.`);
    setFile(f); setPoster(null); void posterFromVideo(f).then(setPoster);
  };
  const submit = () => {
    if (!v.title.trim()) return setErr("Escribe un título.");
    const priv = v.kind === "video" && v.src === "private";
    const vid = v.kind === "video" && !priv ? youtubeId(v.video) : null;
    if (v.kind === "video" && !priv && !vid) return setErr("Pega un enlace de YouTube válido.");
    if (priv && !file && !item?.privateVideo) return setErr("Elige el vídeo que vas a subir.");
    if (v.kind === "article" && v.body.trim().length < 20) return setErr("El artículo es muy corto: escribe al menos una frase completa.");
    const input: MaterialInput = { id: item?.id, kind: v.kind, title: v.title, category: v.category, body: v.body, videoRef: vid ?? "", tier: feature ? "basic" : v.tier, published: feature ? true : v.published, file: priv ? file : null, keepPrivate: priv && !file, feature,
      poster: priv ? (file ? poster : undefined) : v.kind === "video" ? null : undefined };
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
            ? <div className="modal-field"><label htmlFor="mv">Enlace de YouTube</label><input id="mv" value={v.video} onChange={(e) => set({ video: e.target.value })} placeholder="https://youtu.be/..." />
                {youtubeId(v.video) && <div className="vprev"><img src={ytThumb(youtubeId(v.video))!} alt="Vista previa del vídeo de YouTube" /><span className="vprev-tag">Vista previa</span></div>}</div>
            : <div className="modal-field"><label htmlFor="mf">Vídeo privado</label>
                <input ref={fileIn} id="mf" type="file" accept="video/*" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                {prev ? <div className="vprev"><video src={prev} controls playsInline preload="metadata" /><span className="vprev-tag">Vista previa · aún no se sube</span></div>
                  : <button type="button" className="vpick" onClick={() => fileIn.current?.click()} disabled={checking}><Icon name="video" size={18} /><b>{checking ? "Revisando el vídeo…" : item?.privateVideo ? "Elegir otro vídeo" : "Elegir el vídeo"}</b><small>Hasta {MAX_COACH_VIDEO_SECONDS / 60} min. Primero lo ves aquí; se sube al guardar.</small></button>}
                {prev && <button type="button" className="fv-btn" style={{ marginTop: 8 }} onClick={() => fileIn.current?.click()}>Elegir otro</button>}
                <p className="field-hint">{file ? `${file.name.slice(0, 40)} · ${(file.size / 1048576).toFixed(0)} MB. Se sube en segundo plano: puedes seguir usando la app y se publica solo al terminar.` : item?.privateVideo ? "Ya tiene un vídeo privado. Elige otro solo si quieres reemplazarlo." : "Se sube en segundo plano: puedes seguir usando la app y se publica solo al terminar."}</p></div>}
        </>}
      {!feature && <><div className="modal-field"><label htmlFor="mx">Quién lo ve</label><select id="mx" value={v.tier} onChange={(e) => set({ tier: e.target.value as "basic" | "full" })}><option value="basic">Todos los planes con material educativo</option><option value="full">Solo plan completo (biblioteca completa)</option></select></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, margin: "6px 0 2px" }}><input type="checkbox" checked={v.published} onChange={(e) => set({ published: e.target.checked })} />Publicado (desmárcalo para guardarlo como borrador)</label></>}
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : feature ? (file ? "Subir y destacar" : "Publicar y destacar") : item ? "Guardar cambios" : "Publicar"}</button></div>
    </Modal>
  );
}
