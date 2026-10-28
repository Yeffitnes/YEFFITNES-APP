import { redirect } from "next/navigation";
import { requireUser, serverDb } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { Providers } from "@/components/Providers";
import { ActionsBar } from "@/components/ActionsBar";
import { SideNav, MobileNav } from "@/components/coach/CoachNav";
import { ProfileMenu } from "@/components/ProfileMenu";
import { initials } from "@/lib/format";
import "./coach.css";
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  // Perfil y número de clientes a la vez (antes uno después del otro).
  const [{ profile }, { count }] = await Promise.all([requireUser(), serverDb().from("clients").select("id", { count: "exact", head: true })]);
  if (profile.role !== "coach") redirect("/inicio");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name}>
    <div className="shell">
      <aside className="sidebar">
        <div className="side-logo"><img src="/brand/logo.svg" alt="YEFFITNES TRAINING" height={29} /></div>
        <SideNav clientCount={count ?? 0} />
        <div className="side-spacer" />
        <div className="side-coach">
          <div className="side-avatar">{initials(profile.full_name)}</div>
          <div style={{ flex: 1 }}><div className="side-coach-name">{profile.full_name || "Coach"}</div><div className="side-coach-role">Coach</div></div>
          <form action={signOut}><button style={{ background: "none", border: 0, color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Salir</button></form>
        </div>
      </aside>
      <main className="main"><div className="m-logo"><div className="m-logo-row"><img src="/brand/logo-claro.svg" alt="YEFFITNES TRAINING" height={29} /><ProfileMenu name={profile.full_name} role="Coach" /></div></div><MobileNav /><ActionsBar side="coach" />{children}</main>
    </div>
    </Providers>
  );
}
