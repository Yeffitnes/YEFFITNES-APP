"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const I = {
  dash: <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></>,
  cli: <><circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></>,
  ex: <path d="M4.5 6.5h11M4.5 10h11M4.5 13.5h7" />,
  rut: <><rect x="3.5" y="3.5" width="13" height="13" rx="3" /><path d="M7 10h6M10 7v6" /></>,
  ag: <><rect x="3.2" y="4" width="13.6" height="12.5" rx="2.5" /><line x1="3.2" y1="7.6" x2="16.8" y2="7.6" /></>,
  mat: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v10L10 13l-6 2.5v-10z" />,
};
type Item = { href?: string; label: string; icon: keyof typeof I; sub?: boolean; exact?: boolean };
const GROUPS: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/coach", label: "Dashboard", icon: "dash", exact: true }, { href: "/coach/clientes", label: "Clientes", icon: "cli" }] },
  { label: "Catálogo", items: [{ href: "/coach/catalogo/ejercicios", label: "Ejercicios", icon: "ex", sub: true }, { href: "/coach/catalogo/rutinas", label: "Rutinas", icon: "rut", sub: true }] },
  { label: "Operación", items: [{ href: "/coach/agenda", label: "Agenda", icon: "ag" }, { href: "/coach/material", label: "Material educativo", icon: "mat" }] },
];
export function SideNav({ clientCount }: { clientCount: number }) {
  const path = usePathname();
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
              return <Link key={it.label} href={it.href} className={`${cls}${(it.exact ? path === it.href : path.startsWith(it.href)) ? " active" : ""}`}>{svg}{it.label}{it.label === "Clientes" && <span className="badge">{clientCount}</span>}</Link>;
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
export function MobileNav() {
  const path = usePathname();
  const L = [["/coach", "Dashboard"], ["/coach/clientes", "Clientes"], ["/coach/catalogo/ejercicios", "Ejercicios"], ["/coach/catalogo/rutinas", "Rutinas"], ["/coach/agenda", "Agenda"], ["/coach/material", "Material"]];
  return <nav className="mobile-nav">{L.map(([h, t]) => <Link key={h} href={h} className={(h === "/coach" ? path === h : path.startsWith(h)) ? "active" : ""}>{t}</Link>)}</nav>;
}
