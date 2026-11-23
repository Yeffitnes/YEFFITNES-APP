"use client";
// "Sesiones agendadas" (22-nov, noche, pedido de Cristian): lo PRIMERO del panel de Yeff. Las sesiones de hoy y de mañana, cada
// una hasta que termina, con lo que puede hacer ahí mismo: Recordarle (aviso a su teléfono, una vez al día), Escribirle y
// Agregar a su calendario. Tocar el nombre abre la ficha. Sin sesiones hoy ni mañana, no aparece.
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { useFocusAnchor } from "@/lib/focus";
import { useNow } from "@/lib/use-now";
import { KIND_LABEL } from "@/lib/queries";
import { isToday, useRemindSession, useSoonSessions, type SoonSession } from "@/lib/sessions";
import { AddToCalendar } from "@/components/AddToCalendar";

const hour = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?a\.?\s?m\.?/i, " a. m.").replace(/\s?p\.?\s?m\.?/i, " p. m.");
function soon(s: SoonSession, now: Date) {
  const m = Math.round((new Date(s.startsAt).getTime() - now.getTime()) / 60_000);
  return m <= 0 ? "En curso" : m < 60 ? `En ${m} min` : m < 180 ? `En ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : null;
}

export function SessionsSoonCard() {
  const q = useSoonSessions(), remind = useRemindSession(), now = useNow(30_000);
  useFocusAnchor("sesiones");
  const list = (q.data ?? []).filter((s) => new Date(s.startsAt).getTime() + s.duration * 60_000 > now.getTime());
  if (!list.length) return null;
  const today = list.filter((s) => isToday(s.startsAt)), tomorrow = list.filter((s) => !isToday(s.startsAt));
  const ses = (n: number) => `${n} ${n === 1 ? "sesión" : "sesiones"}`;
  const title = today.length && tomorrow.length ? `${ses(today.length)} hoy · ${tomorrow.length} mañana` : today.length ? `${ses(today.length)} hoy` : `${ses(tomorrow.length)} mañana`;
  const group = (label: string, xs: SoonSession[]) => !!xs.length && (
    <div className="ss-group"><div className="ss-group-h">{label}</div>
      {xs.map((s) => { const live = soon(s, now), first = s.clientName.split(" ")[0];
        return (
          <div key={s.bookingId} className={`ss-row${live ? " live" : ""}`}>
            <Link href={`/coach/clientes/${s.clientId}`} className="ss-main">
              <span className="ss-time"><b>{hour(s.startsAt).replace(/ [ap]\. m\.$/, "")}</b><small>{/a\. m\./.test(hour(s.startsAt)) ? "a. m." : "p. m."}</small></span>
              <span className="ss-av" aria-hidden>{initials(s.clientName)}</span>
              <span className="ss-body"><b>{s.clientName}</b><small>{KIND_LABEL[s.kind] ?? "Sesión"} · {s.duration} min{live ? <> · <em>{live}</em></> : null}</small></span>
            </Link>
            <div className="ss-acts">
              {s.canRemind && (s.remindedToday
                ? <span className="ss-done"><Icon name="check" size={12} stroke={2.4} /> Recordado</span>
                : live === "En curso" ? null
                : <button type="button" className="ss-btn" disabled={remind.isPending && remind.variables === s.bookingId} title={`Le llega un aviso a ${first} con la hora`} onClick={() => remind.mutate(s.bookingId)}><Icon name="bell" size={13} /> Recordarle</button>)}
              <Link className="ss-btn ghost" href={`/coach/mensajes?c=${s.clientId}`}><Icon name="message" size={13} /> Escribirle</Link>
              <AddToCalendar s={s} who="coach" name={s.clientName} label="Calendario" className="ss-btn ghost" />
            </div>
          </div>); })}
    </div>);
  return (
    <section className="ss-card" id="sesiones" aria-labelledby="ss-title">
      <div className="ss-head"><div><div className="ss-tag"><span className="live-dot" aria-hidden />Sesiones agendadas</div><h2 id="ss-title">{title}</h2></div>
        <Link href="/coach/agenda" className="ss-link">Agenda <Icon name="arrow" size={12} /></Link></div>
      {group("Hoy", today)}
      {group("Mañana", tomorrow)}
      <p className="ss-note">A {list.length === 1 ? "tu cliente" : "tus clientes"} le{list.length === 1 ? "" : "s"} llega un aviso el día anterior, esa mañana y 1 hora antes. A ti también.</p>
    </section>
  );
}
