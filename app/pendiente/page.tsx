import { PageReady } from "@/components/PageReady";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { Providers } from "@/components/Providers";
import { PendingThread } from "@/components/portal/PendingThread";
// Desde el 27-oct el cliente SIN plan entra a la app (todo bloqueado). Esta pantalla queda para la cuenta en PAUSA.
export default async function Pendiente() {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("status").eq("profile_id", profile.id).maybeSingle();
  if (client?.status === "active" || client?.status === "pending") redirect("/inicio");
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false}>
      <main className="flex min-h-[100dvh] flex-col items-center justify-start gap-4 bg-ink px-4 py-8 text-center text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
          <span className="font-mono text-xs text-pearl">CUENTA EN PAUSA</span>
          <h1 className="mt-3 font-display text-2xl font-semibold">Tu plan está en pausa</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">Cuando Jeff lo reactive, aquí aparecerá todo tu contenido. Abajo ves los mensajes que te deje.</p>
        </div>
        <div className="w-full max-w-md text-left"><PendingThread /><PageReady /></div>
        <form action={signOut}><button className="text-sm text-white/50 underline">Salir</button></form>
      </main>
    </Providers>
  );
}
