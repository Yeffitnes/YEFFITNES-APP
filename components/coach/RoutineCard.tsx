"use client";
// 15-nov: tarjeta compacta. Cerrada muestra nombre y datos; al desplegarla salen los ejercicios y, abajo, Editar y Eliminar.
// La etiqueta "Vídeo" sale solo si la RUTINA tiene su propio vídeo (antes la miniatura se encendía si algún ejercicio tenía vídeo).
import { useState } from "react";
import { CatalogActions } from "./CatalogActions";
export type Row = { name: string; sets: number; reps: string; rest: number | null };
export function RoutineCard({ name, meta, hasVideo, rows, onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting?: boolean; name: string; meta: string; hasVideo: boolean; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`cat-row${open ? " open" : ""}`}>
      <button type="button" className="cat-row-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="cat-row-main"><b>{name}{hasVideo && <em className="cat-tag">Vídeo</em>}</b><small>{meta}</small></span>
        <svg className="cat-chev" viewBox="0 0 10 8" fill="none" aria-hidden="true"><path d="M1 4h8M6 1l3 3-3 3" strokeLinecap="round" /></svg>
      </button>
      {open && <div className="cat-row-body">
        {rows.map((r, i) => (
          <div key={i} className="ex-row-static"><div className="ex-row-name"><span className="ex-dot" />{r.name}</div><div className="ex-row-sets">{r.sets}×{r.reps}{r.rest != null ? ` · ${r.rest}s` : ""}</div></div>))}
        <CatalogActions what="rutina" name={name} onEdit={onEdit} onDelete={onDelete} busy={deleting} />
      </div>}
    </div>
  );
}
