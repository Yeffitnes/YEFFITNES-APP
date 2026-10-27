"use client";
import { useState } from "react";
import Link from "next/link";
import { useMaterialList, useOpenMaterial, useMe, type MaterialItem, type MaterialOpen } from "@/lib/queries";
import { Skeleton } from "@/components/ui/Modal";
import { VideoModal } from "./VideoModal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { upgradeLink } from "@/lib/features";
import { PendingSection } from "./LockedPanel";
import { useProfile } from "@/components/Providers";
import { Icon } from "@/components/ui/Icon";
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
export function MaterialClientView() {
  const { data, isPending, isError, refetch } = useMaterialList(), open = useOpenMaterial(), { profileId } = useProfile(), me = useMe(profileId);
  const [q, setQ] = useState(""), [f, setF] = useState<"all" | "article" | "video">("all"), [shown, setShown] = useState<MaterialOpen | null>(null), [locked, setLocked] = useState<MaterialItem | null>(null);
  const all = data ?? [], feat = all.find((m) => m.featured && m.unlocked);
  const list = all.filter((m) => (f === "all" || m.kind === f) && m.title.toLowerCase().includes(q.trim().toLowerCase()));
  const go = (m: MaterialItem) => { if (!m.unlocked) return setLocked(m); open.mutate(m.id, { onSuccess: setShown }); };
  const lockLink = upgradeLink("education_full");
  if (me.data?.status === "pending") return <PendingSection eyebrow="Material" title="Material de Jeff" panels={[
    { tag: "Vídeo", title: "Técnica de ejercicios", sub: "Cómo hacer cada movimiento bien, explicado por Jeff." },
    { tag: "Artículo", title: "Guías y consejos", sub: "Lo que necesitas saber para entrenar y comer mejor." },
    { tag: "Vídeo", title: "Vídeos de Jeff", sub: "Mensajes y clases que Jeff publica para sus clientes." },
  ]} />;
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Material educativo</div><h1>Aprende con tu coach</h1><p className="greeting-sub">{data ? `${all.length} publicacion${all.length === 1 ? "" : "es"} para acompañar tu proceso` : "Cargando…"}</p></div></div>
      {feat && <button className="featured-video-card" style={{ border: 0, width: "100%", textAlign: "left", font: "inherit" }} onClick={() => go(feat)}>
        <div className="fv-text"><div className="fv-tag">{feat.featuredPeriod === "day" ? "Vídeo del día" : "Vídeo de la semana"}</div><div className="fv-title">{feat.title}</div><div className="fv-author"><span className="fv-avatar">J</span>Tu coach</div></div>
        <div className="fv-thumb"><div className="fv-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div></div></button>}
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input type="text" placeholder="Buscar contenido..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contenido" /></div>
        {([["all", "Todos"], ["article", "Artículos"], ["video", "Vídeos"]] as const).map(([k, t]) => <button key={k} className={`filter-chip${f === k ? " active" : ""}`} onClick={() => setF(k)}>{t}</button>)}
      </div>
      {isPending && <Skeleton rows={3} />}
      {isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el material. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
      {data && !all.length && <p className="empty-note">Tu coach aún no ha publicado material. Pronto verás aquí artículos y vídeos.</p>}
      {data && !!all.length && !list.length && <p className="empty-note">Nada coincide con tu búsqueda.</p>}
      <div className="content-grid">{list.map((m) => (
        <button key={m.id} className="content-card" style={{ textAlign: "left", font: "inherit", padding: 0 }} disabled={open.isPending} onClick={() => go(m)} aria-label={m.unlocked ? m.title : `${m.title} (no incluido en tu plan)`}>
          <div className={`content-thumb ${m.kind === "video" ? "video" : "articulo"}`} style={m.unlocked ? undefined : { filter: "saturate(.4)" }}>
            {m.isNew && m.unlocked && <div className="content-new-tag">Nuevo</div>}
            {!m.unlocked && <div className="content-new-tag" style={{ background: "var(--text)" }}><Icon name="lock" size={11} /> Plan completo</div>}
            {m.kind === "video" ? <div className="play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 24 24"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4z" /></svg>}
          </div>
          <div className="content-body"><div className="content-title">{m.title}</div><div className="content-cat">{m.category}</div><div className="content-date">{fmt(m.date)}</div></div>
        </button>))}</div>
      {shown?.kind === "video" && shown.videoRef && <VideoModal ytId={shown.videoRef} title={shown.title} sub={shown.category} onClose={() => setShown(null)} />}
      {shown?.kind === "video" && !shown.videoRef && shown.privateVideo && <BunnyModal param={`material=${shown.id}`} title={shown.title} sub={shown.category} onClose={() => setShown(null)} />}
      {shown?.kind === "article" && <div className="read-modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && setShown(null)}>
        <div className="read-modal" role="dialog" aria-modal="true" aria-label={shown.title}>
          <button className="read-modal-close" aria-label="Cerrar" onClick={() => setShown(null)}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
          <div className="read-modal-cat">{shown.category}</div><div className="read-modal-title">{shown.title}</div><div className="read-modal-date">{fmt(shown.date)}</div>
          <div className="read-modal-body" style={{ whiteSpace: "pre-wrap" }}>{shown.body}</div></div></div>}
      {locked && <div className="read-modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && setLocked(null)}>
        <div className="read-modal" role="dialog" aria-modal="true" aria-label="Contenido no incluido">
          <button className="read-modal-close" aria-label="Cerrar" onClick={() => setLocked(null)}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
          <div className="read-modal-cat"><Icon name="lock" size={12} /> No incluido en tu plan</div><div className="read-modal-title">{locked.title}</div>
          <div className="read-modal-body">Este contenido forma parte de la biblioteca completa. Habla con tu coach para mejorar tu plan.</div>
          <Link className="read-modal-download" href={lockLink} style={{ textDecoration: "none", display: "inline-flex" }}>Hablar con tu coach</Link></div></div>}
    </>
  );
}
