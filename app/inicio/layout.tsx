import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { requireUser } from "@/lib/session";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import { ActionsBar } from "@/components/ActionsBar";
import { FirstRun } from "@/components/portal/FirstRun";
import { Warmup } from "@/components/portal/Warmup";
import { PendingBanner } from "@/components/portal/LockedPanel";
import "./portal.css";
// La barra del navegador (Safari/Chrome) toma este color: igual que la barra de menú del portal, para que no se vea una banda oscura debajo.
export const viewport: Viewport = { themeColor: "#FFFFFF", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("id,status,onboarded_at,objective,objective_at,access_requested_at,plans(name,features)").eq("profile_id", profile.id).maybeSingle();
  // Sin plan (pendiente) también entra: ve la app con todo bloqueado y puede pedir acceso. Pausado o sin ficha: pantalla aparte.
  if (!client || (client.status !== "active" && client.status !== "pending")) redirect("/pendiente");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false} me={{ id: client.id, status: client.status, planName: (client.plans as unknown as { name: string } | null)?.name ?? null, features: (client.plans as unknown as { features: string[] } | null)?.features ?? [], onboarded: !!client.onboarded_at, objective: client.objective, objectiveAt: client.objective_at, accessRequestedAt: client.access_requested_at }}>
      <div className="shell">
        <PortalSide />
        <main className="main"><div className="m-logo"><div className="m-logo-row"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /><ProfileMenu name={profile.full_name} role="Cliente" /></div></div><ActionsBar side="client" /><PendingBanner />{children}</main>
        <PortalBottomNav />
        <FirstRun />
        <Warmup />
      </div>
    </Providers>
  );
}
