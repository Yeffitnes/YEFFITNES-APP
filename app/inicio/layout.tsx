import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { requireUser } from "@/lib/session";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import { ActionsBar } from "@/components/ActionsBar";
import { Onboarding } from "@/components/portal/Onboarding";
import { Warmup } from "@/components/portal/Warmup";
import "./portal.css";
// La barra del navegador (Safari/Chrome) toma este color: igual que la barra de menú del portal, para que no se vea una banda oscura debajo.
export const viewport: Viewport = { themeColor: "#FFFFFF", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("id,status,onboarded_at,objective,objective_at,plans(name,features)").eq("profile_id", profile.id).maybeSingle();
  if (!client || client.status !== "active") redirect("/pendiente");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false} me={{ id: client.id, status: client.status, planName: (client.plans as unknown as { name: string } | null)?.name ?? null, features: (client.plans as unknown as { features: string[] } | null)?.features ?? [], onboarded: !!client.onboarded_at, objective: client.objective, objectiveAt: client.objective_at }}>
      <div className="shell">
        <PortalSide />
        <main className="main"><div className="m-logo"><div className="m-logo-row"><img src="/brand/logo.svg" alt="YEFFITNES TRAINING" height={29} /><ProfileMenu name={profile.full_name} role="Cliente" /></div></div><ActionsBar side="client" />{children}</main>
        <PortalBottomNav />
        <Onboarding />
        <Warmup />
      </div>
    </Providers>
  );
}
