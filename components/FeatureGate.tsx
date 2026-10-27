"use client";
import { FEATURE_LABELS, hasFeature, upgradeLink } from "@/lib/features";
import { LockedPanel, LockedCta } from "@/components/portal/LockedPanel";
import { useProfile } from "@/components/Providers";
import { useMe } from "@/lib/queries";
type Props = { features: string[] | null; feature: string; name?: string; children: React.ReactNode };
// El bloqueo visual NO es la seguridad: los datos protegidos se validan además en servidor y en la base de datos.
// Sin plan (pendiente): "se desbloquea cuando Jeff active tu plan" + Solicitar acceso. Con plan que no lo incluye: "no incluido" + Hablar con tu coach.
export function FeatureGate({ features, feature, children }: Props) {
  const { profileId } = useProfile(), me = useMe(profileId), pending = me.data?.status === "pending";
  if (hasFeature(features, feature)) return <>{children}</>;
  const label = FEATURE_LABELS[feature] ?? feature;
  return (
    <LockedPanel tag={pending ? "Bloqueado" : "No incluido en tu plan"} title={label} sub={pending ? "Se desbloquea cuando Jeff active tu plan." : "Tu plan actual no lo incluye. Pídeselo a tu coach."}>
      <LockedCta upgradeHref={pending ? undefined : upgradeLink(feature)} />
    </LockedPanel>
  );
}
