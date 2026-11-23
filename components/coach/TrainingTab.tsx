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
import { Guide } from "@/components/portal/Guide";
import { useApplyProgram, usePrograms } from "@/lib/extras";
const DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
// 22-nov (pedido de Cristian): la pestaña se veía "muy blanca" y armar la semana pedía entrar día por día a un modal.
// Ahora: cabecera oscura del plan; "Arma la semana" con los 7 días a la vista, cada uno con su selector de rutina (se guarda al
// elegir, sin salir de ahí); y abajo el día elegido con sus ejercicios para ajustarlos. El personaje sale donde ayuda: plan vacío
// y día de descanso.
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
  const trainDays = wdays.length, exCount = wdays.reduce((a, x) => a + x.items.length, 0), mins = wdays.reduce((a, x) => a + (x.minutes ?? 0), 0);
  const addWeek = () => { if (!active) return; weeksM.mutate({ planId: active.id, weeks: cycle + 1, copyFrom: cycle }, { onSuccess: () => setWeekSel(cycle + 1) }); };
  const dropWeek = () => { if (!active || cycle <= 1) return; weeksM.mutate({ planId: active.id, weeks: cycle - 1 }, { onSuccess: () => setWeekSel(Math.min(week, cycle - 1)) }); };
  return (
    <div className="tp">
      <section className="tp-hero">
        <div className="tp-eyebrow">Plan de entrenamiento</div>
        {active ? (<>
          <div className="tp-hero-row">
            <div style={{ minWidth: 0 }}>
              <h2 className="tp-hero-name">{active.name}</h2>
              <div className="tp-hero-sub">Desde {fmt(active.startsOn)}{cycle > 1 ? <> · <b>semana {active.week} de {cycle}</b> en curso</> : " · la misma semana se repite"}</div>
            </div>
            <div className="tp-hero-acts">
              {!!past.length && <button className="tp-glass" onClick={() => setHist(!hist)}>Planes anteriores</button>}
              <button className="tp-glass" onClick={() => setProg(true)}>Asignar programa</button>
              <button className="tp-glass" onClick={() => setNewPlan(true)}>Plan vacío nuevo</button>
            </div>
          </div>
          <div className="tp-stats">
            <div><b>{trainDays}</b><span>{trainDays === 1 ? "día de entreno" : "días de entreno"}</span></div>
            <div><b>{exCount}</b><span>ejercicios por semana</span></div>
            <div><b>{mins ? `${mins}′` : "—"}</b><span>minutos por semana</span></div>
            <div><b>{cycle}</b><span>{cycle === 1 ? "semana que se repite" : "semanas distintas"}</span></div>
          </div>
          {hist && <div className="tp-hist">{past.map((p) => <div key={p.id}><span>{p.name}</span><small>Finalizado · {fmt(p.startsOn)}{p.endsOn ? ` – ${fmt(p.endsOn)}` : ""}</small></div>)}</div>}
        </>) : (
          <div className="tp-empty">
            <span className="tp-stage" aria-hidden><Guide size={86} pose="clipboard" dir="right" /></span>
            <div style={{ minWidth: 0 }}>
              <h2 className="tp-hero-name">{first} todavía no tiene plan</h2>
              <p className="tp-hero-sub">Elige cómo armarlo. Después pones la rutina de cada día en un solo lugar.</p>
              <div className="tp-start">
                <button type="button" onClick={() => setProg(true)}><b>Usar un programa</b><span>Semanas completas de tu catálogo. Un toque y queda listo; luego lo ajustas.</span></button>
                <button type="button" onClick={() => setNewPlan(true)}><b>Armar la semana</b><span>Creas el plan y eliges la rutina de cada día, todos a la vista.</span></button>
              </div>
            </div>
          </div>
        )}
      </section>
      {active && <PlanInfoForm key={active.id + (active.level ?? "") + (active.reviewOn ?? "")} plan={active} clientId={clientId} clientName={clientName} />}
      {active && (
        <section className="tp-week">
          <div className="tp-week-head">
            <div><div className="tp-eyebrow">Arma la semana</div><p>Elige la rutina de cada día aquí mismo: se guarda al elegirla. Toca un día para ajustar sus ejercicios.</p></div>
            {cycle === 1 && <button className="tp-link light" disabled={weeksM.isPending} onClick={addWeek} title="Agrega la semana 2 copiando esta; luego cambias lo que quieras.">+ Semanas distintas</button>}
          </div>
          {cycle > 1 && <div className="tp-weeks">
            <div className="tp-wtabs dark" role="tablist" aria-label="Semanas del plan">{Array.from({ length: cycle }, (_, k) => k + 1).map((w) => (
              <button key={w} role="tab" aria-selected={w === week} className={`tp-wtab${w === week ? " on" : ""}`} onClick={() => { setWeekSel(w); setConfirm(false); }}>Semana {w}{w === active.week ? <i> · en curso</i> : null}</button>))}</div>
            <div className="tp-wtools">
              {cycle < 16 && <button className="tp-link light" disabled={weeksM.isPending} onClick={addWeek}>+ Semana {cycle + 1} (copia de la {cycle})</button>}
              {week === cycle && <button className="tp-link light danger" disabled={weeksM.isPending} onClick={dropWeek}>Quitar semana {cycle}</button>}
            </div>
          </div>}
          <WeekBuilder key={`${active.id}-${week}`} clientId={clientId} planId={active.id} week={week} days={wdays} sel={day} today={week === (active.week ?? 1) ? today : 0} onSel={(w) => { setDay(w); setConfirm(false); }} />
        </section>)}
      {active && (
        <section className="card tp-day" id="tp-day">
          <div className="tp-day-band">
            <div style={{ minWidth: 0 }}>
              <div className="tp-eyebrow">{DAYS_LONG[day - 1]}{cycle > 1 ? ` · semana ${week}` : ""}{day === today && week === (active.week ?? 1) ? " · hoy" : ""}</div>
              <div className="tp-day-name">{d ? d.name : "Descanso"}</div>
              <div className="tp-day-sub">{d ? `${d.items.length} ejercicio${d.items.length === 1 ? "" : "s"}${d.minutes ? ` · ${d.minutes} min aprox.` : ""} · lo que cambies aquí es solo para ${first}` : `${first} lo verá como día de descanso.`}</div>
            </div>
            {d && <div className="tp-hero-acts">
              <button className="tp-glass" onClick={() => setAssign(true)}>Asignar a varios días</button>
              {confirm ? <><button className="tp-glass" onClick={() => setConfirm(false)}>Conservar</button><button className="tp-glass danger" disabled={clear.isPending} onClick={() => clear.mutate(d.id, { onSuccess: () => setConfirm(false) })}>Sí, descanso</button></>
                : <button className="tp-glass" onClick={() => setConfirm(true)}>Dejar de descanso</button>}
            </div>}
          </div>
          {d ? (<>
            <div className="tp-items">{d.items.map((i, k) => <ItemRow key={i.id} n={k + 1} item={i} clientId={clientId} />)}</div>
            <DayVideoBox clientId={clientId} clientName={clientName} day={d} />
          </>) : (
            <div className="tp-rest">
              <span className="tp-stage sm" aria-hidden><Guide size={62} pose="hydrate" /></span>
              <p>Hoy {first} descansa: agua, sueño y movilidad suave. Si quieres que entrene este día, elige la rutina arriba en <b>Arma la semana</b> o aquí.</p>
              <button className="primary-btn sm" onClick={() => setAssign(true)}>Elegir rutina</button>
            </div>
          )}
        </section>)}
      {prog && <ProgramModal clientId={clientId} first={first} hasActive={!!active} onClose={() => setProg(false)} onDone={() => { setDay(today); setWeekSel(null); }} />}
      {newPlan && <NewPlan clientId={clientId} hasActive={!!active} onClose={() => setNewPlan(false)} />}
      {assign && active && <AssignModal clientId={clientId} planId={active.id} weekday={day} week={week} weeks={cycle} dayLabel={DAYS_LONG[day - 1]} replacing={!!d} onClose={() => setAssign(false)} />}
    </div>
  );
}
// Los 7 días con su rutina a la vista (22-nov). Elegir en el selector asigna esa rutina a ese día en el momento (assign_day copia
// la rutina del catálogo); "Descanso" pide confirmar porque borra lo que se haya ajustado ese día.
function WeekBuilder({ clientId, planId, week, days, sel, today, onSel }: { clientId: string; planId: string; week: number; days: PlanDay[]; sel: number; today: number; onSel: (w: number) => void }) {
  const routines = useRoutines(), assign = useAssignDay(clientId), clear = useClearDay(clientId), [busy, setBusy] = useState<number | null>(null), [ask, setAsk] = useState<number | null>(null);
  const list = routines.data ?? [];
  const pick = (w: number, v: string) => {
    const cur = days.find((x) => x.weekday === w);
    if (v === "__cur") return;
    if (!v) { if (cur) setAsk(w); return; }
    if (cur?.templateId === v) return;
    setBusy(w); setAsk(null); onSel(w);
    assign.mutate({ planId, weekdays: [w], templateId: v, week }, { onSettled: () => setBusy(null) });
  };
  return (
    <div className="wk-grid">{DAYS.map((t, i) => {
      const w = i + 1, x = days.find((y) => y.weekday === w), known = !!x?.templateId && list.some((r) => r.id === x.templateId);
      return (
        <div key={t} className={`wk-day${x ? " on" : " rest"}${sel === w ? " sel" : ""}${busy === w ? " busy" : ""}`}>
          <button type="button" className="wk-top" onClick={() => onSel(w)} aria-pressed={sel === w} aria-label={`${DAYS_LONG[i]}: ${x ? x.name : "descanso"}. Ver el día`}>
            <span className="wk-dn">{t}{today === w && <i>hoy</i>}</span>
            <b>{busy === w ? "Guardando…" : x ? x.name : "Descanso"}</b>
            <small>{x ? `${x.items.length} ejercicio${x.items.length === 1 ? "" : "s"}${x.minutes ? ` · ${x.minutes}′` : ""}` : "Sin rutina"}</small>
          </button>
          {ask === w ? (
            <div className="wk-ask"><span>¿Dejarlo de descanso?</span>
              <button type="button" onClick={() => setAsk(null)}>No</button>
              <button type="button" className="yes" disabled={clear.isPending} onClick={() => { if (x) clear.mutate(x.id, { onSuccess: () => setAsk(null) }); }}>Sí</button></div>
          ) : (
            <select aria-label={`Rutina del ${DAYS_LONG[i].toLowerCase()}`} value={x ? (known ? x.templateId! : "__cur") : ""} disabled={busy !== null || !routines.data} onChange={(e) => pick(w, e.target.value)}>
              <option value="">Descanso</option>
              {x && !known && <option value="__cur">{x.name} (ajustada)</option>}
              {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>);
    })}
      {routines.data && !list.length && <p className="wk-none">Aún no tienes rutinas. Créalas en <Link href="/coach/catalogo/rutinas">Catálogo → Rutinas</Link>.</p>}
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
    <Modal title="Crear nuevo plan" sub={hasActive ? "El plan actual pasará a “Finalizado” y este será el activo. Después eliges la rutina de cada día en “Arma la semana”." : "Después eliges la rutina de cada día en “Arma la semana”, todos a la vista."} onClose={onClose}>
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
  const bg = useBackgroundUpload(), routines = useRoutines();
  // 0057: si el vídeo del día es el vídeo subido de la rutina del catálogo, no es "personal": se muestra como vídeo de catálogo.
  const tpl = (routines.data ?? []).find((r) => r.id === day.templateId), fromCatalog = !!day.videoId && !!tpl?.videoId && tpl.videoId === day.videoId;
  const personal = day.hasPersonalVideo && !fromCatalog, fn = clientName.split(" ")[0];
  const upload = (f: File) => { setErr(""); const poster = posterFromVideo(f); bg({ file: f, label: `Vídeo para ${clientName.split(" ")[0]}`, opts: { purpose: "message", clientId }, finish: (id, qc) => assignDayVideo(qc, clientId, day.id, id, poster) }); };
  const { pick, trimmer } = useVideoPick({ maxSeconds: MAX_COACH_VIDEO_SECONDS, maxSourceSeconds: MAX_COACH_VIDEO_SECONDS, maxMB: MAX_COACH_VIDEO_MB, onFile: upload, onError: setErr });
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      {(fromCatalog || day.videoRef) && <div className="info-list-row" style={{ alignItems: "center" }}><span><b>Vídeo de catálogo</b><br /><span style={{ fontSize: 12, color: "var(--text-dim)" }}>{personal ? `${fn} ve el personal en su lugar.` : "Lo ven todos los clientes con esta rutina."}</span></span>
        {fromCatalog ? <button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} onClick={() => setPlay(true)}>Ver</button>
          : day.videoRef && <a href={`https://www.youtube.com/watch?v=${day.videoRef}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>Abrir <Icon name="arrow" size={12} /></a>}</div>}
      <div className="info-list-row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span><b>Vídeo personalizado para {fn}</b><br /><span style={{ fontSize: 12, color: "var(--text-dim)" }}>Solo {fn} lo ve — reemplaza al de catálogo en su plan.</span></span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {trimmer}
          <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {personal && <><button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} onClick={() => setPlay(true)}>Ver</button><button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} disabled={set.isPending} onClick={() => set.mutate({ dayId: day.id, videoId: null })}>Quitar</button></>}
          <button className="primary-btn" style={{ height: 32, fontSize: 11.5 }} disabled={set.isPending} onClick={() => input.current?.click()}>{personal ? "Reemplazar" : "Subir vídeo"}</button>
        </span>
      </div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{err}</p>}
      {play && <BunnyModal param={`day=${day.id}&v=${day.videoId ?? ""}`} title={personal ? `Vídeo para ${clientName}` : day.name} sub={personal ? day.name : "Vídeo de la rutina"} onClose={() => setPlay(false)} />}
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
