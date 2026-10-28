import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getUid, requireUser, serverDb } from "@/lib/session";
import { loadLogs, loadTrainingPlans } from "@/lib/fetchers";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import { ActionsBar } from "@/components/ActionsBar";
import { FirstRun } from "@/components/portal/FirstRun";
import { Warmup } from "@/components/portal/Warmup";
import { FirstCallBanner, PendingBanner } from "@/components/portal/LockedPanel";
import "./portal.css";
// La barra del navegador (Safari/Chrome) toma este color: igual que la barra de menú del portal, para que no se vea una banda oscura debajo.
export const viewport: Viewport = { themeColor: "#FFFFFF", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Rapidez al abrir: perfil y ficha se piden a la vez; luego la rutina y los registros, también a la vez.
  // Así "Hoy" llega ya dibujado desde el servidor y el teléfono no espera más viajes a la base antes de mostrar algo.
  const uid = await getUid();
  if (!uid) redirect("/login");
  const [{ profile }, { data: client }] = await Promise.all([
    requireUser(),
    serverDb().from("clients").select("id,status,onboarded_at,objective,objective_at,access_requested_at,objective_video_id,plans(name,features)").eq("profile_id", uid).maybeSingle(),
  ]);
  if (profile.role === "coach") redirect("/coach");
  // Sin plan (pendiente) también entra: ve la app con todo bloqueado y puede pedir acceso. Pausado o sin ficha: pantalla aparte.
  if (!client || (client.status !== "active" && client.status !== "pending")) redirect("/pendiente");
  const [plans, logs] = client.status === "active" ? await Promise.all([loadTrainingPlans(serverDb(), client.id).catch(() => null), loadLogs(serverDb(), client.id).catch(() => null)]) : [null, null];
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false} seed={{ plans, logs }} me={{ id: client.id, status: client.status, planName: (client.plans as unknown as { name: string } | null)?.name ?? null, features: (client.plans as unknown as { features: string[] } | null)?.features ?? [], onboarded: !!client.onboarded_at, objective: client.objective, objectiveAt: client.objective_at, accessRequestedAt: client.access_requested_at, objectiveVideo: !!client.objective_video_id }}>
      <div className="shell">
        <PortalSide />
        <main className="main"><div className="m-logo"><div className="m-logo-row"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /><ProfileMenu name={profile.full_name} role="Cliente" /></div></div><ActionsBar side="client" /><PendingBanner /><FirstCallBanner />{children}</main>
        <PortalBottomNav />
        <FirstRun />
        <Warmup />
      </div>
    </Providers>
  );
}
