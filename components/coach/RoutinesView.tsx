"use client";
import { useState } from "react";
import { CatalogVideoField, initVideoSrc, readVideoSrc } from "./CatalogVideoField";
import Link from "next/link";
import { useArchive, useExercises, useRoutines, useSaveRoutine, type Routine } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { RoutineCard } from "./RoutineCard";
import { RoutineForm } from "./RoutineForm";
type Item = { exercise_id: string; sets: number; reps: string; rest_seconds: number | null };
export function RoutinesView() {
  const { data, isPending, isError, refetch } = useRoutines(), { data: exs } = useExercises(), del = useArchive("routine_templates");
  const [edit, setEdit] = useState<Routine | "new" | null>(null);
  const list = data ?? [];
  return (
    <div>
      <CatalogTop tab="rutinas" sub={`${list.length} rutinas · colecciones reutilizables de ejercicios`} addLabel="Nueva rutina" onAdd={() => setEdit("new")} />
      {isPending && <Skeleton rows={3} />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar las rutinas. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Aún no hay rutinas. Crea una con “Nueva rutina” juntando ejercicios de tu catálogo; luego se la asignarás a tus clientes.</p></div>}
      <div className="cat-list">{list.map((r) => <RoutineCard key={r.id} name={r.name} video={r.video} uploaded={!!r.videoId} poster={r.poster} onEdit={() => setEdit(r)} onDelete={() => del.mutate(r.id)} deleting={del.isPending && del.variables === r.id}
        meta={[`${r.items.length} ejercicio${r.items.length === 1 ? "" : "s"}`, r.minutes ? `${r.minutes} min` : null, r.category].filter(Boolean).join(" · ")}
        rows={r.items.map((i) => ({ name: i.name, sets: i.sets, reps: i.reps, rest: i.rest, image: i.image, muscle: i.muscle }))} />)}</div>
      {edit && <RoutineModal r={edit === "new" ? null : edit} noExercises={!!exs && !exs.length} exercises={exs ?? []} onClose={() => setEdit(null)} />}
    </div>
  );
}
// 22-nov: también se abre desde la ficha de un cliente ("Crear rutina nueva" en un día, o "Guardar como rutina" con los ajustes
// de ese día): onSaved recibe el id para asignarla enseguida; initial rellena nombre y ejercicios. Siempre queda en Rutinas.
export function RoutineModal({ r, exercises, noExercises, onClose, onSaved, initial, sub }: { r: Routine | null; exercises: { id: string; name: string; muscle?: string | null; suggSets?: number | null; suggReps?: string | null }[]; noExercises: boolean; onClose: () => void; onSaved?: (id: string) => void; initial?: { name: string; minutes?: number | null; items: Item[] }; sub?: string }) {
  const save = useSaveRoutine(), archive = useArchive("routine_templates");
  const [name, setName] = useState(r?.name ?? initial?.name ?? ""), [cat, setCat] = useState(r?.category ?? ""), [min, setMin] = useState(r?.minutes ? String(r.minutes) : initial?.minutes ? String(initial.minutes) : "");
  const [items, setItems] = useState<Item[]>(r?.items.map((i) => ({ exercise_id: i.exerciseId, sets: i.sets, reps: i.reps, rest_seconds: i.rest })) ?? initial?.items ?? []);
  const [err, setErr] = useState(""), [confirm, setConfirm] = useState(false), [video, setVideo] = useState(() => initVideoSrc(r?.video, !!r?.videoId));
  const submit = () => {
    const ok = items.filter((i) => i.exercise_id && i.sets > 0 && i.reps.trim());
    if (!name.trim() || !ok.length) return setErr("Escribe un nombre y agrega al menos un ejercicio completo.");
    const v = readVideoSrc(video, !!r?.videoId); if (v.error) return setErr(v.error);
    setErr(""); save.mutate({ id: r?.id, name: name.trim(), category: cat.trim(), minutes: Number(min) > 0 ? Number(min) : null, video: v.videoRef, file: v.file, keepUploaded: v.keepUploaded, hadUploaded: !!r?.videoId, items: ok }, { onSuccess: (id) => { onClose(); if (id && onSaved) onSaved(id); } });
  };
  return (
    <Modal wide title={r ? "Editar rutina" : "Nueva rutina"} sub={sub ?? "Junta ejercicios de tu catálogo con sus series y repeticiones."} onClose={onClose}>
      {noExercises ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 16 }}>Primero crea algunos ejercicios en el catálogo. <Link href="/coach/catalogo/ejercicios" onClick={onClose} style={{ color: "var(--accent)", fontWeight: 700 }}>Ir a ejercicios</Link></p> : (
        <>
          <div className="modal-field"><label>Nombre</label><input aria-label="Nombre" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tren superior completo" /></div>
          <div className="modal-row2"><div className="modal-field"><label>Tipo</label><input aria-label="Tipo" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Fuerza, HIIT…" /></div>
            <div className="modal-field"><label>Duración (min)</label><input aria-label="Duración" type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} /></div></div>
          <CatalogVideoField label="Vídeo de la rutina (opcional)" value={video} onChange={setVideo} uploaded={!!r?.videoId} playParam={r?.videoId ? `routine=${r.id}&v=${r.videoId}` : null} onError={setErr}
            hint="Lo ven todos los clientes con esta rutina, también quienes ya la tienen en su plan. Para un cliente puedes subir uno propio desde su ficha." />
          <RoutineForm exercises={exercises} items={items} onChange={setItems} />
          {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{err}</p>}
          <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
          {r && (confirm
            ? <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setConfirm(false)}>No eliminar</button><button className="modal-btn danger" disabled={archive.isPending} onClick={() => archive.mutate(r.id, { onSuccess: onClose })}>Sí, eliminar</button></div>
            : <button className="modal-cap-hint" style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--danger)" }} onClick={() => setConfirm(true)}>Eliminar esta rutina (los clientes que ya la tienen no cambian)</button>)}
        </>)}
    </Modal>
  );
}
