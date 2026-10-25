"use client";
import { useState } from "react";
import { useAssignDay, useClearDay, useCreatePlan, useRoutines, useSetWeight, useTrainingPlans } from "@/lib/queries";
import { Modal, Skeleton } from "@/components/ui/Modal";
const DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
export function TrainingTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { data, isPending, isError, refetch } = useTrainingPlans(clientId);
  const [day, setDay] = useState((new Date().getDay() + 6) % 7 + 1);
  const [hist, setHist] = useState(false), [newPlan, setNewPlan] = useState(false), [assign, setAssign] = useState(false), [confirm, setConfirm] = useState(false);
  const setWeight = useSetWeight(clientId), clear = useClearDay(clientId);
  if (isPending) return <Skeleton rows={2} />;
  if (isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el entrenamiento. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>;
  const active = data?.find((p) => p.status === "active"), past = data?.filter((p) => p.status === "finished") ?? [];
  const d = active?.days.find((x) => x.weekday === day);
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-tag">Plan asignado</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>{active ? active.name : "Sin plan de entrenamiento"}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{active ? <>Activo desde {fmt(active.startsOn)} · <span style={{ color: "#1C9A5B", fontWeight: 700 }}>● En curso</span></> : `Crea un plan para ${clientName} y asígnale rutinas por día.`}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!!past.length && <button className="ghost-btn" style={{ height: 34, padding: "0 13px", fontSize: 11.5 }} onClick={() => setHist(!hist)}>Ver planes anteriores</button>}
            <button className="primary-btn" style={{ height: 34, fontSize: 11.5 }} onClick={() => setNewPlan(true)}>Crear nuevo plan</button>
          </div>
        </div>
        {hist && <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>{past.map((p) => <div key={p.id} className="info-list-row"><span>{p.name}</span><span style={{ color: "var(--text-faint)" }}>Finalizado · {fmt(p.startsOn)}{p.endsOn ? ` – ${fmt(p.endsOn)}` : ""}</span></div>)}</div>}
      </div>
      {active && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div className="card-tag" style={{ marginBottom: 0 }}>Días del plan activo</div>
            <button className="ghost-btn" style={{ height: 34, padding: "0 13px", fontSize: 11.5 }} onClick={() => setAssign(true)}>{d ? "Cambiar rutina de este día" : "Asignar rutina a este día"}</button>
          </div>
          <div className="day-pill-row" style={{ marginTop: 14 }}>{DAYS.map((t, i) => <button key={t} className={`day-pill${day === i + 1 ? " active" : ""}`} onClick={() => { setDay(i + 1); setConfirm(false); }}>{t}{active.days.some((x) => x.weekday === i + 1) ? " ●" : ""}</button>)}</div>
          {d ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{d.name}</div>
              {d.items.map((i) => (
                <div key={i.id} className="ex-row-static"><span className="ex-dot" /><span style={{ fontSize: 13, flex: 1 }}>{i.name} — {i.sets}×{i.reps}</span>
                  <label style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>Peso objetivo
                    <input type="number" min={0} step={0.5} defaultValue={i.weight ?? ""} placeholder="kg" aria-label={`Peso objetivo de ${i.name} en kilos`}
                      onBlur={(e) => { const w = e.target.value === "" ? null : Number(e.target.value); if (w !== i.weight && (w === null || w >= 0)) setWeight.mutate({ itemId: i.id, weight: w }); }}
                      style={{ width: 70, height: 30, borderRadius: 8, border: "1px solid var(--line)", padding: "0 8px", fontSize: 12.5 }} />
                  </label></div>))}
              {confirm
                ? <div className="modal-actions" style={{ maxWidth: 360 }}><button className="modal-btn ghost" onClick={() => setConfirm(false)}>Conservar</button><button className="modal-btn danger" disabled={clear.isPending} onClick={() => clear.mutate(d.id, { onSuccess: () => setConfirm(false) })}>Sí, quitar</button></div>
                : <button className="modal-cap-hint" style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--danger)" }} onClick={() => setConfirm(true)}>Quitar la rutina de este día</button>}
            </>
          ) : <p style={{ fontSize: 13.5, color: "var(--text-dim)", margin: "6px 0 2px" }}>Este día aún no tiene rutina. Si lo dejas libre, {clientName} lo verá como día de descanso.</p>}
        </div>)}
      {newPlan && <NewPlan clientId={clientId} hasActive={!!active} onClose={() => setNewPlan(false)} />}
      {assign && active && <AssignModal clientId={clientId} planId={active.id} weekday={day} dayLabel={DAYS[day - 1]} replacing={!!d} onClose={() => setAssign(false)} />}
    </div>
  );
}
function NewPlan({ clientId, hasActive, onClose }: { clientId: string; hasActive: boolean; onClose: () => void }) {
  const create = useCreatePlan(clientId), [name, setName] = useState(""), [err, setErr] = useState("");
  const go = () => { if (!name.trim()) return setErr("Ponle un nombre al plan."); create.mutate(name.trim(), { onSuccess: onClose }); };
  return (
    <Modal title="Crear nuevo plan" sub={hasActive ? "El plan actual pasará a “Finalizado” y este será el activo. Las rutinas se asignan después, día por día." : "Después le asignas una rutina a cada día de la semana."} onClose={onClose}>
      <div className="modal-field"><label>Nombre del plan</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Ej. Fuerza — semana 1" /></div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={create.isPending} onClick={go}>{create.isPending ? "Creando…" : "Crear plan"}</button></div>
    </Modal>
  );
}
function AssignModal({ clientId, planId, weekday, dayLabel, replacing, onClose }: { clientId: string; planId: string; weekday: number; dayLabel: string; replacing: boolean; onClose: () => void }) {
  const { data } = useRoutines(), assign = useAssignDay(clientId), [sel, setSel] = useState(""), [days, setDays] = useState<number[]>([weekday]);
  const toggle = (w: number) => setDays((l) => (l.includes(w) ? l.filter((x) => x !== w) : [...l, w].sort()));
  return (
    <Modal title={`Rutina para ${dayLabel}`} sub={replacing ? "Reemplazará la rutina que ya tenga cada día elegido. Se copia la plantilla: los cambios aquí no afectan al catálogo." : "Se copia la plantilla: los cambios aquí no afectan al catálogo."} onClose={onClose}>
      {!data ? <Skeleton rows={2} /> : !data.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Aún no tienes rutinas. Créalas en Catálogo → Rutinas.</p> : (
        <div style={{ marginTop: 14, maxHeight: 300, overflowY: "auto" }}>{data.map((r) => (
          <label key={r.id} className="info-list-row" style={{ cursor: "pointer", gap: 10, justifyContent: "flex-start" }}>
            <input type="radio" name="tpl" checked={sel === r.id} onChange={() => setSel(r.id)} /><span style={{ fontWeight: 700 }}>{r.name}</span><span style={{ color: "var(--text-faint)", fontSize: 12 }}>{r.items.length} ejercicios</span></label>))}</div>)}
      <div style={{ marginTop: 16 }}>
        <div className="card-tag">Aplicar a estos días (puedes marcar varios)</div>
        <div className="day-pill-row" style={{ marginTop: 8 }}>{DAYS.map((t, i) => <button key={t} type="button" aria-pressed={days.includes(i + 1)} className={`day-pill${days.includes(i + 1) ? " active" : ""}`} onClick={() => toggle(i + 1)}>{t}</button>)}</div>
      </div>
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={!sel || !days.length || assign.isPending} onClick={() => assign.mutate({ planId, weekdays: days, templateId: sel }, { onSuccess: onClose })}>{assign.isPending ? "Asignando…" : days.length > 1 ? `Asignar a ${days.length} días` : "Asignar"}</button></div>
    </Modal>
  );
}
