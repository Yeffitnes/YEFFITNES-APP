"use client";
import { useVideoPick } from "@/components/ui/useVideoPick";
import { Icon } from "@/components/ui/Icon";
import { useRef, useState } from "react";
import { useAssignDay, useClearDay, useCreatePlan, useExercises, useRoutines, useSetDayVideo, assignDayVideo, useSetItem, useSetPlanWeeks, useTrainingPlans, type ItemPatch, type PlanDay, type PlanItem } from "@/lib/queries";
import { ExPic } from "@/components/ExPic";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { VideoModal } from "@/components/portal/VideoModal";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS } from "@/lib/upload-video";
import { posterFromVideo } from "@/lib/video-poster";
import { useBackgroundUpload } from "@/lib/upload-manager";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { PlanInfoForm } from "./PlanInfoForm";
import Link from "next/link";
import { Guide } from "@/components/portal/Guide";
import { useApplyProgram, usePrograms, useSaveProgram } from "@/lib/extras";
import { RoutineModal } from "./RoutinesView";
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
  const [hist, setHist] = useState(false), [newPlan, setNewPlan] = useState(false), [buildSel, setBuild] = useState<boolean | null>(null), [assign, setAssign] = useState(false);
  const weeksM = useSetPlanWeeks(clientId);
  // 22-nov: crear una rutina desde un día (queda en Rutinas y se asigna a ese día), guardar un día como rutina y la semana como programa.
  const exs = useExercises(), assignNew = useAssignDay(clientId), [creating, setCreating] = useState<number | null>(null), [asRoutine, setAsRoutine] = useState(false), [asProgram, setAsProgram] = useState(false);
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
  const isToday = (w: number) => w === today && week === (active?.week ?? 1);
  const build = buildSel ?? (!!active && !wdays.length);   // plan vacío: "Armar la semana" ya abierto
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
        // 22-nov, segunda vuelta (Cristian, celular): "Arma la semana" plegable. Por defecto, la semana como antes (7 días); al tocar
        // un día se despliega ese día debajo, y al tocarlo otra vez se pliega. "Armar la semana" abre los selectores de los 7 días.
        // Sin botones repetidos en el día (todo se cambia desde "Armar la semana").
        <section className="tp-week">
          <div className="tp-week-head">
            <div className="tp-eyebrow">Semana del plan{cycle > 1 ? ` · semana ${week} de ${cycle}` : ""}</div>
            <button type="button" className={`tp-build${build ? " on" : ""}`} aria-expanded={build} onClick={() => setBuild(!build)}>{build ? "Listo" : wdays.length ? "Editar semana" : "Armar la semana"}</button>
          </div>
          {cycle > 1 && <div className="tp-wtabs dark" role="tablist" aria-label="Semanas del plan">{Array.from({ length: cycle }, (_, k) => k + 1).map((w) => (
            <button key={w} role="tab" aria-selected={w === week} className={`tp-wtab${w === week ? " on" : ""}`} onClick={() => setWeekSel(w)}>Semana {w}{w === active.week ? <i> · en curso</i> : null}</button>))}</div>}
          {build ? (<>
            <p className="tp-week-hint">Elige la rutina de cada día: se guarda al elegirla.</p>
            <WeekBuilder key={`${active.id}-${week}`} clientId={clientId} planId={active.id} week={week} days={wdays} sel={day} today={isToday(today) ? today : 0} onSel={(w) => setDay(w)} onCreate={(w) => setCreating(w)} />
            <div className="tp-week-tools">
              {cycle < 16 && <button className="tp-link light" disabled={weeksM.isPending} onClick={addWeek} title="Agrega otra semana copiando la última; luego cambias lo que quieras.">{cycle === 1 ? "+ Semanas distintas" : `+ Semana ${cycle + 1} (copia de la ${cycle})`}</button>}
              {cycle > 1 && week === cycle && <button className="tp-link light danger" disabled={weeksM.isPending} onClick={dropWeek}>Quitar semana {cycle}</button>}
              <button className="tp-link light" onClick={() => setAssign(true)}>Una rutina a varios días</button>
              {!!(active.allDays ?? active.days).length && <button className="tp-link light" onClick={() => setAsProgram(true)}>Guardar la semana como programa</button>}
            </div>
          </>) : (
            <div className="wk-strip" role="tablist" aria-label="Días de la semana">{DAYS.map((t, i) => { const w = i + 1, x = wdays.find((y) => y.weekday === w);
              return <button key={t} type="button" role="tab" aria-selected={day === w} className={`wk-chip${x ? " on" : ""}${day === w ? " sel" : ""}`} onClick={() => setDay(day === w ? 0 : w)}>
                <span>{t}</span><i aria-hidden />{isToday(w) && <small>hoy</small>}</button>; })}</div>
          )}
          {!build && day > 0 && (
            <div className="tp-dayc">
              <div className="tp-dayc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="tp-dayc-when">{DAYS_LONG[day - 1]}{isToday(day) ? " · hoy" : ""}</div>
                  <div className="tp-dayc-name">{d ? d.name : "Descanso"}</div>
                  {d && <div className="tp-dayc-sub">{d.items.length} ejercicio{d.items.length === 1 ? "" : "s"}{d.minutes ? ` · ${d.minutes} min aprox.` : ""} · solo para {first}</div>}
                </div>
                <button type="button" className="tp-dayc-x" aria-label="Plegar el día" onClick={() => setDay(0)}><Icon name="up" size={14} /></button>
              </div>
              {d ? (<>
                <div className="tp-items">{d.items.map((i, k) => <ItemRow key={i.id} n={k + 1} item={i} clientId={clientId} />)}</div>
                {d.items.some((i) => i.exerciseId) && <button type="button" className="tp-saveas" onClick={() => setAsRoutine(true)}><Icon name="download" size={13} /> Guardar este día como rutina</button>}
                <DayVideoBox clientId={clientId} clientName={clientName} day={d} />
              </>) : (
                <div className="tp-rest2">
                  <span className="tp-stage sm" aria-hidden><Guide size={60} pose="hydrate" /></span>
                  <div><b>Día de descanso</b><p>{first} lo verá así: agua, sueño y movilidad suave.</p></div>
                  <button className="tp-rest2-btn" onClick={() => setBuild(true)}>Ponerle rutina</button>
                </div>
              )}
            </div>
          )}
        </section>)}
      {creating !== null && active && <RoutineModal r={null} exercises={exs.data ?? []} noExercises={!!exs.data && !exs.data.length} sub={`Queda guardada en Rutinas y se asigna al ${DAYS_LONG[creating - 1].toLowerCase()} de ${first}.`}
        onClose={() => setCreating(null)} onSaved={(id) => { const w = creating; setDay(w); assignNew.mutate({ planId: active.id, weekdays: [w], templateId: id, week }); }} />}
      {asRoutine && d && <RoutineModal r={null} exercises={exs.data ?? []} noExercises={false} sub={`Se guarda en Rutinas con las series, repeticiones y descansos del ${DAYS_LONG[day - 1].toLowerCase()} de ${first}. Podrás asignarla a otros clientes.`}
        initial={{ name: d.name, minutes: d.minutes, items: d.items.filter((i) => i.exerciseId).map((i) => ({ exercise_id: i.exerciseId!, sets: i.sets, reps: i.reps, rest_seconds: i.rest })) }} onClose={() => setAsRoutine(false)} />}
      {asProgram && active && <SaveWeekProgram first={first} cycle={cycle} days={active.allDays ?? active.days} onClose={() => setAsProgram(false)} />}
      {prog && <ProgramModal clientId={clientId} first={first} hasActive={!!active} onClose={() => setProg(false)} onDone={() => { setDay(today); setWeekSel(null); }} />}
      {newPlan && <NewPlan clientId={clientId} hasActive={!!active} onClose={() => setNewPlan(false)} />}
      {assign && active && <AssignModal clientId={clientId} planId={active.id} weekday={day || today} week={week} weeks={cycle} dayLabel={DAYS_LONG[(day || today) - 1]} replacing={!!d} onClose={() => setAssign(false)} />}
    </div>
  );
}
// Los 7 días con su rutina a la vista (22-nov). Elegir en el selector asigna esa rutina a ese día en el momento (assign_day copia
// la rutina del catálogo); "Descanso" pide confirmar porque borra lo que se haya ajustado ese día.
function WeekBuilder({ clientId, planId, week, days, sel, today, onSel, onCreate }: { clientId: string; planId: string; week: number; days: PlanDay[]; sel: number; today: number; onSel: (w: number) => void; onCreate: (w: number) => void }) {
  const routines = useRoutines(), assign = useAssignDay(clientId), clear = useClearDay(clientId), [busy, setBusy] = useState<number | null>(null), [ask, setAsk] = useState<number | null>(null);
  const list = routines.data ?? [];
  const pick = (w: number, v: string) => {
    const cur = days.find((x) => x.weekday === w);
    if (v === "__cur") return;
    if (v === "__new") { onCreate(w); return; }
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
              <option value="__new">+ Crear rutina nueva…</option>
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
  const set = useSetDayVideo(clientId), input = useRef<HTMLInputElement>(null), [err, setErr] = useState(""), [play, setPlay] = useState(false), [yt, setYt] = useState(false);
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
          : day.videoRef && <button className="ghost-btn" style={{ height: 32, fontSize: 11.5 }} onClick={() => setYt(true)}>Ver</button>}</div>}
      {yt && day.videoRef && <VideoModal ytId={day.videoRef} title={day.name} sub="Vídeo de la rutina · YouTube" onClose={() => setYt(false)} />}
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

