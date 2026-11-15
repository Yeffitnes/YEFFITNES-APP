"use client";
// El resumen de la semana que Jeff le envía al cliente (pedido de Cristian, 13-nov). Lo mismo ve Jeff en la vista previa antes de
// enviar y el cliente al abrirlo. Todo sale de sus datos (useWeek): nada se inventa. Compara con su semana anterior cuando la hay.
// Arriba: lo más destacado y el comentario de Jeff. Luego: números con su cambio, peso movido por día (esta semana frente a la
// anterior), hábitos día a día contra su meta y cómo subió de peso en cada ejercicio.
import { useWeek } from "@/components/WeekSummary";
import { addDays, shortDate } from "@/lib/planmonth";
import { fmtHabit, isLowS, type HabitSpec } from "@/lib/habits";
import { Icon } from "@/components/ui/Icon";
import type { WeekSpan } from "@/lib/clientweek";

const dec = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const kgs = (n: number) => `${Math.round(n).toLocaleString("es-CO")} kg`;
const span = (n: number, from: string): WeekSpan => { const days = Array.from({ length: 7 }, (_, i) => addDays(from, i)); return { n, from, to: days[6], days, complete: true, day: 7, left: 0, completesOn: addDays(from, 7) }; };
const dayLbl = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es", { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3);
type Delta = { txt: string; dir: "up" | "down" | "same" } | null;
// Cambio frente a la semana anterior. pct: en porcentaje (peso movido); si no, en la misma unidad.
function delta(cur: number | null, prev: number | null, opts: { pct?: boolean; unit?: string; fmt?: (n: number) => string } = {}): Delta {
  if (cur == null || prev == null) return null;
  const d = cur - prev; if (Math.abs(d) < 0.05) return { txt: "igual", dir: "same" };
  if (opts.pct) { if (prev <= 0) return null; const p = Math.round((d / prev) * 100); return p === 0 ? { txt: "igual", dir: "same" } : { txt: `${p > 0 ? "+" : "−"}${Math.abs(p)} %`, dir: p > 0 ? "up" : "down" }; }
  const f = opts.fmt ?? dec; return { txt: `${d > 0 ? "+" : "−"}${f(Math.abs(d))}${opts.unit ? ` ${opts.unit}` : ""}`, dir: d > 0 ? "up" : "down" };
}
const Chip = ({ d }: { d: Delta }) => !d ? null : <span className={`wr-delta ${d.dir}`}>{d.dir !== "same" && <Icon name={d.dir} size={11} />}{d.txt}</span>;

