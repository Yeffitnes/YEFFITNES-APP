"use client";
import { useEffect, useRef, useState } from "react";
import { useArchive, useExercises, useSaveExercise, type Ex } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { youtubeId } from "@/lib/format";
import { EQUIPMENT, MUSCLES, equipOf, exImage, muscleOf, norm, options } from "@/lib/exmeta";
import { ExPic } from "@/components/ExPic";
import { Icon } from "@/components/ui/Icon";
import { uploadExerciseImage } from "@/lib/exercise-image";
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
        <FilterDrop label="Músculo" value={mu} opts={muOpts} onPick={setMu} />
        <FilterDrop label="Equipo" value={eq} opts={eqOpts} onPick={setEq} />
        <span className="ex-count">{list.length} de {items.length}</span>
        {filtered && <button type="button" className="ex-clear" onClick={() => { setF("all"); setMu(""); setEq(""); setQ(""); }}>Quitar filtros</button>}
      </div>}
      {isPending && <Skeleton />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los ejercicios. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !items.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay ejercicios. Crea el primero con “Nuevo ejercicio”: después los podrás usar en todas tus rutinas.</p></div>}
      {data && !!items.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún ejercicio coincide con ese filtro.</p></div>}
      <div className="ex-grid">{list.map((e) => (
        <div key={e.id} className="ex-card" role="button" tabIndex={0} onClick={() => setEdit(e)} onKeyDown={(k) => k.key === "Enter" && setEdit(e)}>
          <div className={`ex-thumb${e.videoRef || e.image ? "" : " no-video"}${e.image ? " has-pic" : ""}`}><ExPic image={e.image} name={e.name} size={180} className="cover" />{e.videoRef ? <div className="ex-thumb-play"><svg viewBox="0 0 20 20"><path d="M6 4l11 6-11 6V4z" /></svg></div> : !e.image && <svg viewBox="0 0 24 24"><path d="M6 4l11 6-11 6V4z" /></svg>}</div>
          <div className="ex-body"><div className="ex-name">{e.name}</div><div className="ex-used">{e.used ? `Usado en ${e.used} ${e.used === 1 ? "rutina" : "rutinas"}` : "Sin usar aún"}</div>
            <div className="ex-tags">{e.muscle && <span className="ex-tag">{e.muscle}</span>}{e.equipment && <span className="ex-tag">{e.equipment}</span>}</div>
            <div className="ex-diff">{[1, 2, 3].map((n) => <span key={n} className={n <= e.difficulty ? "filled" : ""} />)}</div></div>
        </div>))}</div>
      {edit && <ExerciseModal ex={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
// Filtro desplegable con el mismo estilo de los chips (pedido de Cristian, 29-oct: los selectores nativos se veían feos).
// Cerrado: "Músculo" con flecha. Elegido: "Pecho" en negro con brillo rojo y una × para quitarlo. Abierto: las opciones con su conteo.
function FilterDrop({ label, value, opts, onPick }: { label: string; value: string; opts: { v: string; n: number }[]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }, esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("touchstart", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (v: string) => { onPick(v); setOpen(false); };
  return (
    <div className="fdrop" ref={box}>
      <div className={`fdrop-btn${value ? " on" : ""}`}>
        <button type="button" className="fdrop-main" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((x) => !x)}><span className="fdrop-lbl">{value || label}</span>{!value && <Icon name="down" size={12} />}</button>
        {value && <button type="button" className="fdrop-x" aria-label={`Quitar filtro de ${label.toLowerCase()}`} onClick={() => pick("")}><Icon name="close" size={11} stroke={2.4} /></button>}
      </div>
      {open && <div className="fdrop-pop" role="listbox" aria-label={label}>
        <div className="fdrop-head">{label}</div>
        <button type="button" role="option" aria-selected={!value} className={`fdrop-opt${!value ? " on" : ""}`} onClick={() => pick("")}>Todos</button>
        {opts.map((o) => <button key={o.v} type="button" role="option" aria-selected={value === o.v} className={`fdrop-opt${value === o.v ? " on" : ""}`} onClick={() => pick(o.v)}>{o.v}<b>{o.n}</b></button>)}
        {!opts.length && <p className="fdrop-empty">No hay opciones con este filtro.</p>}
      </div>}
    </div>
  );
}
function ExerciseModal({ ex, onClose }: { ex: Ex | null; onClose: () => void }) {
  const save = useSaveExercise(useWorkspaceId()), archive = useArchive("exercises");
  const [v, setV] = useState({ name: ex?.name ?? "", category: ex?.category ?? "other", muscle: ex?.muscle ?? "", equipment: ex?.equipment ?? "", difficulty: ex?.difficulty ?? 1, instructions: ex?.instructions ?? "", video: ex?.videoRef ? `https://youtu.be/${ex.videoRef}` : "", image: ex?.image ?? null as string | null, sets: ex?.suggSets ? String(ex.suggSets) : "", reps: ex?.suggReps ?? "" });
  const ws = useWorkspaceId(), [up, setUp] = useState(false);
  const pickImg = async (f: File | null) => { if (!f) return; setErr(""); setUp(true); try { set({ image: await uploadExerciseImage(ws, f) }); } catch { setErr("No pudimos subir la imagen. Prueba con otra foto (JPG o PNG)."); } finally { setUp(false); } };
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false);
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });
  const submit = () => {
    if (!v.name.trim()) return setErr("Escribe el nombre del ejercicio.");
    const vid = v.video.trim() ? youtubeId(v.video) : null;
    if (v.video.trim() && !vid) return setErr("Ese enlace de YouTube no es válido.");
    const ss = v.sets.trim() ? Number(v.sets) : null; if (ss != null && !(ss >= 1 && ss <= 10)) return setErr("Las series sugeridas van de 1 a 10.");
    setErr(""); save.mutate({ id: ex?.id, name: v.name.trim(), category: v.category, muscle: v.muscle.trim(), equipment: v.equipment.trim(), difficulty: v.difficulty, instructions: v.instructions.trim(), videoRef: vid, image: v.image, suggSets: ss, suggReps: v.reps }, { onSuccess: onClose });
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
      <div className="modal-row2">
        {F("Series sugeridas", <input inputMode="numeric" value={v.sets} onChange={(e) => set({ sets: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} placeholder="Ej. 3" />)}
        {F("Repeticiones sugeridas", <input value={v.reps} maxLength={24} onChange={(e) => set({ reps: e.target.value })} placeholder="Ej. 8-12 o 30s" />)}
      </div>
      <div className="modal-field"><label>Imagen del ejercicio</label>
        <div className="exm-img">
          {exImage(v.image) ? <ExPic image={v.image} name={v.name || "Ejercicio"} size={88} className="exm-prev" /> : <div className="exm-empty">Sin imagen</div>}
          <div className="exm-acts">
            <label className="filter-chip" style={{ cursor: up ? "wait" : "pointer" }}>{up ? "Subiendo…" : v.image ? "Cambiar imagen" : "Subir imagen"}<input type="file" accept="image/*" hidden disabled={up} onChange={(e) => { void pickImg(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>
            {v.image && <button type="button" className="filter-chip" onClick={() => set({ image: null })}>Quitar</button>}
            <span className="exm-hint">Cuadrada, con el ejercicio bien visible. La app la reduce a 360 px.</span>
          </div>
        </div></div>
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
