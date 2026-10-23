import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
export default async function Pendiente() {
  const { profile } = await requireUser();
  const wa = process.env.NEXT_PUBLIC_COACH_WHATSAPP;
  const msg = encodeURIComponent(`Hola, soy ${profile.full_name}. Ya me registré en la app y quiero activar mi plan.`);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 blur-[0.4px]">
        <span className="font-mono text-xs text-pearl">CUENTA PENDIENTE</span>
        <h1 className="mt-3 font-display text-2xl font-semibold">Tu coach activará tu plan</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">Cuando Jeff cierre contigo y active tu cuenta, aquí aparecerá todo tu contenido.</p>
        {wa && <a className="btn-primary mt-6" href={`https://wa.me/${wa}?text=${msg}`}>Escribir a Jeff por WhatsApp</a>}
      </div>
      <form action={signOut}><button className="text-sm text-white/50 underline">Salir</button></form>
    </main>
  );
}
