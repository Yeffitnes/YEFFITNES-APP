"use client";
// "Resúmenes por enviar" (22-nov, pedido de Cristian): en el panel, como prioridad, los clientes que completaron su semana y aún
// no tienen su resumen enviado. "Revisar y enviar" abre su ficha en Resumen, donde Yeff ve la semana completa (entrenos,
// nutrición, reportes, hábitos, récords, peso), escribe su comentario y lo envía. Si no hay ninguno, no aparece.
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { useFocusAnchor } from "@/lib/focus";
import { usePendingWeekSums } from "@/lib/weeksum";
import { shortDate } from "@/lib/planmonth";

export function WeekSumsCard() {
  const q = usePendingWeekSums();
  useFocusAnchor("resumenes");
  const list = q.data ?? [];
  if (!list.length) return null;
  return (
    <div className="card req-card ws-card" id="resumenes">
      <div className="card-head"><div><div className="card-tag"><span className="live-dot" aria-hidden />Resúmenes por enviar</div>
        <div className="card-title">{list.length === 1 ? "1 cliente completó su semana" : `${list.length} clientes completaron su semana`}</div></div></div>
      {list.map((w) => (
        <div key={w.clientId} className="dsh-row req-line asked">
          <Link href={`/coach/clientes/${w.clientId}?tab=Resumen`} className="dsh-main">
            <div className="attn-avatar">{initials(w.name)}</div>
            <div className="attn-body"><div className="attn-name">{w.name}</div>
              <div className="attn-reason urgent">Completó su semana {w.n}</div>
              <div className="req-when">{shortDate(w.from)} al {shortDate(w.to)}</div></div>
          </Link>
          <div className="fu-acts"><Link className="dsh-write" href={`/coach/clientes/${w.clientId}?tab=Resumen`}><Icon name="send" size={12} /> Revisar y enviar</Link></div>
        </div>))}
      <p className="dsh-note">Al enviarlo, a tu cliente le llega una notificación y lo ve en su app con tu comentario.</p>
    </div>
  );
}
