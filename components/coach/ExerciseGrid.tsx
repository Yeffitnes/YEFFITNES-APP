"use client";
import { useState } from "react";
import Link from "next/link";
export type Ex = { id: string; name: string; category: string; muscle: string | null; equipment: string | null; difficulty: number; hasVideo: boolean; used: number };
const CATS: [string, string][] = [["all", "Todos"], ["upper", "Tren superior"], ["lower", "Tren inferior"], ["core", "Core"], ["cardio", "Cardio"], ["video", "Con vídeo"]];
export function ExerciseGrid({ items }: { items: Ex[] }) {
  const [f, setF] = useState("all"), [q, setQ] = useState("");
  const list = items.filter((e) => (f === "all" || (f === "video" ? e.hasVideo : e.category === f)) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio..." aria-label="Buscar ejercicio" /></div>
        {CATS.map(([k, t]) => <button key={k} onClick={() => setF(k)} className={`filter-chip${f === k ? " active" : ""}`}>{t}</button>)}
      </div>
      {!items.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay ejercicios. Crea el primero con “Nuevo ejercicio”: después los podrás usar en todas tus rutinas.</p></div>}
      {!!items.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún ejercicio coincide con ese filtro.</p></div>}
      <div className="ex-grid">{list.map((e) => (
        <Link key={e.id} href={`/coach/catalogo/ejercicios/${e.id}`} className="ex-card">
          <div className={`ex-thumb${e.hasVideo ? "" : " no-video"}`}>{e.hasVideo ? <div className="ex-thumb-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 24 24"><path d="M6 4l11 6-11 6V4z" /></svg>}</div>
          <div className="ex-body"><div className="ex-name">{e.name}</div><div className="ex-used">{e.used ? `Usado en ${e.used} ${e.used === 1 ? "rutina" : "rutinas"}` : "Sin usar aún"}</div>
            <div className="ex-tags">{e.muscle && <span className="ex-tag">{e.muscle}</span>}{e.equipment && <span className="ex-tag">{e.equipment}</span>}</div>
            <div className="ex-diff">{[1, 2, 3].map((n) => <span key={n} className={n <= e.difficulty ? "filled" : ""} />)}</div></div>
        </Link>))}</div>
    </>
  );
}
