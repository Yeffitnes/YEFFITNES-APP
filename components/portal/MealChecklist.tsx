"use client";
import { localDate, useLogMeal, useMealLogs, type NutMeal } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { CHECK_ICON } from "./icons";
// Comidas de hoy con check: el cliente toca cada una al cumplirla. Al marcar todas, el día de nutrición queda completo y Jeff recibe el aviso.
export function MealChecklist({ clientId, meals, compact }: { clientId: string; meals: NutMeal[]; compact?: boolean }) {
  const date = localDate(), logs = useMealLogs(clientId, date), log = useLogMeal(clientId, date);
  const done = new Set(logs.data ?? []), list = meals.filter((m) => m.id), n = list.filter((m) => done.has(m.id!)).length, all = list.length > 0 && n === list.length;
  if (!list.length) return null;
  return (
    <div className="meal-check">
      <div className="routine-progress-bar"><div className="routine-progress-fill" style={{ width: `${(n / list.length) * 100}%` }} /></div>
      <div className="routine-progress-count">{n} / {list.length} comidas</div>
      {n === 0 && <p className="guide-hint"><Icon name="check" size={13} stroke={2.2} /> Toca cada comida cuando la cumplas. Al completar todas, tu coach recibe el aviso.</p>}
      <div>{list.map((m) => { const on = done.has(m.id!); return (
        <button key={m.id} type="button" role="checkbox" aria-checked={on} className={`meal-row${on ? " done" : ""}`} disabled={logs.isPending} onClick={() => log.mutate({ mealId: m.id!, done: !on })}>
          <span className="ex-check" dangerouslySetInnerHTML={{ __html: CHECK_ICON }} />
          <span className="meal-row-body"><span className="meal-row-name">{m.name}</span>{!compact && <span className="meal-row-text">{m.content}</span>}{compact && <span className="meal-row-text">{m.content.split("\n")[0]}</span>}</span>
        </button>); })}</div>
      {all && <div className="day-complete" role="status"><span className="day-complete-icon"><Icon name="check" size={16} stroke={2.4} /></span><span><b>Nutrición del día completada.</b> Tu coach ya lo sabe.</span></div>}
    </div>
  );
}
