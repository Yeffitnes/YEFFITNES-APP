"use client";
import { useState } from "react";
import { useArchive, useExercises, useSaveExercise, type Ex } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { youtubeId } from "@/lib/format";
import { EQUIPMENT, MUSCLES, equipOf, muscleOf, norm, options } from "@/lib/exmeta";
const CATS: [string, string][] = [["all", "Todos"], ["upper", "Tren superior"], ["lower", "Tren inferior"], ["core", "Core"], ["cardio", "Cardio"], ["video", "Con vídeo"]];
export function ExercisesView() {
  const { data, isPending, isError, refetch } = useExercises();
  const [f, setF] = useState("all"), [q, setQ] = useState(""), [mu, setMu] = useState(""), [eq, setEq] = useState("");
  const [edit, setEdit] = useState<Ex | "new" | null>(null);
  const items = data ?? [];
  // Filtros (28-oct): zona + músculo + equipo + búsqueda, combinables. Así Jeff ve rápido qué tiene para cada grupo al armar rutinas.
  const byZone = items.filter((e) => f === "all" || (f === "video" ? !!e.videoRef : e.category === f));
  const muOpts = options(byZone.map((e) => muscleOf(e.muscle)), MUSCLES), eqOpts = options(byZone.map((e) => equipOf(e.equipment)), EQUIPMENT);
  const list = byZone.filter((e) => (!mu || muscleOf(e.muscle) === mu) && (!eq || equipOf(e.equipment) === eq)
    && (norm(e.name).includes(norm(q)) || norm(e.muscle).includes(norm(q))));
  const filtered = f !== "all" || !!mu || !!eq || !!q.trim();
  return (
    <div>
      <CatalogTop tab="ejercicios" sub={`${items.length} ejercicios · contenido reutilizable en todas las rutinas`} addLabel="Nuevo ejercicio" onAdd={() => setEdit("new")} />
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o músculo..." aria-label="Buscar ejercicio" /></div>
        {CATS.map(([k, t]) => <button key={k} onClick={() => { setF(k); setMu(""); setEq(""); }} className={`filter-chip${f === k ? " active" : ""}`}>{t}</button>)}
      </div>
      {!!items.length && <div className="ex-filters">
        <label className="ex-select"><select aria-label="Filtrar por músculo" value={mu} onChange={(e) => setMu(e.target.value)}><option value="">Todos los músculos</option>{muOpts.map((o) => <option key={o.v} value={o.v}>{o.v} ({o.n})</option>)}</select></label>
        <label className="ex-select"><select aria-label="Filtrar por equipo" value={eq} onChange={(e) => setEq(e.target.value)}><option value="">Todo el equipo</option>{eqOpts.map((o) => <option key={o.v} value={o.v}>{o.v} ({o.n})</option>)}</select></label>
        <span className="ex-count">{list.length} de {items.length}</span>
        {filtered && <button type="button" className="ex-clear" onClick={() => { setF("all"); setMu(""); setEq(""); setQ(""); }}>Quitar filtros</button>}
      </div>}
      {isPending && <Skeleton />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los ejercicios. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !items.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay ejercicios. Crea el primero con “Nuevo ejercicio”: después los podrás usar en todas tus rutinas.</p></div>}
      {data && !!items.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún ejercicio coincide con ese filtro.</p></div>}
      <div className="ex-grid">{list.map((e) => (
        <div key={e.id} className="ex-card" role="button" tabIndex={0} onClick={() => setEdit(e)} onKeyDown={(k) => k.key === "Enter" && setEdit(e)}>
          <div className={`ex-thumb${e.videoRef ? "" : " no-video"}`}>{e.videoRef ? <div className="ex-thumb-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : <svg viewBox="0 0 24 24"><path d="M6 4l11 6-11 6V4z" /></svg>}</div>
          <div className="ex-body"><div className="ex-name">{e.name}</div><div className="ex-used">{e.used ? `Usado en ${e.used} ${e.used === 1 ? "rutina" : "rutinas"}` : "Sin usar aún"}</div>
            <div className="ex-tags">{e.muscle && <span className="ex-tag">{e.muscle}</span>}{e.equipment && <span className="ex-tag">{e.equipment}</span>}</div>
            <div className="ex-diff">{[1, 2, 3].map((n) => <span key={n} className={n <= e.difficulty ? "filled" : ""} />)}</div></div>
        </div>))}</div>
      {edit && <ExerciseModal ex={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
function ExerciseModal({ ex, onClose }: { ex: Ex | null; onClose: () => void }) {
  const save = useSaveExercise(useWorkspaceId()), archive = useArchive("exercises");
  const [v, setV] = useState({ name: ex?.name ?? "", category: ex?.category ?? "other", muscle: ex?.muscle ?? "", equipment: ex?.equipment ?? "", difficulty: ex?.difficulty ?? 1, instructions: ex?.instructions ?? "", video: ex?.videoRef ? `https://youtu.be/${ex.videoRef}` : "" });
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false);
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });
  const submit = () => {
    if (!v.name.trim()) return setErr("Escribe el nombre del ejercicio.");
    const vid = v.video.trim() ? youtubeId(v.video) : null;
    if (v.video.trim() && !vid) return setErr("Ese enlace de YouTube no es válido.");
    setErr(""); save.mutate({ id: ex?.id, name: v.name.trim(), category: v.category, muscle: v.muscle.trim(), equipment: v.equipment.trim(), difficulty: v.difficulty, instructions: v.instructions.trim(), videoRef: vid }, { onSuccess: onClose });
  };
  const F = (label: string, node: React.ReactNode) => <div className="modal-field"><label>{label}</label>{node}</div>;
  return (
    <Modal title={ex ? "Editar ejercicio" : "Nuevo ejercicio"} sub="Se podrá usar en todas tus rutinas." onClose={onClose}>
      {F("Nombre", <input autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Ej. Press banca" />)}
      <div className="modal-row2">
        {F("Zona", <select value={v.category} onChange={(e) => set({ category: e.target.value })}><option value="upper">Tren superior</option><option value="lower">Tren inferior</option><option value="core">Core</option><option value="cardio">Cardio</option><option value="other">Otro</option></select>)}
        {F("Dificultad", <select value={v.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}><option value={1}>Baja</option><option value={2}>Media</option><option value={3}>Alta</option></select>)}
      </div>
      <div className="modal-row2">
        {F("Músculo principal", <><input list="ex-muscles" value={v.muscle} onChange={(e) => set({ muscle: e.target.value })} placeholder="Ej. Pecho" /><datalist id="ex-muscles">{MUSCLES.map((m) => <option key={m} value={m} />)}</datalist></>)}
        {F("Equipo", <><input list="ex-equip" value={v.equipment} onChange={(e) => set({ equipment: e.target.value })} placeholder="Ej. Barra" /><datalist id="ex-equip">{EQUIPMENT.map((m) => <option key={m} value={m} />)}</datalist></>)}
      </div>
      {F("Vídeo de YouTube (opcional)", <input value={v.video} onChange={(e) => set({ video: e.target.value })} placeholder="https://youtu.be/..." />)}
      {F("Instrucciones (opcional)", <textarea value={v.instructions} onChange={(e) => set({ instructions: e.target.value })} />)}
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
      {ex && (confirm
        ? <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setConfirm(false)}>No archivar</button><button className="modal-btn danger" disabled={archive.isPending} onClick={() => archive.mutate(ex.id, { onSuccess: onClose })}>Sí, archivar</button></div>
        : <button className="modal-cap-hint" style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--danger)" }} onClick={() => setConfirm(true)}>Archivar este ejercicio</button>)}
    </Modal>
  );
}
