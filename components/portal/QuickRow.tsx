"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
// Fila compacta y plegable de Hoy (mensaje del coach, reporte, anuncios): una línea cuando no hay nada que hacer, se abre al tocarla.
export function QuickRow({ icon, title, sub, chip, tone = "idle", defaultOpen = false, children }: { icon: IconName; title: string; sub?: string; chip?: string; tone?: "idle" | "new" | "todo" | "ok"; defaultOpen?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen), can = !!children;
  return (
    <div className={`qrow ${tone}${open ? " open" : ""}`}>
      <button type="button" className="qrow-head" aria-expanded={can ? open : undefined} disabled={!can} onClick={() => setOpen(!open)}>
        <span className="qrow-icon"><Icon name={icon} size={16} stroke={1.8} /></span>
        <span className="qrow-text"><span className="qrow-title">{title}</span>{sub && <span className="qrow-sub">{sub}</span>}</span>
        {chip && <span className="qrow-chip">{chip}</span>}
        {can && <Icon name="chevron" size={14} className="qrow-chev" />}
      </button>
      {can && open && <div className="qrow-body">{children}</div>}
    </div>
  );
}
