"use client";
// Programas (pedido de Cristian, 30-oct, noche): una semana tipo (qué rutina va cada día) con duración en semanas.
// Se asigna a un cliente con un toque desde su ficha → Entrenamiento → "Asignar programa".
import { useState } from "react";
import Link from "next/link";
import { useRoutines } from "@/lib/queries";
import { useArchiveProgram, usePrograms, useSaveProgram, type Program } from "@/lib/extras";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";

export const DAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export function ProgramsView() {
  const q = usePrograms(), [edit, setEdit] = useState<Program | "new" | null>(null);
  const list = q.data ?? [];
  return (
    <div>
      <CatalogTop tab="programas" sub={`${list.length} programa${list.length === 1 ? "" : "s"} · semanas completas listas para asignar`} addLabel="Nuevo programa" onAdd={() => setEdit("new")} />
      {q.isPending && <Skeleton rows={3} />}
      {q.isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los programas. <button className="filter-chip" onClick={() => q.refetch()}>Reintentar</button></p></div>}
      {q.data === null && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Los programas se activan cuando se corra la migración 0043 en Supabase.</p></div>}
      {q.data && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>Un programa es una semana completa: eliges qué rutina va cada día y cuántas semanas dura. Después se lo asignas a un cliente con un toque desde su ficha (Entrenamiento → “Asignar programa”) y queda con toda su semana armada.</p></div>}
      <div className="prg-list">{list.map((p) => (
        <button key={p.id} type="button" className="card prg-card" onClick={() => setEdit(p)}>
          <div className="card-tag">{p.weeks} semana{p.weeks === 1 ? "" : "s"} · {p.days.length} día{p.days.length === 1 ? "" : "s"} de entreno</div>
          <div className="card-title" style={{ fontSize: 16 }}>{p.name}</div>
          <div className="prg-days">{DAYS_SHORT.map((d, i) => { const x = p.days.find((y) => y.weekday === i + 1); return <span key={d} className={`prg-day${x ? " on" : ""}`}><b>{d}</b><small>{x ? x.routine : "Descanso"}</small></span>; })}</div>
          {p.notes && <p className="card-meta" style={{ marginTop: 8 }}>{p.notes}</p>}
        </button>))}</div>
      {edit && <ProgramModal p={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
function ProgramModal({ p, onClose }: { p: Program | null; onClose: () => void }) {
  const routines = useRoutines(), save = useSaveProgram(), archive = useArchiveProgram();
  const [name, setName] = useState(p?.name ?? ""), [weeks, setWeeks] = useState(p?.weeks ?? 4), [notes, setNotes] = useState(p?.notes ?? ""), [err, setErr] = useState(""), [confirm, setConfirm] = useState(false);
  const [days, setDays] = useState<Record<number, string>>(() => Object.fromEntries((p?.days ?? []).map((d) => [d.weekday, d.templateId])));
  const submit = () => {
    const list = Object.entries(days).filter(([, t]) => !!t).map(([w, t]) => ({ weekday: Number(w), template_id: t }));
    if (!name.trim()) return setErr("Ponle un nombre al programa.");
    if (!list.length) return setErr("Elige la rutina de al menos un día.");
    setErr(""); save.mutate({ id: p?.id, name: name.trim(), weeks, notes, days: list }, { onSuccess: onClose });
  };
  return (
    <Modal wide title={p ? "Editar programa" : "Nuevo programa"} sub="Elige la rutina de cada día. Los días sin rutina quedan de descanso." onClose={onClose}>
      {routines.data && !routines.data.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Primero crea rutinas en el catálogo. <Link href="/coach/catalogo/rutinas" onClick={onClose} style={{ color: "var(--accent)", fontWeight: 700 }}>Ir a rutinas</Link></p> : <>
        <div className="modal-field"><label htmlFor="prg-name">Nombre</label><input id="prg-name" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hipertrofia principiante, 4 días" /></div>
        <div className="modal-row2">
          <div className="modal-field"><label htmlFor="prg-weeks">Duración</label><select id="prg-weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i + 1}>{i + 1} semana{i ? "s" : ""}</option>)}</select></div>
          <div className="modal-field"><label htmlFor="prg-notes">Nota (solo para ti)</label><input id="prg-notes" maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Para quien recién empieza" /></div>
        </div>
        <p className="modal-cap-hint">Al asignarlo, la “próxima revisión” del plan queda al final de estas semanas: te aparecerá en “Planes por revisar”.</p>
        <div className="prg-edit">{DAYS_LONG.map((d, i) => (
          <div key={d} className="prg-edit-row"><label htmlFor={`prg-d${i}`}>{d}</label>
            <select id={`prg-d${i}`} value={days[i + 1] ?? ""} onChange={(e) => setDays({ ...days, [i + 1]: e.target.value })}>
              <option value="">Descanso</option>{(routines.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>))}</div>
        {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{err}</p>}
        <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
        {p && (confirm
          ? <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setConfirm(false)}>No archivar</button><button className="modal-btn danger" disabled={archive.isPending} onClick={() => archive.mutate(p.id, { onSuccess: onClose })}>Sí, archivar</button></div>
          : <button className="modal-cap-hint" style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--danger)" }} onClick={() => setConfirm(true)}>Archivar este programa (los clientes que ya lo tienen no cambian)</button>)}
      </>}
    </Modal>
  );
}
