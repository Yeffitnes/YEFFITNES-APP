"use client";
import Link from "next/link";
import { useMe, useMeasures } from "@/lib/queries";
import { PendingSection } from "./LockedPanel";
import { useProfile } from "@/components/Providers";
import { ObjectiveCard } from "./HoySide";
// Objetivo definido por el coach + cómo va tu peso desde la primera medida registrada.
export function ObjectiveView() {
  const { profileId } = useProfile(), me = useMe(profileId), cid = me.data?.id ?? "", has = !!me.data?.features.includes("progress"), m = useMeasures(has ? cid : "");
  const w = (m.data ?? []).filter((x) => x.weight != null).sort((a, b) => a.date.localeCompare(b.date)), first = w[0], last = w[w.length - 1];
  const diff = first && last && first !== last ? Math.round((last.weight! - first.weight!) * 10) / 10 : null;
  if (me.data?.status === "pending") return <PendingSection eyebrow="Objetivos" title="Hacia dónde vas" panels={[
    { tag: "Objetivo", title: "Tu objetivo", sub: "Jeff lo define contigo en la primera llamada." },
    { tag: "Avance", title: "Cuánto has avanzado", sub: "Tu cambio de peso desde el primer registro." },
  ]} />;
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Objetivos</div><h1>Hacia dónde vas</h1><p className="greeting-sub">Tu coach define tu objetivo y lo ajusta según tu avance.</p></div></div>
      <div className="dash-grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <ObjectiveCard />
        {has && <div className="card"><div className="card-tag">Tu peso</div>
          {!w.length ? <p className="empty-note" style={{ marginTop: 10 }}>Aún no registras tu peso. Hazlo en <Link href="/inicio/progreso" style={{ color: "var(--accent)", fontWeight: 700 }}>Progreso</Link>.</p>
            : <><div className="card-title" style={{ fontSize: 22 }}>{last.weight} kg</div><p className="empty-note" style={{ marginTop: 6 }}>{diff === null ? "Primera medida registrada." : `${diff > 0 ? "+" : ""}${diff} kg desde ${new Date(first.date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "long" })}.`}</p></>}
        </div>}
        <div className="card"><div className="card-tag">¿Quieres ajustarlo?</div><p className="empty-note" style={{ marginTop: 8 }}>Cuéntale a tu coach cómo te sientes con tu objetivo.</p>
          <Link className="report-btn" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", textDecoration: "none" }} href={`/inicio/mensajes?m=${encodeURIComponent("Quiero hablar sobre mi objetivo: ")}`}>Escribirle a mi coach</Link></div>
      </div>
    </>
  );
}
