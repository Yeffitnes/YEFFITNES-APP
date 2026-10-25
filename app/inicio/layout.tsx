import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import { Onboarding } from "@/components/portal/Onboarding";
import "./portal.css";
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("id,status,onboarded_at,plans(name,features)").eq("profile_id", profile.id).maybeSingle();
  if (!client || client.status !== "active") redirect("/pendiente");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false} me={{ id: client.id, status: client.status, planName: (client.plans as unknown as { name: string } | null)?.name ?? null, features: (client.plans as unknown as { features: string[] } | null)?.features ?? [], onboarded: !!client.onboarded_at }}>
      <div className="shell">
        <PortalSide />
        <main className="main"><div className="m-logo"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /></div>{children}</main>
        <PortalBottomNav />
        <Onboarding />
      </div>
    </Providers>
  );
}
