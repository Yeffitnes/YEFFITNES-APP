"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnread } from "@/lib/messages";
const I = {
  dash: <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></>,
  cli: <><circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></>,
  ex: <path d="M4.5 6.5h11M4.5 10h11M4.5 13.5h7" />,
  rut: <><rect x="3.5" y="3.5" width="13" height="13" rx="3" /><path d="M7 10h6M10 7v6" /></>,
  ag: <><rect x="3.2" y="4" width="13.6" height="12.5" rx="2.5" /><line x1="3.2" y1="7.6" x2="16.8" y2="7.6" /></>,
  nut: <path d="M10 3c3 2 5 4.5 5 7.5a5 5 0 0 1-10 0C5 7.500 7 5 10 3zM10 8v5" />,
  rep: <><rect x="3.5" y="4" width="13" height="12" rx="2.5" /><path d="M8 8.2l4 1.8-4 1.8V8.2z" /></>,
  msg: <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h10a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 14H9l-3.5 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7z" />,
  mat: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v10L10 13l-6 2.5v-10z" />,
};
type Item = { href?: string; label: string; icon: keyof typeof I; sub?: boolean; exact?: boolean };
const GROUPS: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/coach", label: "Dashboard", icon: "dash", exact: true }, { href: "/coach/clientes", label: "Clientes", icon: "cli" }] },
  { label: "Catálogo", items: [{ href: "/coach/catalogo/ejercicios", label: "Ejercicios", icon: "ex", sub: true }, { href: "/coach/catalogo/rutinas", label: "Rutinas", icon: "rut", sub: true }, { href: "/coach/catalogo/nutricion", label: "Nutrición", icon: "nut", sub: true }] },
  { label: "Operación", items: [{ href: "/coach/mensajes", label: "Mensajes", icon: "msg" }, { href: "/coach/reportes", label: "Reportes diarios", icon: "rep" }, { href: "/coach/agenda", label: "Agenda", icon: "ag" }, { href: "/coach/material", label: "Material educativo", icon: "mat" }] },
];
export function SideNav({ clientCount }: { clientCount: number }) {
  const path = usePathname(), unread = useUnread().data ?? 0;
  return (
    <>
      {GROUPS.map((g, gi) => (
        <div key={gi}>
          {g.label && <div className="side-group-label">{g.label}</div>}
          <nav className="side-nav">
            {g.items.map((it) => {
              const svg = <svg viewBox="0 0 20 20">{I[it.icon]}</svg>;
              const cls = `side-link${it.sub ? " sub" : ""}`;
              if (!it.href) return <span key={it.label} className={cls} style={{ opacity: 0.35, cursor: "default" }}>{svg}{it.label}<span className="badge">Pronto</span></span>;
              return <Link key={it.label} href={it.href} className={`${cls}${(it.exact ? path === it.href : path.startsWith(it.href)) ? " active" : ""}`}>{svg}{it.label}{it.label === "Clientes" && <span className="badge">{clientCount}</span>}{it.label === "Mensajes" && unread > 0 && <span className="badge">{unread}</span>}</Link>;
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
export function MobileNav() {
  const path = usePathname(), unread = useUnread().data ?? 0;
  const L = [["/coach", "Dashboard"], ["/coach/clientes", "Clientes"], ["/coach/catalogo/ejercicios", "Ejercicios"], ["/coach/catalogo/rutinas", "Rutinas"], ["/coach/mensajes", "Mensajes"], ["/coach/reportes", "Reportes"], ["/coach/agenda", "Agenda"], ["/coach/material", "Material"]];
  return <nav className="mobile-nav">{L.map(([h, t]) => <Link key={h} href={h} className={(h === "/coach" ? path === h : path.startsWith(h)) ? "active" : ""}>{t}{t === "Mensajes" && unread > 0 ? ` (${unread})` : ""}</Link>)}</nav>;
}
