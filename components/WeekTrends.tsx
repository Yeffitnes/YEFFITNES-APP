"use client";
// "Semana a semana" en Progreso (22-nov, pedido de Cristian): una gráfica por métrica con las últimas semanas del cliente, su
// promedio y si la última semana completa fue más o menos que la anterior; debajo, todas las métricas en una lista corta para
// compararlas de un vistazo. Lo mismo para el cliente (en su Progreso) y para Yeff (en la ficha). Datos: lib/weektrends.ts.
import { useState } from "react";
import { useWeekStart } from "@/components/WeekSummary";
import { compare, useWeekTrends, type Metric, type TrendWeek } from "@/lib/weektrends";
import { shortDate } from "@/lib/planmonth";

// El promedio de un conteo lleva un decimal (3,3 reportes por semana); los números grandes van sin decimales.
const mfmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("es-CO") : String(Math.round(v * 10) / 10).replace(".", ","));
const sign = (d: number, m: Metric) => `${d > 0 ? "+" : "−"}${m.fmt(Math.abs(d))}${m.unit}`;
function vsText(m: Metric, d: number | null) {
  if (d == null) return null;
  if (Math.abs(d) < 1e-9) return "igual que la semana anterior";
  if (m.key === "weight") return `${d > 0 ? "subió" : "bajó"} ${m.fmt(Math.abs(d))} kg`;
  return `${sign(d, m)} · ${d > 0 ? "más" : "menos"} que la semana anterior`;
}

function Bars({ m, weeks }: { m: Metric; weeks: TrendWeek[] }) {
  const vs = m.vals.map((v) => v ?? 0), of = m.of?.map((v) => v ?? 0) ?? [];
  const isW = m.key === "weight", have = m.vals.filter((v): v is number => v != null);
  const hi = Math.max(1e-9, ...vs, ...of), lo = isW && have.length ? Math.min(...have) - 1 : 0, top = isW && have.length ? Math.max(...have) + 1 : hi;
  const h = (v: number) => Math.max(3, ((v - lo) / (top - lo)) * 100);
  const c = compare(m, weeks), meanH = c.mean != null && c.count > 1 ? h(c.mean) : null;
  return (
    <div className="wt-chart" role="img" aria-label={`${m.label} por semana: ${weeks.map((w, i) => `semana ${w.n} ${m.vals[i] == null ? "sin dato" : m.fmt(m.vals[i]!)}`).join(", ")}`}>
      <div className="wt-plot">
        {meanH != null && <div className="wt-mean" style={{ bottom: `${meanH}%` }}><span>prom. {mfmt(c.mean!)}</span></div>}
        {weeks.map((w, i) => { const v = m.vals[i];
          return (
            <div key={w.n} className={`wt-col${w.complete ? "" : " now"}${c.last?.w.n === w.n ? " last" : ""}`}>
              <span className="wt-val">{v == null ? "–" : m.fmt(v)}</span>
              <div className="wt-track">{m.of && of[i] > 0 && <div className="wt-of" style={{ height: `${h(of[i])}%` }} />}{v != null && <div className="wt-bar" style={{ height: `${h(v)}%` }} />}</div>
            </div>); })}
      </div>
      <div className="wt-x">{weeks.map((w) => <span key={w.n} className={w.complete ? "" : "now"}>{w.complete ? `S${w.n}` : "Ahora"}</span>)}</div>
    </div>
  );
}

export function WeekTrends({ clientId, mode }: { clientId: string; mode: "client" | "coach" }) {
  const start = useWeekStart(clientId), t = useWeekTrends(clientId, start.data), mine = mode === "client", [sel, setSel] = useState("train");
  if (start.isError || t.error) return null;
  if (t.pending) return <div className="card wt-card" style={{ marginBottom: 18 }}><div className="sk" style={{ height: 180, opacity: 0.2 }} /></div>;
  const done = t.weeks.filter((w) => w.complete).length;
  const ms = t.metrics.filter((m) => m.vals.some((v) => v != null && v > 0));
  const m = ms.find((x) => x.key === sel) ?? ms[0];
  const cur = t.weeks[t.weeks.length - 1];
  return (
    <section className="card wt-card" style={{ marginBottom: 18 }} aria-labelledby="wt-title">
      <div className="wt-tag">Semana a semana</div>
      <h3 id="wt-title" className="wt-title">{done ? (mine ? "Así van tus semanas" : "Cómo van sus semanas") : mine ? "Tu primera semana" : "Su primera semana"}</h3>
      <p className="wt-sub">{done ? `Semanas de 7 días desde que ${mine ? "empezaste" : "empezó"}. La comparación y el promedio usan las semanas completas; “Ahora” es la semana ${cur.n}, día ${cur.days} de 7.`
        : `Cuando ${mine ? "completes" : "complete"} la semana 1 (el ${shortDate(addOne(cur.to))}) aquí verás la comparación semana a semana.`}</p>
      {!ms.length || !m ? <p className="wt-empty">{mine ? "Aún no hay registros para comparar." : "Aún no ha registrado nada para comparar."}</p> : (<>
        <div className="wt-chips" role="group" aria-label="Elegir qué comparar">{ms.map((x) => <button key={x.key} type="button" aria-pressed={x.key === m.key} className={x.key === m.key ? "on" : ""} onClick={() => setSel(x.key)}>{x.label}</button>)}</div>
        <Head m={m} weeks={t.weeks} />
        <Bars m={m} weeks={t.weeks} />
        {done > 0 && <div className="wt-list" aria-label="Todas las métricas: última semana completa contra la anterior">
          <div className="wt-row wt-row-h"><span>Última semana</span><span>vs anterior</span><span>Promedio</span></div>
          {ms.map((x) => { const c = compare(x, t.weeks);
            return (
              <button type="button" key={x.key} className={`wt-row${x.key === m.key ? " on" : ""}`} onClick={() => setSel(x.key)}>
                <span className="wt-row-name">{x.label}<b>{c.last ? `${x.fmt(c.last.v)}${x.unit}` : "–"}</b></span>
                <span className={`wt-d${c.delta == null || Math.abs(c.delta) < 1e-9 ? "" : c.delta > 0 ? " up" : " down"}`}>{c.delta == null ? "–" : Math.abs(c.delta) < 1e-9 ? "igual" : sign(c.delta, x)}</span>
                <span className="wt-avg">{x.key === "weight" || c.mean == null ? "–" : `${mfmt(c.mean)}${x.unit}`}</span>
              </button>); })}
        </div>}
      </>)}
    </section>
  );
}
const addOne = (ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

function Head({ m, weeks }: { m: Metric; weeks: TrendWeek[] }) {
  const c = compare(m, weeks), vs = vsText(m, c.delta);
  return (
    <div className="wt-head">
      <div className="wt-big"><b>{c.last ? m.fmt(c.last.v) : "–"}<small>{m.unit}</small></b><span>{c.last ? `semana ${c.last.w.n} · ${m.hint}` : m.hint}</span></div>
      <div className="wt-facts">
        {vs && <span className={`wt-vs${c.delta && c.delta > 0 ? " up" : ""}`}>{vs}</span>}
        {c.mean != null && c.count > 1 && m.key !== "weight" && <span>Promedio: <b>{mfmt(c.mean)}{m.unit}</b> por semana ({c.count} semanas)</span>}
      </div>
    </div>
  );
}
