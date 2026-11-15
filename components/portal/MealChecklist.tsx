"use client";
import { useState } from "react";
import { localDate, useLogMeal, useMealLock, useMealLogs, type NutMeal } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { CHECK_ICON } from "./icons";
import { GuideFace } from "./Guide";
// Comidas de hoy. Cada fila se pliega: se ve el nombre; al tocarla aparece qué toca comer; el círculo marca (y desmarca) que ya lo cumplió.
// Al marcar todas, el día de nutrición queda completo y Jeff recibe el aviso.
export function MealChecklist({ clientId, meals }: { clientId: string; meals: NutMeal[]; compact?: boolean }) {
  const date = localDate(), logs = useMealLogs(clientId, date), log = useLogMeal(clientId, date), [open, setOpen] = useState<string | null>(null);
  const done = new Set(logs.data ?? []), list = meals.filter((m) => m.id), n = list.filter((m) => done.has(m.id!)).length, all = list.length > 0 && n === list.length;
  // Corregir UNA vez (0042): con todo marcado, desmarcar abre la única corrección del día; después ya no se puede desmarcar.
  const lock = useMealLock(clientId, date), used = (lock.data ?? 0) >= 1, frozen = all && used;
  if (!list.length) return null;
  return (
    <div className="meal-check">
      <div className="routine-progress-bar"><div className="routine-progress-fill" style={{ width: `${(n / list.length) * 100}%` }} /></div>
      <div className="routine-progress-count">{n} / {list.length} comidas</div>
      {n === 0 && <p className="guide-hint"><Icon name="check" size={13} stroke={2.2} /> Toca una comida para ver qué toca. Cuando la cumplas, marca el círculo.</p>}
      <div>{list.map((m) => { const on = done.has(m.id!), isOpen = open === m.id; return (
        <div key={m.id} className={`meal-row${on ? " done" : ""}${isOpen ? " open" : ""}`}>
          <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? "Desmarcar" : "Marcar"} ${m.name}`} className="ex-check meal-check-btn" disabled={logs.isPending || log.isPending || (frozen && on)} title={frozen && on ? "Ya corregiste tu nutrición de hoy" : undefined} onClick={() => log.mutate({ mealId: m.id!, done: !on })} dangerouslySetInnerHTML={{ __html: CHECK_ICON }} />
          <button type="button" className="meal-row-body" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id!)}>
            <span className="meal-row-name">{m.name}</span>
            {isOpen && <span className="meal-row-text">{m.content}</span>}
          </button>
          <Icon name="chevron" size={13} className="meal-chev" style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
        </div>); })}</div>
      {all && <div className="day-complete dc-guide" role="status"><span className="gd-pop"><GuideFace size={36} /></span><span><b>Nutrición del día completada.</b> Tu coach ya lo sabe.{used ? " Ya usaste tu corrección: queda así." : " Si te equivocaste, puedes corregirla una vez."}</span></div>}
    </div>
  );
}
