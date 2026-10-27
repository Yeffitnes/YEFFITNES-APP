"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useProfile } from "@/components/Providers";
import { useMe, useRequestAccess } from "@/lib/queries";
import { ago } from "@/lib/format";
// Panel bloqueado (diseño del FeatureGate de DaniFit, en la marca): contenido de muestra borroso + candado + qué hacer.
// El bloqueo visual NO es la seguridad: la base de datos no entrega nada de lo que el plan no incluye.
export function LockedPanel({ tag, title, sub, children, lines = 3 }: { tag: string; title: string; sub: string; children?: React.ReactNode; lines?: number }) {
  return (
    <div className="lk-card">
      <div aria-hidden className="lk-ghost"><div className="lk-tag">{tag}</div><div className="lk-line w60" />{Array.from({ length: lines }, (_, i) => <div key={i} className={`lk-line${i % 2 ? " w80" : ""}`} />)}</div>
      <div className="lk-over">
        <span className="lk-ico"><Icon name="lock" size={16} stroke={1.8} /></span>
        <div className="lk-title">{title}</div>
        <p className="lk-sub">{sub}</p>
        {children}
      </div>
    </div>
  );
}
// Botón "Solicitar acceso" del cliente sin plan. Tras pedirlo muestra cuándo lo pidió; se puede volver a avisar a las 12 h.
export function RequestAccessButton({ compact = false }: { compact?: boolean }) {
  const { profileId } = useProfile(), me = useMe(profileId), req = useRequestAccess(profileId);
  const at = me.data?.accessRequestedAt ?? null, recent = !!at && Date.now() - new Date(at).getTime() < 12 * 3600_000;
  if (recent) return <span className="lk-sent"><Icon name="check" size={13} stroke={2.4} /> {compact ? "Solicitud enviada" : `Solicitud enviada ${ago(at).toLowerCase()}. Te avisamos cuando Jeff active tu plan.`}</span>;
  return <button type="button" className="lk-cta" disabled={req.isPending} onClick={() => req.mutate()}><Icon name="send" size={13} /> {req.isPending ? "Enviando…" : at ? "Volver a avisar a Jeff" : "Solicitar acceso a Jeff"}</button>;
}
// Llamada a la acción de un panel bloqueado: pendiente → pedir acceso; con plan → hablar con el coach para ampliarlo.
export function LockedCta({ upgradeHref }: { upgradeHref?: string }) {
  const { profileId } = useProfile(), me = useMe(profileId);
  if (me.data?.status === "pending" || !upgradeHref) return <RequestAccessButton compact />;
  return <Link href={upgradeHref} className="lk-cta">Hablar con tu coach</Link>;
}
// Página completa para un cliente sin plan: encabezado + paneles bloqueados.
export function PendingSection({ eyebrow, title, panels }: { eyebrow: string; title: string; panels: { tag: string; title: string; sub: string }[] }) {
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">{eyebrow}</div><h1>{title}</h1><p className="greeting-sub">Se desbloquea cuando Jeff active tu plan.</p></div></div>
      <div className="lk-grid">{panels.map((p) => <LockedPanel key={p.title} {...p}><RequestAccessButton compact /></LockedPanel>)}</div>
    </>
  );
}
// Aviso fijo arriba mientras la cuenta está pendiente.
export function PendingBanner() {
  const { profileId } = useProfile(), me = useMe(profileId);
  if (me.data?.status !== "pending") return null;
  return (
    <section className="lk-banner" aria-label="Cuenta pendiente de activar">
      <span className="lk-ico"><Icon name="lock" size={16} stroke={1.8} /></span>
      <div className="lk-banner-txt"><b>Tu cuenta está creada.</b><span>Puedes recorrer la app; todo se desbloquea cuando Jeff active tu plan.</span></div>
      <RequestAccessButton />
    </section>
  );
}
