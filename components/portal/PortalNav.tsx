"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/queries";
import { useUnread } from "@/lib/messages";
import { useProfile } from "@/components/Providers";
import { initials } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import { BN_ICONS, SIDE_ICONS } from "./icons";
const MSG_ICON = "<svg viewBox=\"0 0 20 20\"><path d=\"M3.5 5.5A1.5 1.5 0 0 1 5 4h10a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 14H9l-3.5 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7z\"/></svg>";
const SIDE = [["Hoy", "/inicio"], ["Mi plan", "/inicio/plan"], ["Agenda", "/inicio/agenda"], ["Progreso", "/inicio/progreso"], ["Objetivos", "/inicio/objetivos"], ["Mensajes", "/inicio/mensajes"], ["Material", "/inicio/material"]];
const BN = [["HOY", "/inicio"], ["PLAN", "/inicio/plan"], ["AGENDA", "/inicio/agenda"], ["PROGRESO", "/inicio/progreso"], ["MATERIAL", "/inicio/material"]];
export function PortalSide() {
  const path = usePathname(), { profileId, name } = useProfile(), me = useMe(profileId), unread = useUnread().data ?? 0;
  return (
    <aside className="sidebar">
      <div className="side-logo"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /></div>
      <nav className="side-nav">{SIDE.map(([t, h], i) => h
        ? <Link key={t} href={h} prefetch className={`side-link${path === h ? " active" : ""}`}><span dangerouslySetInnerHTML={{ __html: t === "Mensajes" ? MSG_ICON : SIDE_ICONS[i > 5 ? 5 : i] }} style={{ display: "contents" }} />{t}{t === "Mensajes" && unread > 0 && <span className="badge">{unread}</span>}</Link>
        : <span key={t} className="side-link" style={{ opacity: 0.35, cursor: "default" }}><span dangerouslySetInnerHTML={{ __html: SIDE_ICONS[i] }} style={{ display: "contents" }} />{t}</span>)}</nav>
      <div className="side-spacer" />
      <div className="side-client"><div className="side-avatar">{initials(name)}</div>
        <div style={{ flex: 1 }}><div className="side-client-name">{name || "Cliente"}</div><div className="side-client-plan">{me.data?.planName ? `Plan ${me.data.planName}` : "Sin plan"}</div></div>
        <form action={signOut}><button style={{ background: "none", border: 0, color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Salir</button></form></div>
    </aside>
  );
}
export function PortalBottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">{BN.map(([t, h], i) => h
      ? <Link key={t} href={h} prefetch className={`bn-link${path === h ? " active" : ""}`}><span dangerouslySetInnerHTML={{ __html: BN_ICONS[i] }} style={{ display: "contents" }} /><span className="bn-link-label">{t}</span></Link>
      : <span key={t} className="bn-link" style={{ opacity: 0.35 }}><span dangerouslySetInnerHTML={{ __html: BN_ICONS[i] }} style={{ display: "contents" }} /><span className="bn-link-label">{t}</span></span>)}</nav>
  );
}
