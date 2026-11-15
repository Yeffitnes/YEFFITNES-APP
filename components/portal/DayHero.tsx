"use client";
// Encabezado de Hoy (14-nov, pedido de Cristian para la demo con Jeff): el saludo, "Tu día" y la racha en un panel oscuro con brillo
// rojo, la estética de la marca. "Tu día" muestra lo que le toca hoy (entrenar, nutrición, hábitos, reporte) y lo que ya cumplió;
// cada uno lleva a su sección. Solo aparece lo que Jeff le activó y lo que le toca hoy.
import type { ReactNode } from "react";
import { localDate, useClientNutrition, useMealLogs, useTodayReport } from "@/lib/queries";
import { useHabitSpecs, useHabits } from "@/lib/extras";
import { valueOf } from "@/lib/habits";
import { todayWeekday } from "@/lib/week";
import { focusAnchor } from "@/lib/focus";
import { Icon } from "@/components/ui/Icon";

type Task = { key: string; label: string; done: boolean; anchor: string };
function useDayTasks(cid: string, features: string[], trainingToday: boolean, trainingDone: boolean, hasPlan: boolean): Task[] | null {
  const today = localDate(), hasN = features.includes("nutrition") && hasPlan, hasR = features.includes("daily_report") && hasPlan;
  const nut = useClientNutrition(hasN ? cid : ""), ml = useMealLogs(hasN ? cid : "", today), rep = useTodayReport(cid, today, hasR);
  const hab = useHabits(hasPlan ? cid : "", 1), specs = useHabitSpecs(hasPlan ? cid : "");
  if (!cid) return null;
  const wd = todayWeekday(), meals = (nut.data?.meals ?? []).filter((m) => m.id && (m.weekday === null || m.weekday === wd));
  const out: Task[] = [];
  if (trainingToday) out.push({ key: "t", label: "Entrenar", done: trainingDone, anchor: "rutina" });
  if (hasN && meals.length) out.push({ key: "n", label: "Nutrición", done: meals.every((m) => (ml.data ?? []).includes(m.id!)), anchor: "nutricion" });
  if (hasPlan && specs.data?.length && hab.data !== null) { const row = hab.data?.find((h) => h.day === today); out.push({ key: "h", label: "Hábitos", done: specs.data.every((s) => valueOf(row, s) != null), anchor: "habitos" }); }
  if (hasR) out.push({ key: "r", label: "Reporte", done: !!rep.data, anchor: "reporte" });
  return out;
}
export function DayHero({ cid, eyebrow, first, sub, features, trainingToday, trainingDone, hasPlan, children }: { cid: string; eyebrow: string; first: string; sub: string; features: string[]; trainingToday: boolean; trainingDone: boolean; hasPlan: boolean; children: ReactNode }) {
  const tasks = useDayTasks(cid, features, trainingToday, trainingDone, hasPlan) ?? [], done = tasks.filter((t) => t.done).length, all = tasks.length > 0 && done === tasks.length;
  const R = 22, C = 2 * Math.PI * R, pct = tasks.length ? done / tasks.length : 0;
  const go = (a: string) => { const el = document.getElementById(a); if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); focusAnchor(a); } };
  return (
    <section className="day-hero" aria-label="Tu día">
      <div className="dh-top">
        <div className="dh-greet"><div className="dh-eyebrow">{eyebrow}</div><h1>Hola, {first}</h1><p>{sub}</p></div>
        {tasks.length > 0 && <div className="dh-ring" role="img" aria-label={`${done} de ${tasks.length} cosas de hoy hechas`}>
          <svg viewBox="0 0 56 56" width="62" height="62"><circle cx="28" cy="28" r={R} className="dh-ring-bg" /><circle cx="28" cy="28" r={R} className="dh-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 28 28)" /></svg>
          <span>{all ? <Icon name="check" size={18} stroke={2.6} /> : <><b>{done}</b>/{tasks.length}</>}</span>
        </div>}
      </div>
      {tasks.length > 0 && <div className="dh-tasks">
        <div className="dh-label">{all ? "Todo listo por hoy" : "Tu día"}</div>
        <div className="dh-chips">{tasks.map((t) => <button key={t.key} type="button" className={`dh-chip${t.done ? " done" : ""}`} onClick={() => go(t.anchor)} aria-label={`${t.label}: ${t.done ? "hecho" : "pendiente"}`}>
          <i aria-hidden>{t.done && <Icon name="check" size={11} stroke={3} />}</i>{t.label}</button>)}</div>
      </div>}
      <div className="dh-streak">{children}</div>
    </section>
  );
}
