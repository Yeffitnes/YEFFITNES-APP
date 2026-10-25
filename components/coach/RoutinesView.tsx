"use client";
import { useState } from "react";
import { youtubeId } from "@/lib/format";
import Link from "next/link";
import { useArchive, useExercises, useRoutines, useSaveRoutine, type Routine } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { RoutineCard } from "./RoutineCard";
import { RoutineForm } from "./RoutineForm";
type Item = { exercise_id: string; sets: number; reps: string; rest_seconds: number | null };
export function RoutinesView() {
  const { data, isPending, isError, refetch } = useRoutines(), { data: exs } = useExercises();
  const [edit, setEdit] = useState<Routine | "new" | null>(null);
  const list = data ?? [];
  return (
    <div>
      <CatalogTop tab="rutinas" sub={`${list.length} rutinas · colecciones reutilizables de ejercicios`} addLabel="Nueva rutina" onAdd={() => setEdit("new")} />
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar las rutinas. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay rutinas. Crea una con “Nueva rutina” juntando ejercicios de tu catálogo; luego se la asignarás a tus clientes.</p></div>}
      {list.map((r) => <RoutineCard key={r.id} name={r.name} hasVideo={r.items.some((i) => i.hasVideo)} onEdit={() => setEdit(r)}
        meta={[`${r.items.length} ejercicios`, r.minutes ? `${r.minutes} min aprox.` : null, r.category].filter(Boolean).join(" · ")}
        rows={r.items.map((i) => ({ name: i.name, sets: i.sets, reps: i.reps, rest: i.rest }))} />)}
      {edit && <RoutineModal r={edit === "new" ? null : edit} noExercises={!!exs && !exs.length} exercises={exs?.map((e) => ({ id: e.id, name: e.name })) ?? []} onClose={() => setEdit(null)} />}
    </div>
  );
}
function RoutineModal({ r, exercises, noExercises, onClose }: { r: Routine | null; exercises: { id: string; name: string }[]; noExercises: boolean; onClose: () => void }) {
  const save = useSaveRoutine(), archive = useArchive("routine_templates");
  const [name, setName] = useState(r?.name ?? ""), [cat, setCat] = useState(r?.category ?? ""), [min, setMin] = useState(r?.minutes ? String(r.minutes) : "");
  const [items, setItems] = useState<Item[]>(r?.items.map((i) => ({ exercise_id: i.exerciseId, sets: i.sets, reps: i.reps, rest_seconds: i.rest })) ?? []);
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false), [video, setVideo] = useState(r?.video ? `https://youtu.be/${r.video}` : "");
  const submit = () => {
    const ok = items.filter((i) => i.exercise_id && i.sets > 0 && i.reps.trim());
    if (!name.trim() || !ok.length) return setErr("Escribe un nombre y agrega al menos un ejercicio completo.");
    const vid = video.trim() ? youtubeId(video) : null;
    if (video.trim() && !vid) return setErr("Ese enlace de YouTube no es válido.");
    setErr(""); save.mutate({ id: r?.id, name: name.trim(), category: cat.trim(), minutes: Number(min) > 0 ? Number(min) : null, video: vid, items: ok }, { onSuccess: onClose });
  };
  return (
    <Modal wide title={r ? "Editar rutina" : "Nueva rutina"} sub="Junta ejercicios de tu catálogo con sus series y repeticiones." onClose={onClose}>
      {noExercises ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 16 }}>Primero crea algunos ejercicios en el catálogo. <Link href="/coach/catalogo/ejercicios" onClick={onClose} style={{ color: "var(--accent)", fontWeight: 700 }}>Ir a ejercicios</Link></p> : (
        <>
          <div className="modal-field"><label>Nombre</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tren superior completo" /></div>
          <div className="modal-row2"><div className="modal-field"><label>Tipo</label><input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Fuerza, HIIT…" /></div>
            <div className="modal-field"><label>Duración (min)</label><input type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} /></div></div>
          <div className="modal-field"><label>Vídeo de la rutina (YouTube, opcional)</label><input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/…" /><p className="modal-cap-hint">Lo ven todos los clientes con esta rutina. Para un cliente puedes subir uno propio desde su ficha.</p></div>
          <RoutineForm exercises={exercises} items={items} onChange={setItems} />
          {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{err}</p>}
          <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
          {r && (confirm
            ? <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setConfirm(false)}>No archivar</button><button className="modal-btn danger" disabled={archive.isPending} onClick={() => archive.mutate(r.id, { onSuccess: onClose })}>Sí, archivar</button></div>
            : <button className="modal-cap-hint" style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--danger)" }} onClick={() => setConfirm(true)}>Archivar esta rutina</button>)}
        </>)}
    </Modal>
  );
}
