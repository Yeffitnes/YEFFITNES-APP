"use client";
import { useMe } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { FeatureGate } from "@/components/FeatureGate";
import { ProgressPanels } from "./ProgressPanels";
export function ProgressView() {
  const { profileId, name } = useProfile(), me = useMe(profileId);
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Progreso — {new Date().toLocaleDateString("es", { month: "long", year: "numeric" })}</div><h1>Tu evolución</h1><p className="greeting-sub">Tus mediciones y tus fotos en un solo lugar.</p></div></div>
      {me.isPending ? <div className="sk" style={{ height: 200 }} /> : me.data && !me.data.features.includes("progress") ? <FeatureGate features={me.data.features} feature="progress" name={name}><span /></FeatureGate> : me.data ? <ProgressPanels clientId={me.data.id} mode="client" /> : <div className="card"><p role="alert" className="empty-note">No pudimos cargar tu perfil. Recarga la página.</p></div>}
    </>
  );
}
