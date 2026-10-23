import { FEATURE_LABELS, hasFeature, upgradeLink } from "@/lib/features";
type Props = { features: string[] | null; feature: string; name: string; children: React.ReactNode };
// El bloqueo visual NO es la seguridad: los datos protegidos se validan además en servidor y en la base de datos.
export function FeatureGate({ features, feature, name, children }: Props) {
  if (hasFeature(features, feature)) return <>{children}</>;
  const link = upgradeLink(process.env.NEXT_PUBLIC_COACH_WHATSAPP, name, feature);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5">
      <div aria-hidden className="select-none blur-sm saturate-50"><div className="h-4 w-1/2 rounded bg-line" /><div className="mt-3 h-3 w-full rounded bg-line" /><div className="mt-2 h-3 w-4/5 rounded bg-line" /></div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 text-center">
        <span className="font-mono text-[11px] text-garnet">🔒 NO INCLUIDO EN TU PLAN</span>
        <p className="font-display font-semibold">{FEATURE_LABELS[feature] ?? feature}</p>
        {link && <a href={link} className="btn-primary !px-4 !py-2 text-sm">Hablar con Jeff</a>}
      </div>
    </div>
  );
}
