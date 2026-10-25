"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "@/app/messages.css";
import { localDate, useClients, useCoachReports, useMe, useMyBookings, useTodayReport } from "@/lib/queries";
import { useMessagesRealtime, useUnread } from "@/lib/messages";
import { useProfile } from "@/components/Providers";
import { disablePush, enablePush, pushState, resyncPush, type PushState } from "@/lib/push-client";
import { hasFeature } from "@/lib/features";
import { useInstall } from "@/lib/install";

type Item = { key: string; text: string; href: string };
const PUSH_TXT: Record<PushState, string> = { unsupported: "Tu navegador no permite avisos. Instala la app en la pantalla de inicio e inténtalo de nuevo.", not_configured: "Los avisos aún no están configurados.", denied: "Bloqueaste los avisos. Actívalos en los ajustes del navegador o del teléfono.", off: "Activar avisos en este teléfono", on: "Avisos activados en este teléfono" };

function useItems(side: "client" | "coach"): Item[] {
  const { profileId } = useProfile(), me = useMe(side === "client" ? profileId : ""), cid = side === "client" ? me.data?.id ?? "" : "";
  const unread = useUnread(), today = localDate();
  const wantsReport = side === "client" && hasFeature(me.data?.features, "daily_report");
  const rep = useTodayReport(cid, today, wantsReport), bookings = useMyBookings(cid);
  const clients = useClients(), reports = useCoachReports();
  const items: Item[] = [], n = unread.data ?? 0;
  if (n > 0) items.push({ key: "msg", text: side === "coach" ? `${n} mensaje${n === 1 ? "" : "s"} sin leer` : `Tu coach te escribió (${n} sin leer)`, href: side === "coach" ? "/coach/mensajes" : "/inicio/mensajes" });
  if (side === "client") {
    if (wantsReport && rep.data === null) items.push({ key: "rep", text: "Aún no envías tu reporte de hoy", href: "/inicio" });
    const next = bookings.data?.[0];
    if (next) { const ms = new Date(next.startsAt).getTime() - Date.now(); if (ms < 36 * 3600_000) items.push({ key: "bk", text: `Tu sesión: ${new Date(next.startsAt).toLocaleDateString("es", { weekday: "long" })} a las ${new Date(next.startsAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`, href: "/inicio/agenda" }); }
  } else {
    const unseen = (reports.data ?? []).filter((r) => !r.seen).length, pending = (clients.data ?? []).filter((c) => c.status === "pending").length;
    if (unseen) items.push({ key: "rep", text: `${unseen} reporte${unseen === 1 ? "" : "s"} por revisar`, href: "/coach/reportes" });
    if (pending) items.push({ key: "pend", text: `${pending} cliente${pending === 1 ? "" : "s"} esperando plan`, href: "/coach/clientes" });
  }
  return items;
}

export function ActionsBar({ side }: { side: "client" | "coach" }) {
  useMessagesRealtime(side);
  const inst = useInstall(), items = useItems(side), unread = useUnread().data ?? 0, [open, setOpen] = useState(false), [ps, setPs] = useState<PushState>("off"), [busy, setBusy] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => { void pushState().then(setPs); void resyncPush(); }, []);
  useEffect(() => { const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }; try { void (unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.()); } catch { /* sin soporte */ } }, [unread]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }, esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const togglePush = async () => { if (busy || ps === "unsupported" || ps === "not_configured" || ps === "denied") return; setBusy(true); try { setPs(ps === "on" ? await disablePush() : await enablePush()); } finally { setBusy(false); } };
  const msgHref = side === "coach" ? "/coach/mensajes" : "/inicio/mensajes";
  return (
    <div className="actions-bar" ref={box}>
      <Link href={msgHref} className="act-btn" aria-label={`Mensajes${unread ? `, ${unread} sin leer` : ""}`}>
        <svg viewBox="0 0 20 20"><path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h10a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 14H9l-3.5 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7z" /></svg>
        <span className="act-label">Mensajes</span>{unread > 0 && <span className="act-dot">{unread > 9 ? "9+" : unread}</span>}
      </Link>
      <button type="button" className="act-btn" aria-label={`Avisos${items.length ? `, ${items.length}` : ""}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 20 20"><path d="M10 3.5a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 5.5h12c0-1-1.5-2-1.5-5.5A4.5 4.5 0 0 0 10 3.5zM8.3 15.5a1.8 1.8 0 0 0 3.4 0" /></svg>
        {items.length > 0 && <span className="act-dot">{items.length}</span>}
      </button>
      {open && <div className="act-pop" role="dialog" aria-label="Avisos">
        <div className="act-pop-title">Avisos</div>
        {!items.length && <p className="act-empty">Todo al día. No tienes pendientes.</p>}
        {items.map((i) => <Link key={i.key} href={i.href} className="act-item" onClick={() => setOpen(false)}>{i.text}<span aria-hidden>›</span></Link>)}
        {inst.canInstall && <button type="button" className="act-push" onClick={() => void inst.install()}><span aria-hidden style={{ fontSize: 16 }}>⬇️</span>Instalar la app en este teléfono</button>}
        {inst.iosHint && <p className="act-empty" style={{ margin: "8px 4px 0" }}>Para instalar en iPhone: toca Compartir y luego “Añadir a pantalla de inicio”.</p>}
        <button type="button" className="act-push" onClick={togglePush} disabled={busy || ps === "unsupported" || ps === "not_configured" || ps === "denied"}>
          <span className={`act-switch${ps === "on" ? " on" : ""}`} aria-hidden />{PUSH_TXT[ps]}
        </button>
      </div>}
    </div>
  );
}
