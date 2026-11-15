import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getUid, requireUser, serverDb } from "@/lib/session";
import { loadLogs, loadTrainingPlans, mapLogs, mapPlans, type LogRaw, type PlanRaw } from "@/lib/fetchers";
import type { TrainingPlan, WorkoutLog } from "@/lib/queries";
import { Providers } from "@/components/Providers";
import { PortalBottomNav, PortalSide } from "@/components/portal/PortalNav";
import { ActionsBar } from "@/components/ActionsBar";
import { FirstRun } from "@/components/portal/FirstRun";
import { Warmup } from "@/components/portal/Warmup";
import { FirstCallBanner, PendingBanner } from "@/components/portal/LockedPanel";
import "./portal.css";
// La barra del navegador (Safari/Chrome) toma este color: igual que la barra de menú del portal, para que no se vea una banda oscura debajo.
export const viewport: Viewport = { themeColor: "#FFFFFF", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
type Boot = { profile: { id: string; role: string; full_name: string; workspace_id: string } | null; client?: { id: string; status: string; onboarded_at: string | null; objective: string | null; objective_at: string | null; access_requested_at: string | null; objective_video_id: string | null; plans: { name: string; features: string[] } | null } | null; plans?: PlanRaw[] | null; logs?: LogRaw[] | null };
// Arranque en UN solo viaje a la base (portal_boot, migración 0041): perfil, ficha, rutina y registros juntos, y la propia base
// valida la sesión. Antes eran 3 viajes seguidos (sesión → perfil y ficha → rutina y registros). Si la base aún no tiene la 0041
// (o algo falla), se hace como antes.
async function boot(): Promise<{ profile: Boot["profile"]; client: NonNullable<Boot["client"]> | null; plans: TrainingPlan[] | null; logs: WorkoutLog[] | null } | "login" | "no_profile"> {
  const { data, error } = await serverDb().rpc("portal_boot");
  if (!error) {
    const b = data as Boot | null;
    if (!b) return "login";
    if (!b.profile) return "no_profile";
    return { profile: b.profile, client: b.client ?? null, plans: b.plans ? mapPlans(b.plans) : null, logs: b.logs ? mapLogs(b.logs) : null };
  }
  const uid = await getUid();
  if (!uid) return "login";
  const [{ profile }, { data: client }] = await Promise.all([
    requireUser(),
    serverDb().from("clients").select("id,status,onboarded_at,objective,objective_at,access_requested_at,objective_video_id,plans(name,features)").eq("profile_id", uid).maybeSingle(),
  ]);
  const c = client as unknown as NonNullable<Boot["client"]> | null;
  const [plans, logs] = c?.status === "active" ? await Promise.all([loadTrainingPlans(serverDb(), c.id).catch(() => null), loadLogs(serverDb(), c.id).catch(() => null)]) : [null, null];
  return { profile, client: c, plans, logs };
}
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const b = await boot();
  if (b === "login") redirect("/login");
  if (b === "no_profile") redirect("/sin-perfil");
  const { profile, client, plans, logs } = b;
  if (!profile) redirect("/sin-perfil");
  if (profile.role === "coach") redirect("/coach");
  // Sin plan (pendiente) también entra: ve la app con todo bloqueado y puede pedir acceso. Pausado o sin ficha: pantalla aparte.
  if (!client || (client.status !== "active" && client.status !== "pending")) redirect("/pendiente");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false} seed={{ plans, logs, at: Date.now() }} me={{ id: client.id, status: client.status, planName: client.plans?.name ?? null, features: client.plans?.features ?? [], onboarded: !!client.onboarded_at, objective: client.objective, objectiveAt: client.objective_at, accessRequestedAt: client.access_requested_at, objectiveVideo: !!client.objective_video_id }}>
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