// Guardar la semana del cliente como programa (22-nov): queda en Catálogo → Programas para asignarla a otros con un toque. Se guardan
// las rutinas de cada día (las del catálogo); los ajustes de series o pesos de este cliente no (para eso, "Guardar este día como rutina").
function SaveWeekProgram({ first, cycle, days, onClose }: { first: string; cycle: number; days: PlanDay[]; onClose: () => void }) {
  // 22-nov (revisión): antes la duración quedaba igual a las semanas distintas (1 semana que se repite = programa de 1 semana, y
  // la revisión del plan quedaba a los 7 días). Ahora Yeff la elige, como al crear un programa en el catálogo (4 por defecto).
  const routines = useRoutines(), save = useSaveProgram(), [name, setName] = useState(`Semana de ${first}`), [err, setErr] = useState(""), [weeks, setWeeks] = useState(Math.max(cycle, 4));
  const known = new Set((routines.data ?? []).map((r) => r.id)), ok = days.filter((x) => x.templateId && known.has(x.templateId)), skipped = days.filter((x) => !x.templateId || !known.has(x.templateId));
  const go = () => {
    if (!name.trim()) return setErr("Ponle un nombre al programa."); if (!ok.some((x) => (x.week ?? 1) === 1)) return setErr("La semana 1 no tiene rutinas del catálogo para guardar.");
    setErr(""); save.mutate({ name: name.trim(), weeks: Math.max(weeks, cycle), notes: "", days: ok.map((x) => ({ week: x.week ?? 1, weekday: x.weekday, template_id: x.templateId! })) }, { onSuccess: onClose });
  };
  return (
    <Modal title="Guardar como programa" sub="La semana de este cliente queda en Catálogo → Programas. Después se la asignas a otro cliente con un toque desde su ficha." onClose={onClose}>
      <div className="modal-field"><label htmlFor="swp-n">Nombre del programa</label><input id="swp-n" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="modal-field"><label htmlFor="swp-w">Duración</label><select id="swp-w" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>{Array.from({ length: 17 - cycle }, (_, k) => cycle + k).map((i) => <option key={i} value={i}>{i} semana{i > 1 ? "s" : ""}</option>)}</select></div>
      <div className="modal-cap-hint">{cycle > 1 ? `${cycle} semanas distintas que se turnan durante ${weeks} semanas. ` : `Una semana que se repite ${weeks} veces. `}{ok.length} día{ok.length === 1 ? "" : "s"} con rutina: {ok.filter((x) => (x.week ?? 1) === 1).sort((a, b) => a.weekday - b.weekday).map((x) => `${DAYS[x.weekday - 1]} ${x.name}`).join(" · ")}.
        {skipped.length ? ` ${skipped.length} día${skipped.length === 1 ? "" : "s"} no se guarda${skipped.length === 1 ? "" : "n"} porque su rutina ya no está en el catálogo.` : ""} Se guardan las rutinas como están en el catálogo; los ajustes de series o pesos de {first} se quedan solo en su plan.</div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending || !routines.data} onClick={go}>{save.isPending ? "Guardando…" : "Guardar programa"}</button></div>
    </Modal>
  );
}
