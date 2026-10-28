"use client";
import { localDate, useClientNutrition, useMealLogs } from "@/lib/queries";
import { todayWeekday } from "@/lib/week";
import { Guide } from "./Guide";
// "Día completado": aparece cuando el cliente terminó lo que tenía hoy (entrenamiento y/o nutrición) y le recuerda que su coach ya lo sabe.
export function DayDone({ cid, features, trainingToday, trainingDone }: { cid: string; features: string[]; trainingToday: boolean; trainingDone: boolean }) {
  const hasN = features.includes("nutrition"), nut = useClientNutrition(hasN ? cid : ""), logs = useMealLogs(hasN ? cid : "", localDate());
  const wd = todayWeekday(), meals = (nut.data?.meals ?? []).filter((m) => m.weekday === null || m.weekday === wd), nDone = meals.filter((m) => m.id && (logs.data ?? []).includes(m.id)).length;
  const nutPlanned = hasN && meals.length > 0, nutDone = nutPlanned && nDone === meals.length;
  if (!trainingToday && !nutPlanned) return null;
  const ok = (!trainingToday || trainingDone) && (!nutPlanned || nutDone);
  if (!ok) return null;
  const parts = [trainingToday && "entrenamiento", nutPlanned && "nutrición"].filter(Boolean).join(" y ");
  return (
    <div className="day-complete big dc-guide" role="status"><span className="gd-pop"><Guide size={44} pose="cheer" talking={false} /></span>
      <span><b>Día completado</b><br />Tu {parts} de hoy están al día. Tu coach ya lo sabe.</span></div>
  );
}
