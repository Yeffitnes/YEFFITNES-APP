"use client";
// 15-nov (2): tarjeta compacta con presencia. A la izquierda el cuadro del VÍDEO DE LA RUTINA (no de los ejercicios): con vídeo,
// la miniatura de YouTube con el botón rojo; sin vídeo, un cuadro punteado "Añadir vídeo" que abre la edición. En medio el nombre,
// y los datos (16-nov: sin etiquetas de músculos, Cristian no las quiere). Al desplegar: ejercicios, Editar y Eliminar.
import { useState } from "react";
import { CatalogActions } from "./CatalogActions";
import { ytThumb } from "@/lib/video-poster";
export type Row = { name: string; sets: number; reps: string; rest: number | null; image?: string | null; muscle?: string | null };
export function RoutineCard({ name, meta, video, rows, onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting?: boolean; name: string; meta: string; video: string | null; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const thumb = ytThumb(video);
  return (
    <div className={`cat-row${open ? " open" : ""}`}>
      <div className="cat-row-line">
        {thumb ? (
          <button type="button" className="cat-vid has" onClick={() => setOpen(!open)} aria-label={`Rutina ${name}, con vídeo`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" loading="lazy" /><span className="cat-play" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="cat-vid" onClick={onEdit} aria-label={`Añadir vídeo a ${name}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.5v9l7.5-4.5z" /></svg><small>+ Vídeo</small>
          </button>
        )}
        <button type="button" className="cat-row-head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="cat-row-main"><b>{name}</b><small>{meta}</small>
</span>
          <svg className="cat-chev" viewBox="0 0 10 8" fill="none" aria-hidden="true"><path d="M1 4h8M6 1l3 3-3 3" strokeLinecap="round" /></svg>
        </button>
      </div>
      {open && <div className="cat-row-body">
        {rows.map((r, i) => (
          <div key={i} className="ex-row-static"><div className="ex-row-name"><span className="ex-dot" />{r.name}</div><div className="ex-row-sets">{r.sets}×{r.reps}{r.rest != null ? ` · ${r.rest}s` : ""}</div></div>))}
        <CatalogActions what="rutina" name={name} onEdit={onEdit} onDelete={onDelete} busy={deleting} />
      </div>}
    </div>
  );
}
