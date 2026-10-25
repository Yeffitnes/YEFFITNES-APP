"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { initials } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import { BN_ICONS, SIDE_ICONS } from "./icons";
const SIDE = [["Hoy", "/inicio"], ["Mi plan", "/inicio/plan"], ["Agenda", "/inicio/agenda"], ["Progreso", "/inicio/progreso"], ["Objetivos", ""], ["Material", ""]];
const BN = [["HOY", "/inicio"], ["PLAN", "/inicio/plan"], ["AGENDA", "/inicio/agenda"], ["PROGRESO", "/inicio/progreso"], ["MATERIAL", ""]];
export function PortalSide() {
  const path = usePathname(), { profileId, name } = useProfile(), me = useMe(profileId);
  return (
    <aside className="sidebar">
      <div className="side-logo"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /></div>
      <nav className="side-nav">{SIDE.map(([t, h], i) => h
        ? <Link key={t} href={h} className={`side-link${path === h ? " active" : ""}`}><span dangerouslySetInnerHTML={{ __html: SIDE_ICONS[i] }} style={{ display: "contents" }} />{t}</Link>
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
      ? <Link key={t} href={h} className={`bn-link${path === h ? " active" : ""}`}><span dangerouslySetInnerHTML={{ __html: BN_ICONS[i] }} style={{ display: "contents" }} /><span className="bn-link-label">{t}</span></Link>
      : <span key={t} className="bn-link" style={{ opacity: 0.35 }}><span dangerouslySetInnerHTML={{ __html: BN_ICONS[i] }} style={{ display: "contents" }} /><span className="bn-link-label">{t}</span></span>)}</nav>
  );
}
