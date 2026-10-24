"use client";
import { useState } from "react";
import Link from "next/link";
export type Row = { name: string; sets: number; reps: string; rest: number | null };
export function RoutineCard({ id, name, meta, hasVideo, rows }: { id: string; name: string; meta: string; hasVideo: boolean; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`routine-card${open ? " expanded" : ""}`} onClick={() => setOpen(!open)}>
      <div className="routine-card-head">
        <div className={`routine-mini-thumb${hasVideo ? "" : " no-video"}`}>{hasVideo ? <div className="play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg>}</div>
        <div className="routine-info"><div className="routine-name">{name}</div><div className="routine-meta">{meta}</div></div>
        <Link href={`/coach/catalogo/rutinas/${id}`} onClick={(e) => e.stopPropagation()} className="routine-used" style={{ textDecoration: "underline" }}>Editar</Link>
        <svg className="routine-chev" viewBox="0 0 10 8" fill="none"><path d="M1 4h8M6 1l3 3-3 3" strokeLinecap="round" /></svg>
      </div>
      <div className="routine-detail">{rows.map((r, i) => (
        <div key={i} className="ex-row-static"><div className="ex-row-name"><span className="ex-dot" />{r.name}</div><div className="ex-row-sets">{r.sets}×{r.reps}{r.rest != null ? ` · ${r.rest}s desc.` : ""}</div></div>))}</div>
    </div>
  );
}
