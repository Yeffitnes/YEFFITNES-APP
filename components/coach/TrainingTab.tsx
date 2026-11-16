"use client";
import { useVideoPick } from "@/components/ui/useVideoPick";
import { Icon } from "@/components/ui/Icon";
import { useRef, useState } from "react";
import { useAssignDay, useClearDay, useCreatePlan, useRoutines, useSetDayVideo, assignDayVideo, useSetItem, useSetPlanWeeks, useTrainingPlans, type ItemPatch, type PlanDay, type PlanItem } from "@/lib/queries";
import { ExPic } from "@/components/ExPic";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS } from "@/lib/upload-video";
import { posterFromVideo } from "@/lib/video-poster";
import { useBackgroundUpload } from "@/lib/upload-manager";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { PlanInfoForm } from "./PlanInfoForm";
import Link from "next/link";
import { useApplyProgram, usePrograms } from "@/lib/extras";
const DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
export function TrainingTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { data, isPending, isError, refetch } = useTrainingPlans(clientId);
  const today = (new Date().getDay() + 6) % 7 + 1;
  const [day, setDay] = useState(today), [weekSel, setWeekSel] = useState<number | null>(null);
  const [prog, setProg] = useState(false);
  const [hist, setHist] = useState(false), [newPlan, setNewPlan] = useState(false), [assign, setAssign] = useState(false), [confirm, setConfirm] = useState(false);
  const clear = useClearDay(clientId), weeksM = useSetPlanWeeks(clientId);
  if (isPending) return <Skeleton rows={2} />;
  if (isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el entrenamiento. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>;
  const active = data?.find((p) => p.status === "active"), past = data?.filter((p) => p.status === "finished") ?? [];
  const first = clientName.split(" ")[0];
  const cycle = active?.cycleWeeks ?? 1, week = Math.min(weekSel ?? active?.week ?? 1, cycle);
  const wdays = (active?.allDays ?? active?.days ?? []).filter((x) => (x.week ?? 1) === week);
  const d = wdays.find((x) => x.weekday === day);
  const addWeek = () => { if (!active) return; weeksM.mutate({ planId: active.id, weeks: cycle + 1, copyFrom: cycle }, { onSuccess: () => setWeekSel(cycle + 1) }); };
  const dropWeek = () => { if (!active || cycle <= 1) return; weeksM.mutate({ planId: active.id, weeks: cycle - 1 }, { onSuccess: () => setWeekSel(Math.min(week, cycle - 1)) }); };
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-tag">Plan de entrenamiento</div>
        {active ? (
          <div className="tp-head">
            <div>
              <div className="tp-name">{active.name}</div>
              <div className="tp-sub">Desde {fmt(active.startsOn)}{cycle > 1 ? <> · <b>Semana {active.week} de {cycle}</b> esta semana</> : " · la misma semana se repite"}</div>
            </div>
            <div className="tp-actions">
              {!!past.length && <button className="ghost-btn sm" onClick={() => setHist(!hist)}>Planes anteriores</button>}
              <button className="ghost-btn sm" onClick={() => setProg(true)}>Asignar programa</button>
              <button className="ghost-btn sm" onClick={() => setNewPlan(true)}>Plan vacío nuevo</button>
            </div>
          </div>
        ) : (
          <>
            <p className="tp-sub" style={{ marginTop: 4 }}>{first} todavía no tiene plan. Elige cómo armarlo:</p>
            <div className="tp-start">
              <button type="button" onClick={() => setProg(true)}><b>Usar un programa</b><span>Semanas completas que ya armaste en Catálogo. Un toque y queda listo; luego lo ajustas.</span></button>
              <button type="button" onClick={() => setNewPlan(true)}><b>Armar día por día</b><span>Creas el plan y eliges la rutina de cada día.</span></button>
            </div>
          </>
        )}
        {hist && <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>{past.map((p) => <div key={p.id} className="info-list-row"><span>{p.name}</span><span style={{ color: "var(--text-faint)" }}>Finalizado · {fmt(p.startsOn)}{p.endsOn ? ` – ${fmt(p.endsOn)}` : ""}</span></div>)}</div>}
      </div>
      {active && <PlanInfoForm key={active.id + (active.level ?? "") + (active.reviewOn ?? "")} plan={active} clientId={clientId} clientName={clientName} />}
      {active && (
        <div className="card">
          <div className="tp-weeks">
            {cycle > 1 ? <>
              <div className="tp-wtabs" role="tablist" aria-label="Semanas del plan">{Array.from({ length: cycle }, (_, k) => k + 1).map((w) => (
                <button key={w} role="tab" aria-selected={w === week} className={`tp-wtab${w === week ? " on" : ""}`} onClick={() => { setWeekSel(w); setConfirm(false); }}>Semana {w}{w === active.week ? <i> · en curso</i> : null}</button>))}</div>
              <div className="tp-wtools">
                {cycle < 16 && <button className="tp-link" disabled={weeksM.isPending} onClick={addWeek}>+ Semana {cycle + 1} (copia de la {cycle})</button>}
                {week === cycle && <button className="tp-link danger" disabled={weeksM.isPending} onClick={dropWeek}>Quitar semana {cycle}</button>}
              </div>
            </> : <>
              <div className="card-tag" style={{ marginBottom: 0 }}>Semana del plan</div>
              <button className="tp-link" disabled={weeksM.isPending} onClick={addWeek} title="Agrega la semana 2 copiando esta; luego cambias lo que quieras.">+ Semanas distintas</button>
            </>}
          </div>
          <div className="day-pill-row" style={{ marginTop: 12 }}>{DAYS.map((t, i) => <button key={t} className={`day-pill${day === i + 1 ? " active" : ""}`} onClick={() => { setDay(i + 1); setConfirm(false); }}>{t}{wdays.some((x) => x.weekday === i + 1) ? " ●" : ""}</button>)}</div>
          {d ? (
            <>
              <div className="tp-dayhead">
                <div><div className="tp-dayname">{d.name}</div><div className="tp-sub">{d.items.length} ejercicio{d.items.length === 1 ? "" : "s"}{d.minutes ? ` · ${d.minutes} min aprox.` : ""} · lo que cambies aquí es solo para {first}</div></div>
                <div className="tp-actions"><button className="ghost-btn sm" onClick={() => setAssign(true)}>Cambiar rutina</button>
                  {confirm ? <><button className="ghost-btn sm" onClick={() => setConfirm(false)}>Conservar</button><button className="ghost-btn sm danger" disabled={clear.isPending} onClick={() => clear.mutate(d.id, { onSuccess: () => setConfirm(false) })}>Sí, descanso</button></>
                    : <button className="ghost-btn sm" onClick={() => setConfirm(true)}>Dejar de descanso</button>}</div>
              </div>
              <div className="tp-items">{d.items.map((i, k) => <ItemRow key={i.id} n={k + 1} item={i} clientId={clientId} />)}</div>
              <DayVideoBox clientId={clientId} clientName={clientName} day={d} />
            </>
          ) : (
            <div className="tp-rest"><p>{DAYS_LONG[day - 1]}{cycle > 1 ? ` (semana ${week})` : ""}: día de descanso. {first} lo verá así.</p><button className="primary-btn sm" onClick={() => setAssign(true)}>Asignar rutina</button></div>
          )}
        </div>)}
      {prog && <ProgramModal clientId={clientId} first={first} hasActive={!!active} onClose={() => setProg(false)} onDone={() => { setDay(today); setWeekSel(null); }} />}
      {newPlan && <NewPlan clientId={clientId} hasActive={!!active} onClose={() => setNewPlan(false)} />}
      {assign && active && <AssignModal clientId={clientId} planId={active.id} weekday={day} week={week} weeks={cycle} dayLabel={DAYS_LONG[day - 1]} replacing={!!d} onClose={() => setAssign(false)} />}
    </div>
  );
}
// Un ejercicio del plan de este cliente: series, repeticiones, descanso y peso se guardan al salir de cada campo.
function ItemRow({ n, item, clientId }: { n: number; item: PlanItem; clientId: string }) {
  const save = useSetItem(clientId);
  const put = (patch: ItemPatch) => save.mutate({ itemId: item.id, patch });
  return (
    <div className="tp-item">
      <div className="tp-item-top"><span className="rf-num">{n}</span><ExPic image={item.image} name={item.name} size={34} className="tp-pic" /><b>{item.name}</b></div>
      <div className="rf-grid four">
        <label>Series<input type="number" inputMode="numeric" min={1} max={20} defaultValue={item.sets} aria-label={`Series de ${item.name}`}
          onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= 20 && v !== item.sets) put({ sets: v }); else e.target.value = String(item.sets); }} /></label>
        <label>Reps<input defaultValue={item.reps} maxLength={15} aria-label={`Repeticiones de ${item.name}`}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== item.reps) put({ reps: v }); else e.target.value = item.reps; }} /></label>
        <label>Desc. (s)<input type="number" inputMode="numeric" min={0} defaultValue={item.rest ?? ""} aria-label={`Descanso de ${item.name} en segundos`}
          onBlur={(e) => { const v = e.target.value === "" ? null : Math.round(Number(e.target.value)); if (v !== item.rest && (v === null || v >= 0)) put({ rest: v }); }} /></label>
        <label>Peso kg<input type="number" inputMode="decimal" min={0} step={0.5} defaultValue={item.weight ?? ""} placeholder="—" aria-label={`Peso objetivo de ${item.name} en kilos`}
          onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== item.weight && (v === null || v >= 0)) put({ weight: v }); }} /></label>
      </div>
    </div>
  );
}
function NewPlan({ clientId, hasActive, onClose }: { clientId: string; hasActive: boolean; onClose: () => void }) {
  const create = useCreatePlan(clientId), [name, setName] = useState(""), [err, setErr] = useState("");
  const go = () => { if (!name.trim()) return setErr("Ponle un nombre al plan."); create.mutate(name.trim(), { onSuccess: onClose }); };
  return (
    <Modal title="Crear nuevo plan" sub={hasActive ? "El plan actual pasará a “Finalizado” y este será el activo. Las rutinas se asignan después, día por día." : "Después le asignas una rutina a cada día de la semana."} onClose={onClose}>
      <div className="modal-field"><label>Nombre del plan</label><input aria-label="Nombre del plan" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Ej. Fuerza — semana 1" /></div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={create.isPending} onClick={go}>{create.isPending ? "Creando…" : "Crear plan"}</button></div>
    </Modal>
  );
}
function AssignModal({ clientId, planId, weekday, week, weeks, dayLabel, replacing, onClose }: { clientId: string; planId: string; weekday: number; week: number; weeks: number; dayLabel: string; replacing: boolean; onClose: () => void }) {
  const { data } = useRoutines(), assign = useAssignDay(clientId), [sel, setSel] = useState(""), [days, setDays] = useState<number[]>([weekday]);
  const toggle = (w: number) => setDays((l) => (l.includes(w) ? l.filter((x) => x !== w) : [...l, w].sort()));
  return (
    <Modal title={`Rutina para el ${dayLabel.toLowerCase()}${weeks > 1 ? ` · semana ${week}` : ""}`} sub={`${replacing ? "Reemplaza la rutina que ya tenga cada día elegido. " : ""}Se copia la rutina: lo que ajustes después es solo para este cliente y no cambia el catálogo.`} onClose={onClose}>
      {!data ? <Skeleton rows={2} /> : !data.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Aún no tienes rutinas. Créalas en Catálogo, sección Rutinas.</p> : (
        <div className="tp-pick">{data.map((r) => (
          <label key={r.id} className={`tp-pick-row${sel === r.id ? " on" : ""}`}>
            <input type="radio" name="tpl" checked={sel === r.id} onChange={() => setSel(r.id)} />
            <span><b>{r.name}</b><small>{r.items.length} ejercicios{r.minutes ? ` · ${r.minutes} min` : ""}{r.category ? ` · ${r.category}` : ""}</small></span></label>))}</div>)}
      <div style={{ marginTop: 16 }}>
        <div className="card-tag">También para estos días{weeks > 1 ? ` (semana ${week})` : ""}</div>
        <div className="day-pill-row" style={{ marginTop: 8 }}>{DAYS.map((t, i) => <button key={t} type="button" aria-pressed={days.includes(i + 1)} className={`day-pill${days.includes(i + 1) ? " active" : ""}`} onClick={() => toggle(i + 1)}>{t}</button>)}</div>
      </div>
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={!sel || !days.length || assign.isPending} onClick={() => assign.mutate({ planId, weekdays: days, templateId: sel, week }, { onSuccess: onClose })}>{assign.isPending ? "Asignando…" : days.length > 1 ? `Asignar a ${days.length} días` : "Asignar"}</button></div>
    </Modal>
  );
}