export function WeekReport({ clientId, first, n, from, note, mode }: { clientId: string; first: string; n: number; from: string; note?: string | null; mode: "preview" | "client" }) {
  const cur = span(n, from), prevSpan = n > 1 ? span(n - 1, addDays(from, -7)) : null;
  const w = useWeek(clientId, cur), p = useWeek(clientId, prevSpan), hasPrev = !!prevSpan;
  if (w.pending || p.pending) return <div aria-busy="true"><div className="sk" style={{ height: 120, marginBottom: 12 }} /><div className="sk" style={{ height: 220 }} /></div>;
  const you = mode === "client" ? "" : `${first} `, P = (a: unknown) => (hasPrev ? a : null);
  // Lo más destacado: el primer logro real de la lista.
  const volUp = hasPrev && p.volume > 0 ? Math.round(((w.volume - p.volume) / p.volume) * 100) : null;
  const head = w.newRecs.length ? `${w.newRecs.length === 1 ? "1 récord nuevo" : `${w.newRecs.length} récords nuevos`} esta semana`
    : w.planned > 0 && w.done >= w.planned ? "Cumpliste todos tus entrenamientos"
    : volUp != null && volUp >= 5 ? `Moviste un ${volUp} % más de peso que la semana anterior`
    : w.done ? `Entrenaste ${w.done} ${w.done === 1 ? "día" : "días"}` : "Tu semana";
  // Lo que mejoró frente a la anterior y lo que quedó por debajo de la meta (honesto: también lo que falta).
  const better: string[] = [], work: string[] = [];
  if (hasPrev) {
    if (w.done > p.done) better.push("más entrenamientos");
    if (volUp != null && volUp > 0) better.push("más peso movido");
    if (w.mealDays != null && p.mealDays != null && w.mealDays > p.mealDays) better.push("más días con nutrición completa");
    if (w.reports != null && p.reports != null && w.reports > p.reports) better.push("más reportes");
  }
  const tiles: { k: string; v: string; s?: string; d: Delta; low?: boolean }[] = [];
  if (w.plan || w.done) tiles.push({ k: "Entrenamientos", v: w.planned ? `${w.done} de ${w.planned}` : String(w.done), s: w.planned ? `${Math.round((w.done / w.planned) * 100)} % cumplido` : "días", d: P(delta(w.done, p.done)) as Delta });
  if (w.volume > 0 || (hasPrev && p.volume > 0)) tiles.push({ k: "Peso movido", v: kgs(w.volume), s: `${w.sets} series`, d: P(delta(w.volume, p.volume, { pct: true })) as Delta });
  if (w.effort != null) tiles.push({ k: "Esfuerzo", v: `${dec(w.effort)}/10`, s: "promedio", d: P(delta(w.effort, p.effort)) as Delta });
  if (w.mealDays != null) tiles.push({ k: "Nutrición", v: `${w.mealDays} de 7`, s: "días completos", d: P(delta(w.mealDays, p.mealDays)) as Delta });
  if (w.reports != null) tiles.push({ k: "Reportes", v: `${w.reports} de 7`, s: "días", d: P(delta(w.reports, p.reports)) as Delta });
  for (const { s, st } of w.habits) {
    const pr = p.habits.find((x) => x.s.id === s.id)?.st;
    if (s.kind === "check") tiles.push({ k: s.name, v: `${st.done} de 7`, s: s.goal != null ? `días · meta ${s.goal}` : "días hecho", d: P(delta(st.done, pr?.done ?? null)) as Delta, low: st.ok === false });
    else { tiles.push({ k: s.name, v: fmtHabit(s, st.avg!), s: s.key === "sleep" ? "por noche, promedio" : "al día, promedio", d: P(delta(st.avg, pr?.avg ?? null, { fmt: (x) => (s.key === "steps" ? Math.round(x).toLocaleString("es-CO") : dec(x)), unit: s.key === "water" ? "vasos" : s.key === "sleep" ? "h" : s.key === "steps" ? "" : s.unit ?? "" })) as Delta, low: st.ok === false });
      if (pr?.avg != null && st.avg! > pr.avg + 0.05) better.push(s.key === "sleep" ? "dormiste más" : s.key === "water" ? "tomaste más agua" : s.key === "steps" ? "caminaste más" : `más ${s.name.toLowerCase()}`); }
    if (st.ok === false) work.push(s.key === "sleep" ? "dormir más" : s.key === "water" ? "tomar más agua" : s.key === "steps" ? "caminar más" : s.name.toLowerCase());
  }
  if (w.lastW != null) tiles.push({ k: "Peso corporal", v: `${dec(w.lastW)} kg`, s: w.wDelta != null ? `${w.wDelta > 0 ? "+" : w.wDelta < 0 ? "−" : ""}${dec(Math.abs(w.wDelta))} kg en la semana` : "última medida", d: null });
  // Ejercicios: cuánto subió su mejor peso frente a la semana anterior (o sus mejores pesos si es la primera).
  const ups = hasPrev ? Array.from(w.byEx.entries()).map(([ex, b]) => ({ ex, b, a: p.byEx.get(ex) })).filter((x) => x.a != null && x.b > x.a).sort((x, y) => (y.b - y.a!) - (x.b - x.a!)).slice(0, 5) : [];
  const bests = Array.from(w.byEx.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVol = Math.max(1, ...w.dailyVolume, ...(hasPrev ? p.dailyVolume : []));
  const numHabits = w.habitDaily.filter((x) => x.s.kind === "number" && x.vals.some((v) => v != null));
  return (
    <div className="wr">
      <div className="wr-hero">
        <div className="wr-eyebrow">Semana {n} · {shortDate(cur.from)} al {shortDate(cur.to)}</div>
        <div className="wr-head">{head}</div>
        {!!better.length && <p className="wr-better"><Icon name="up" size={13} /> Frente a la semana anterior: {better.slice(0, 4).join(", ")}.</p>}
        {!hasPrev && <p className="wr-better">Es {mode === "client" ? "tu" : "su"} primera semana: desde la próxima verás la comparación.</p>}
      </div>
      {note && <blockquote className="wr-note"><span>Jeff</span>{note}</blockquote>}
      {!tiles.length ? <p className="empty-note">{mode === "client" ? "No registraste nada esa semana." : `${first} no registró nada esa semana.`}</p> : (
        <div className="wr-grid">{tiles.map((t) => <div key={t.k} className={`wr-tile${t.low ? " low" : ""}`}><small>{t.k}</small><b>{t.v}</b><span>{t.s}</span><Chip d={t.d} /></div>)}</div>)}
      {(w.volume > 0 || (hasPrev && p.volume > 0)) && <section className="wr-sec">
        <h3>Peso movido por día</h3>
        <div className="wr-chart" role="img" aria-label={`Peso movido por día: ${w.dailyVolume.map((v, i) => `${dayLbl(cur.days[i])} ${kgs(v)}`).join(", ")}`}>
          {cur.days.map((d, i) => <div key={d} className="wr-col"><div className="wr-bars">
            {hasPrev && <i className="prev" style={{ height: `${(p.dailyVolume[i] / maxVol) * 100}%` }} />}
            <i className="cur" style={{ height: `${(w.dailyVolume[i] / maxVol) * 100}%` }} /></div>
            <small>{dayLbl(d)}</small></div>)}
        </div>
        <p className="wr-legend"><i className="cur" /> esta semana {hasPrev && <><i className="prev" /> semana anterior (mismo día)</>} · Peso movido = repeticiones × kilos de cada serie.</p>
      </section>}
      {!!numHabits.length && <section className="wr-sec">
        <h3>Hábitos día a día</h3>
        {numHabits.map(({ s, vals }) => <HabitRow key={s.id} s={s} vals={vals} days={cur.days} />)}
        <p className="wr-legend"><i className="cur" /> cumplió la meta <i className="lowc" /> por debajo · La línea es la meta.</p>
      </section>}
      {(ups.length > 0 || bests.length > 0) && <section className="wr-sec">
        <h3>{ups.length ? "Subiste de peso en" : "Tus mejores pesos de la semana"}</h3>
        {(ups.length ? ups.map((x) => ({ ex: x.ex, txt: `${dec(x.a!)} → ${dec(x.b)} kg`, d: w.newRecs.some((r) => r.exercise === x.ex) ? `+${dec(x.b - x.a!)} kg · récord` : `+${dec(x.b - x.a!)} kg` })) : bests.map(([ex, b]) => ({ ex, txt: `${dec(b)} kg`, d: "" }))).map((x) =>
          <div key={x.ex} className="wr-ex"><b>{x.ex}</b><span>{x.txt}</span>{x.d && <em>{x.d}</em>}</div>)}
        {w.newRecs.filter((r) => !ups.some((x) => x.ex === r.exercise)).map((r) => <div key={r.exercise} className="wr-ex rec"><b>{r.exercise}</b><span>récord: {dec(r.best)} kg × {r.reps}</span>{r.prev != null && <em>antes {dec(r.prev)}</em>}</div>)}
      </section>}
      {!!work.length && <p className="wr-work"><Icon name="target" size={14} /> Para la próxima semana: {work.join(", ")} (quedó por debajo de {mode === "client" ? "tu" : "su"} meta).</p>}
      {mode === "preview" && <p className="wk-note">Así lo verá {you.trim() || "el cliente"} en su app.</p>}
    </div>
  );
}
function HabitRow({ s, vals, days }: { s: HabitSpec; vals: (number | null)[]; days: string[] }) {
  const max = Math.max((s.goal ?? 0) * 1.25, ...vals.map((v) => v ?? 0)) || 1;   // la meta nunca queda pegada arriba
  return (
    <div className="wr-hab">
      <div className="wr-hab-head"><b>{s.name}</b>{s.goal != null && <span>meta {fmtHabit(s, s.goal)}</span>}</div>
      <div className="wr-hab-bars" role="img" aria-label={`${s.name}: ${vals.map((v, i) => `${dayLbl(days[i])} ${v == null ? "sin anotar" : fmtHabit(s, v)}`).join(", ")}`}>
        {s.goal != null && <span className="wr-goal" style={{ bottom: `${(s.goal / max) * 100}%` }} />}
        {vals.map((v, i) => <div key={days[i]} className="wr-hcol"><i className={v == null ? "none" : isLowS(s, v) ? "low" : ""} style={{ height: v == null ? 3 : `${Math.max(6, (v / max) * 100)}%` }} /><small>{dayLbl(days[i])}</small></div>)}
      </div>
    </div>
  );
}
