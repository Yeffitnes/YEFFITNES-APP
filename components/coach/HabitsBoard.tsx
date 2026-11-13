"use client";
// Hábitos para Jeff (pedido de Cristian, 12-nov): quién cumple y quién no con el agua, los pasos, el sueño y lo que Jeff agregue,
// cada cliente contra SU meta, en los últimos 7 días completos (hasta ayer: hoy todavía puede cumplir). Debajo, la configuración:
// metas generales, apagar hábitos y agregar otros. La meta de un solo cliente se cambia en su ficha (ClientHabitGoals).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useClients } from "@/lib/queries";
import { useAllHabitLogs, useClientGoals, useHabitDefs, useSaveHabitDef } from "@/lib/extras";
import { fmtHabit, goalText, habitStats, specsFor, type HabitDef } from "@/lib/habits";
import { localDate } from "@/lib/fetchers";
import { Skeleton } from "@/components/ui/Modal";

const lastDays = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 7 + i); return localDate(d); });
type Cell = { state: "ok" | "low" | "none" | "off"; v: string; sub: string };

export function HabitsBoard() {
  const clients = useClients(), defs = useHabitDefs(), goals = useClientGoals(), logs = useAllHabitLogs(8), [only, setOnly] = useState(false);
  const days = useMemo(lastDays, []);
  const active = (defs.data?.defs ?? []).filter((d) => d.active);
  const rows = useMemo(() => {
    if (!clients.data || !defs.data || !goals.data || logs.data === undefined) return [];
    return clients.data.filter((c) => c.status === "active").map((c) => {
      const specs = specsFor(defs.data!.defs, goals.data!, c.id), mine = (logs.data ?? []).filter((r) => r.clientId === c.id);
      const cells = new Map<string, Cell>(active.map((d) => {
        const s = specs.find((x) => x.id === d.id);
        if (!s) return [d.id, { state: "off", v: "No aplica", sub: "" }];
        const st = habitStats(s, mine, days);
        if (!st.n) return [d.id, { state: "none", v: "—", sub: "sin anotar" }];
        const v = s.kind === "check" ? `${st.done} de 7` : fmtHabit(s, st.avg!);
        return [d.id, { state: st.ok === false ? "low" : "ok", v, sub: `${s.own ? "su meta " : "meta "}${s.kind === "check" ? `${s.goal ?? "—"}` : s.goal != null ? fmtHabit(s, s.goal) : "—"} · ${st.n}/7 días` }];
      }));
      const lows = Array.from(cells.values()).filter((x) => x.state === "low").length, none = Array.from(cells.values()).filter((x) => x.state === "none").length;
      return { c, cells, lows, none };
    }).sort((a, b) => b.lows - a.lows || b.none - a.none || a.c.name.localeCompare(b.c.name));
  }, [clients.data, defs.data, goals.data, logs.data, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = only ? rows.filter((r) => r.lows || r.none) : rows;
  const loading = clients.isPending || defs.isPending || goals.isPending || logs.isPending;
  const failed = (clients.isError && !clients.data) || (defs.isError && !defs.data) || (logs.isError && !logs.data);
  const range = `${new Date(`${days[0]}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })} al ${new Date(`${days[6]}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}`;
  return (
    <div className="hb-wrap">
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Hábitos</div>
        <h1>Cómo van con sus hábitos</h1>
        <p className="greeting-sub">Últimos 7 días completos ({range}). Cada cliente contra su meta: promedio por día, o días hechos en los de sí/no.</p></div></div>
      {loading ? <Skeleton rows={4} /> : failed ? <div className="card"><p role="alert" className="empty-note">No pudimos cargar los hábitos. <button className="filter-chip" onClick={() => { void clients.refetch(); void defs.refetch(); void logs.refetch(); }}>Reintentar</button></p></div>
        : logs.data === null ? <div className="card"><p className="empty-note">Falta correr la migración de hábitos (0043) en Supabase.</p></div> : <>
        {!!active.length && <div className="hb-sum">{active.map((d) => {
          const all = rows.map((r) => r.cells.get(d.id)!).filter((x) => x.state !== "off"), ok = all.filter((x) => x.state === "ok").length, low = all.filter((x) => x.state === "low").length, none = all.filter((x) => x.state === "none").length;
          return <div key={d.id} className="hb-sum-card"><small>{d.name}</small><b>{ok} {ok === 1 ? "cumple" : "cumplen"}</b><span>{low ? `${low} por debajo` : "nadie por debajo"}{none ? ` · ${none} sin anotar` : ""}</span></div>;
        })}</div>}
        <div className="card hb-card">
          <div className="hb-head-row"><div className="card-tag" style={{ marginBottom: 0 }}>Por cliente</div>
            <div className="hb-filter" role="group" aria-label="Filtro"><button type="button" className={only ? "" : "on"} aria-pressed={!only} onClick={() => setOnly(false)}>Todos ({rows.length})</button><button type="button" className={only ? "on" : ""} aria-pressed={only} onClick={() => setOnly(true)}>Necesitan atención ({rows.filter((r) => r.lows || r.none).length})</button></div></div>
          {!active.length ? <p className="empty-note">No hay hábitos activos. Actívalos o agrega uno abajo.</p>
            : !shown.length ? <p className="empty-note">{rows.length ? "Todos cumplen sus metas y anotan. Bien." : "Aún no tienes clientes activos."}</p> : (
            <div className="hb-scroll"><table className="hb-table">
              <thead><tr><th scope="col">Cliente</th>{active.map((d) => <th key={d.id} scope="col">{d.name}<small>{d.goal != null ? goalText({ ...d, goal: d.goal }) : "sin meta"}</small></th>)}</tr></thead>
              <tbody>{shown.map(({ c, cells, lows }) => (
                <tr key={c.id}><th scope="row"><Link href={`/coach/clientes/${c.id}?tab=Resumen#metas-habitos`}>{c.name}</Link>{lows > 0 && <small>{lows} por debajo</small>}</th>
                  {active.map((d) => { const x = cells.get(d.id)!; return <td key={d.id} className={`hb-cell ${x.state}`}><b>{x.v}</b>{x.sub && <small>{x.sub}</small>}</td>; })}</tr>))}
              </tbody></table></div>)}
          <p className="hb-legend"><i className="ok" /> cumple <i className="low" /> por debajo de su meta <i className="none" /> sin anotar. Toca un cliente para ver su historial o cambiar sus metas.</p>
        </div>
        <HabitSettings defs={defs.data?.defs ?? []} ready={!!defs.data?.ready} />
      </>}
    </div>
  );
}

function HabitSettings({ defs, ready }: { defs: HabitDef[]; ready: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="card hb-card" id="configurar">
      <div className="card-tag">Configurar hábitos</div>
      <div className="card-title" style={{ fontSize: 15 }}>Hábitos y metas generales</div>
      <p className="plans-due-sub">Aplican a todos tus clientes. Para cambiar la meta de uno solo (o quitarle un hábito), entra a su ficha, pestaña Resumen.</p>
      {!ready ? <p className="empty-note">Para configurarlos falta correr la migración 0052 en Supabase. Mientras tanto se usan agua (6 vasos), pasos (3.000) y sueño (6 h).</p> : <>
        {defs.map((d) => <DefRow key={d.id} d={d} />)}
        {adding ? <NewHabit onDone={() => setAdding(false)} /> : defs.length < 12 && <button type="button" className="pd-btn hb-add" onClick={() => setAdding(true)}>+ Agregar hábito</button>}
      </>}
    </div>
  );
}
// "3.000" = tres mil; "2,5" o "2.5" = dos y medio. Vacío = sin meta (null); basura = NaN.
const num = (t: string) => { const x = t.trim(); if (!x) return null; const n = Number(x.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const show = (n: number | null | undefined) => (n == null ? "" : n >= 1000 ? Math.round(n).toLocaleString("es-CO") : String(n).replace(".", ","));
function DefRow({ d }: { d: HabitDef }) {
  const save = useSaveHabitDef(), [name, setName] = useState(d.name), [unit, setUnit] = useState(d.unit ?? ""), [goal, setGoal] = useState(show(d.goal));
  const g = num(goal), custom = d.key === null, check = d.kind === "check";
  const okGoal = g === null ? custom : Number.isFinite(g) && g > 0 && (!check || g <= 7);   // los de fábrica siempre con meta
  const dirty = name.trim() !== d.name || (unit.trim() || null) !== (d.unit ?? null) || g !== d.goal;
  const valid = name.trim().length > 0 && okGoal;
  const commit = (active = d.active) => save.mutate({ id: d.id, name: name.trim(), unit: check ? null : unit.trim() || null, kind: d.kind, goal: g === null ? null : (g as number), active });
  return (
    <div className={`hb-def${d.active ? "" : " off"}`}>
      <div className="hb-def-main">
        {custom ? <input className="hb-in name" value={name} maxLength={40} aria-label="Nombre del hábito" onChange={(e) => setName(e.target.value)} /> : <b>{d.name}</b>}
        <small>{check ? "Sí o no · meta en días por semana" : d.key ? "Viene de fábrica" : "Número al día"}</small>
      </div>
      <label className="hb-goal"><span>Meta</span>
        <input className="hb-in" inputMode="decimal" value={goal} placeholder={custom ? "Sin meta" : ""} aria-label={`Meta de ${d.name}`} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && dirty && valid) commit(); }} />
        {check ? <i>días/sem.</i> : custom ? <input className="hb-in unit" value={unit} maxLength={20} placeholder="unidad" aria-label="Unidad" onChange={(e) => setUnit(e.target.value)} /> : <i>{d.unit}</i>}
      </label>
      <div className="hb-def-acts">
        {dirty && <button type="button" className="pd-btn primary" disabled={!valid || save.isPending} onClick={() => commit()}>Guardar</button>}
        <button type="button" className={`pd-btn hb-toggle${d.active ? " on" : ""}`} aria-pressed={d.active} disabled={save.isPending || (dirty && !valid)} onClick={() => commit(!d.active)}>{d.active ? "Activo" : "Apagado"}</button>
      </div>
    </div>
  );
}
function NewHabit({ onDone }: { onDone: () => void }) {
  const save = useSaveHabitDef(), [name, setName] = useState(""), [kind, setKind] = useState<"number" | "check">("number"), [unit, setUnit] = useState(""), [goal, setGoal] = useState("");
  const g = num(goal), valid = name.trim().length > 0 && (g === null || (Number.isFinite(g) && g > 0 && (kind === "number" || g <= 7)));
  return (
    <div className="hb-new">
      <div className="card-tag">Nuevo hábito</div>
      <div className="hb-new-grid">
        <label><span>Nombre</span><input className="hb-in" value={name} maxLength={40} placeholder="Lectura" onChange={(e) => setName(e.target.value)} /></label>
        <label><span>Tipo</span><select className="hb-in" value={kind} onChange={(e) => setKind(e.target.value as "number" | "check")}><option value="number">Número al día (minutos, páginas…)</option><option value="check">Sí o no (lo hizo o no)</option></select></label>
        {kind === "number" && <label><span>Unidad</span><input className="hb-in" value={unit} maxLength={20} placeholder="min" onChange={(e) => setUnit(e.target.value)} /></label>}
        <label><span>{kind === "check" ? "Meta (días por semana)" : "Meta al día"}</span><input className="hb-in" inputMode="decimal" value={goal} placeholder={kind === "check" ? "5" : "20"} onChange={(e) => setGoal(e.target.value)} /></label>
      </div>
      <div className="hb-def-acts">
        <button type="button" className="pd-btn primary" disabled={!valid || save.isPending} onClick={() => save.mutate({ id: null, name: name.trim(), unit: kind === "number" ? unit.trim() || null : null, kind, goal: g === null ? null : (g as number), active: true }, { onSuccess: onDone })}>Agregar</button>
        <button type="button" className="pd-btn" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}
