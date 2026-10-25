"use client";
import Link from "next/link";
export function CatalogTop({ tab, sub, addLabel, onAdd }: { tab: "ejercicios" | "rutinas" | "nutricion"; sub: string; addLabel: string; onAdd: () => void }) {
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Catálogo</div><h1>{tab === "ejercicios" ? "Ejercicios" : tab === "rutinas" ? "Rutinas" : "Nutrición"}</h1><p className="greeting-sub">{sub}</p></div>
        <button className="primary-btn" onClick={onAdd}><svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg>{addLabel}</button></div>
      <div className="subtab-row">
        <Link href="/coach/catalogo/ejercicios" className={`subtab-btn${tab === "ejercicios" ? " active" : ""}`}>Ejercicios</Link>
        <Link href="/coach/catalogo/rutinas" className={`subtab-btn${tab === "rutinas" ? " active" : ""}`}>Rutinas</Link>
        <Link href="/coach/catalogo/nutricion" className={`subtab-btn${tab === "nutricion" ? " active" : ""}`}>Nutrición</Link>
      </div>
    </>
  );
}
