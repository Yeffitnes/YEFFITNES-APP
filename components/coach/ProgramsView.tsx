"use client";
// Programas (pedido de Cristian, 30-oct, noche): semanas completas listas para asignar.
// 15-nov: tarjetas compactas que se despliegan (Editar y Eliminar adentro) y semanas distintas: un programa de 4 semanas puede
// repetir la misma semana o tener otra rutina cada semana (0056). Al pasar a "distinta cada semana" todas las semanas empiezan
// como copia de la semana 1, para no armar cada una desde cero.
import { useState } from "react";
import Link from "next/link";
import { useRoutines } from "@/lib/queries";
import { useArchiveProgram, usePrograms, useSaveProgram, type Program } from "@/lib/extras";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { CatalogTop } from "./CatalogTop";
import { CatalogActions } from "./CatalogActions";

export const DAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const range = (n: number) => Array.from({ length: n }, (_, k) => k + 1);
export function ProgramsView() {
  const q = usePrograms(), [edit, setEdit] = useState<Program | "new" | null>(null), del = useArchiveProgram(), [open, setOpen] = useState<string | null>(null);
  const list = q.data ?? [];
  return (
    <div>
      <CatalogTop tab="programas" sub={`${list.length} programa${list.length === 1 ? "" : "s"} · semanas completas listas para asignar`} addLabel="Nuevo programa" onAdd={() => setEdit("new")} />
      {q.isPending && <Skeleton rows={3} />}
      {q.isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los programas. <button className="filter-chip" onClick={() => q.refetch()}>Reintentar</button></p></div>}
      {q.data === null && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Los programas se activan cuando se corra la migración 0043 en Supabase.</p></div>}
      {q.data && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>Un programa son semanas completas: eliges qué rutina va cada día, cuántas semanas dura y si cada semana es igual o distinta. Después se lo asignas a un cliente con un toque desde su ficha (Entrenamiento → “Asignar programa”).</p></div>}
      <div className="cat-list">{list.map((p) => {
        const on = open === p.id, trainDays = new Set(p.days.filter((d) => d.week === 1).map((d) => d.weekday)).size, gone = p.days.some((d) => d.gone);
        return (
          <div key={p.id} className={`cat-row${on ? " open" : ""}`}>
            <div className="cat-row-line">
              <button type="button" className="cat-weeks" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(on ? null : p.id)}><b>{p.weeks}</b><small>{p.weeks === 1 ? "semana" : "semanas"}</small></button>
              <button type="button" className="cat-row-head" aria-expanded={on} onClick={() => setOpen(on ? null : p.id)}>
                <span className="cat-row-main"><b>{p.name}</b>
                  <small>{trainDays} día{trainDays === 1 ? "" : "s"} por semana{p.distinct > 1 ? ` · ${p.distinct} semanas distintas` : " · la misma semana"}{gone ? " · tiene una rutina eliminada" : ""}</small>
                  <span className="cat-strip" aria-label={`Semana 1: ${DAYS_LONG.filter((_, i) => p.days.some((d) => d.week === 1 && d.weekday === i + 1)).join(", ") || "sin días"}`}>
                    {DAYS_SHORT.map((d, i) => <i key={d} className={p.days.some((x) => x.week === 1 && x.weekday === i + 1) ? "on" : ""}>{d.slice(0, 1)}</i>)}</span></span>
                <svg className="cat-chev" viewBox="0 0 10 8" fill="none" aria-hidden="true"><path d="M1 4h8M6 1l3 3-3 3" strokeLinecap="round" /></svg>
              </button>
            </div>
            {on && <div className="cat-row-body">
              {range(p.distinct).map((w) => (
                <div key={w}>{p.distinct > 1 && <div className="prg-wlabel">Semana {w}</div>}
                  <div className="prg-days">{DAYS_SHORT.map((d, i) => { const x = p.days.find((y) => y.week === w && y.weekday === i + 1); return <span key={d} className={`prg-day${x ? " on" : ""}${x?.gone ? " gone" : ""}`}><b>{d}</b><small>{x ? `${x.routine}${x.gone ? " (eliminada)" : ""}` : "Descanso"}</small></span>; })}</div>
                </div>))}
              {p.notes && <p className="card-meta" style={{ marginTop: 8 }}>{p.notes}</p>}
              <CatalogActions what="programa" name={p.name} onEdit={() => setEdit(p)} onDelete={() => del.mutate(p.id)} busy={del.isPending && del.variables === p.id} />
            </div>}
          </div>);
      })}</div>
      {edit && <ProgramModal p={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
type Grid = Record<number, Record<number, string>>;   // semana → día → rutina
function ProgramModal({ p, onClose }: { p: Program | null; onClose: () => void }) {
  const routines = useRoutines(), save = useSaveProgram();
  const [name, setName] = useState(p?.name ?? ""), [weeks, setWeeks] = useState(p?.weeks ?? 4), [notes, setNotes] = useState(p?.notes ?? ""), [err, setErr] = useState("");
  const [distinct, setDistinct] = useState((p?.distinct ?? 1) > 1), [wk, setWk] = useState(1);
  const [grid, setGrid] = useState<Grid>(() => { const g: Grid = {}; (p?.days ?? []).forEach((d) => { (g[d.week] ??= {})[d.weekday] = d.templateId; }); return g; });
  // Rutinas que el programa usa pero ya no están en el catálogo (eliminadas): se muestran como opción para que el valor del
  // selector sea el real y "Descanso" u otra rutina sí se puedan elegir (antes el selector quedaba pegado a la rutina eliminada).
  const gone = new Map((p?.days ?? []).filter((d) => d.gone || !(routines.data ?? []).some((r) => r.id === d.templateId)).map((d) => [d.templateId, d.routine]));
  const n = distinct ? weeks : 1, w = Math.min(wk, n);
  const setDay = (week: number, day: number, t: string) => setGrid((g) => ({ ...g, [week]: { ...(g[week] ?? {}), [day]: t } }));
  const toDistinct = (on: boolean) => {
    setDistinct(on); setWk(1);
    if (on) setGrid((g) => { const base = g[1] ?? {}, out: Grid = { 1: base }; range(weeks).slice(1).forEach((k) => { out[k] = g[k] && Object.values(g[k]).some(Boolean) ? g[k] : { ...base }; }); return out; });
  };
  const copyPrev = () => setGrid((g) => ({ ...g, [w]: { ...(g[w - 1] ?? {}) } }));
  const submit = () => {
    const list = range(n).flatMap((week) => Object.entries(grid[week] ?? {}).filter(([, t]) => !!t).map(([d, t]) => ({ week, weekday: Number(d), template_id: t })));
    if (!name.trim()) return setErr("Ponle un nombre al programa.");
    if (!list.some((x) => x.week === 1)) return setErr(n > 1 ? "La semana 1 necesita al menos un día con rutina." : "Elige la rutina de al menos un día.");
    if (list.some((x) => gone.has(x.template_id))) return setErr("Hay un día con una rutina eliminada del catálogo. Cámbiala o déjalo de descanso.");
    setErr(""); save.mutate({ id: p?.id, name: name.trim(), weeks, notes, days: list }, { onSuccess: onClose });
  };
  return (
    <Modal wide title={p ? "Editar programa" : "Nuevo programa"} sub="Elige la rutina de cada día. Los días sin rutina quedan de descanso." onClose={onClose}>
      {routines.data && !routines.data.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Primero crea rutinas en el catálogo. <Link href="/coach/catalogo/rutinas" onClick={onClose} style={{ color: "var(--accent)", fontWeight: 700 }}>Ir a rutinas</Link></p> : <>
        <div className="modal-field"><label htmlFor="prg-name">Nombre</label><input id="prg-name" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hipertrofia principiante, 4 días" /></div>
        <div className="modal-row2">
          <div className="modal-field"><label htmlFor="prg-weeks">Duración</label><select id="prg-weeks" value={weeks} onChange={(e) => { const v = Number(e.target.value); setWeeks(v); if (v === 1) setDistinct(false); setWk((x) => Math.min(x, v)); }}>{range(16).map((i) => <option key={i} value={i}>{i} semana{i > 1 ? "s" : ""}</option>)}</select></div>
          <div className="modal-field"><label htmlFor="prg-notes">Nota (solo para ti)</label><input id="prg-notes" maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Para quien recién empieza" /></div>
        </div>
        {weeks > 1 && <div className="prg-mode" role="radiogroup" aria-label="Semanas del programa">
          <button type="button" role="radio" aria-checked={!distinct} className={!distinct ? "on" : ""} onClick={() => toDistinct(false)}><b>La misma semana</b><small>Se repite {weeks} veces</small></button>
          <button type="button" role="radio" aria-checked={distinct} className={distinct ? "on" : ""} onClick={() => toDistinct(true)}><b>Distinta cada semana</b><small>Empiezan como copia de la semana 1</small></button>
        </div>}
        {n > 1 && <div className="tp-wtabs" role="tablist" style={{ marginTop: 12 }}>{range(n).map((k) => <button key={k} type="button" role="tab" aria-selected={k === w} className={`tp-wtab${k === w ? " on" : ""}`} onClick={() => setWk(k)}>Semana {k}</button>)}</div>}
        <div className="prg-edit">{DAYS_LONG.map((d, i) => { const v = grid[w]?.[i + 1] ?? ""; return (
          <div key={d} className="prg-edit-row"><label htmlFor={`prg-d${i}`}>{d}</label>
            <select id={`prg-d${i}`} value={v} onChange={(e) => setDay(w, i + 1, e.target.value)}>
              <option value="">Descanso</option>
              {v && gone.has(v) && <option value={v}>{gone.get(v)} (eliminada)</option>}
              {(routines.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>); })}</div>
        {n > 1 && w > 1 && <button type="button" className="tp-link" style={{ marginTop: 8 }} onClick={copyPrev}>Copiar la semana {w - 1} aquí</button>}
        <p className="modal-cap-hint">Al asignarlo, la “próxima revisión” del plan queda al final de las {weeks} semana{weeks > 1 ? "s" : ""}: te aparecerá en “Planes por revisar”.{n > 1 ? " Después de la última semana vuelve a la semana 1." : ""}</p>
        {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{err}</p>}
        <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
      </>}
    </Modal>
  );
}
