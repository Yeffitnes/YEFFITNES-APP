import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { Providers } from "@/components/Providers";
import { PendingThread } from "@/components/portal/PendingThread";
export default async function Pendiente() {
  const { profile } = await requireUser();
  return (
    <Providers workspaceId={profile.workspace_id} profileId={profile.id} name={profile.full_name} prefetch={false}>
      <main className="flex min-h-[100dvh] flex-col items-center justify-start gap-4 bg-ink px-4 py-8 text-center text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
          <span className="font-mono text-xs text-pearl">CUENTA PENDIENTE</span>
          <h1 className="mt-3 font-display text-2xl font-semibold">Tu coach activará tu plan</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">Cuando Jeff cierre contigo y active tu cuenta, aquí aparecerá todo tu contenido. Mientras tanto, escríbele aquí mismo.</p>
        </div>
        <div className="w-full max-w-md text-left"><PendingThread /></div>
        <form action={signOut}><button className="text-sm text-white/50 underline">Salir</button></form>
      </main>
    </Providers>
  );
}
