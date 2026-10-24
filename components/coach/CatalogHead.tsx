import Link from "next/link";
export function CatalogHead({ tab, sub, addHref, addLabel }: { tab: "ejercicios" | "rutinas"; sub: string; addHref: string; addLabel: string }) {
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Catálogo</div><h1>{tab === "ejercicios" ? "Ejercicios" : "Rutinas"}</h1><p className="greeting-sub">{sub}</p></div>
        <Link href={addHref} className="primary-btn"><svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg>{addLabel}</Link></div>
      <div className="subtab-row">
        <Link href="/coach/catalogo/ejercicios" className={`subtab-btn${tab === "ejercicios" ? " active" : ""}`}>Ejercicios</Link>
        <Link href="/coach/catalogo/rutinas" className={`subtab-btn${tab === "rutinas" ? " active" : ""}`}>Rutinas</Link>
      </div>
    </>
  );
}