// Vídeo de la rutina de este día: el de catálogo (lo ven todos) o uno grabado solo para este cliente (lo reemplaza).
function DayVideoBox({ clientId, clientName, day }: { clientId: string; clientName: string; day: PlanDay }) {
  const set = useSetDayVideo(clientId), input = useRef<HTMLInputElement>(null), [err, setErr] = useState(""), [play, setPlay] = useState(false);
  const bg = useBackgroundUpload();
  const upload = (f: File) => { setErr(""); const poster = posterFromVideo(f); bg({ file: f, label: `Vídeo para ${clientName.split(" ")[0]}`, opts: { purpose: "message", clientId }, finish: (id, qc) => assignDayVideo(qc, clientId, day.id, id, poster) }); };
  const { pick, trimmer } = useVideoPick({ maxSeconds: MAX_COACH_VIDEO_SECONDS, maxSourceSeconds: MAX_COACH_VIDEO_SECONDS, maxMB: MAX_COACH_VIDEO_MB, onFile: upload, onError: setErr });
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      {day.videoRef && <div className="info-list-row" style={{ alignItems: "center" }}><span><b>Vídeo de catálogo</b><br /><span style={{ fontSize: 12, color: "var(--text-dim)" }}>Lo ven todos los clientes con esta rutina.</span></span><a href={`https://www.youtube.com/watch?v=${day.videoRef}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>Abrir <Icon name="arrow" size={12} /></a></div>}
      <div className="info-list-row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span><b>Vídeo personalizado para {clientName.split(" ")[0]}</b><br /><span style={{ fontSize: 12, color: "var(--text-dim)" }}>Solo {clientName.split(" ")[0]} lo ve — reemplaza al de catálogo en su plan.</span></span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {trimmer}
          <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {day.hasPersonalVideo && <><button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} onClick={() => setPlay(true)}>Ver</button><button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} disabled={set.isPending} onClick={() => set.mutate({ dayId: day.id, videoId: null })}>Quitar</button></>}
          <button className="primary-btn" style={{ height: 32, fontSize: 11.5 }} disabled={set.isPending} onClick={() => input.current?.click()}>{day.hasPersonalVideo ? "Reemplazar" : "Subir vídeo"}</button>
        </span>
      </div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{err}</p>}
      {play && <BunnyModal param={`day=${day.id}`} title={`Vídeo para ${clientName}`} sub={day.name} onClose={() => setPlay(false)} />}
    </div>
  );
}

// Asignar un programa completo (30-oct, noche): crea su plan nuevo con la semana armada y la revisión al final del programa.
function ProgramModal({ clientId, first, hasActive, onClose, onDone }: { clientId: string; first: string; hasActive: boolean; onClose: () => void; onDone: () => void }) {
  const q = usePrograms(), apply = useApplyProgram(clientId), [sel, setSel] = useState("");
  const p = q.data?.find((x) => x.id === sel);
  return (
    <Modal title={`Asignar programa a ${first}`} sub={hasActive ? "Se crea un plan nuevo con toda la semana; el plan actual pasa a “Finalizado” (su historial no se pierde)." : "Se crea su plan con toda la semana armada."} onClose={onClose}>
      {q.isPending ? <Skeleton rows={2} /> : q.data === null ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Los programas se activan cuando se corra la migración 0043.</p>
        : !q.data?.length ? <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 14 }}>Aún no tienes programas. <Link href="/coach/catalogo/programas" style={{ color: "var(--accent)", fontWeight: 700 }}>Crear uno en Catálogo → Programas</Link></p>
        : <div style={{ marginTop: 14, maxHeight: 320, overflowY: "auto" }}>{q.data.map((x) => (
          <label key={x.id} className="info-list-row" style={{ cursor: "pointer", gap: 10, justifyContent: "flex-start" }}>
            <input type="radio" name="prg" checked={sel === x.id} onChange={() => setSel(x.id)} /><span style={{ fontWeight: 700 }}>{x.name}</span><span style={{ color: "var(--text-faint)", fontSize: 12 }}>{x.weeks} sem{x.distinct > 1 ? ` · ${x.distinct} semanas distintas` : ""}</span></label>))}</div>}
      {p && <div className="modal-cap-hint">{Array.from({ length: p.distinct }, (_, k) => k + 1).map((w) => <div key={w}>{p.distinct > 1 && <b>Semana {w}: </b>}{p.days.filter((d) => d.week === w).map((d) => `${DAYS[d.weekday - 1]} ${d.routine}`).join(" · ") || "descanso"}</div>)}
        <div style={{ marginTop: 4 }}>{p.distinct > 1 ? `Las ${p.distinct} semanas se van turnando. ` : "La misma semana se repite. "}Revisión del plan en {p.weeks} semana{p.weeks === 1 ? "" : "s"}.</div></div>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={!sel || apply.isPending} onClick={() => apply.mutate(sel, { onSuccess: () => { onDone(); onClose(); } })}>{apply.isPending ? "Asignando…" : "Asignar programa"}</button></div>
    </Modal>
  );
}
