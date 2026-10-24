import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import "./portal.css";
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("status").eq("profile_id", profile.id).maybeSingle();
  if (!client || client.status !== "active") redirect("/pendiente");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false}>
      <div className="shell">
        <PortalSide />
        <main className="main"><div className="m-logo"><img src="/brand/logo-coach.svg" alt="YEFFITNES TRAINING" height={29} /></div>{children}</main>
        <PortalBottomNav />
      </div>
    </Providers>
  );
}
