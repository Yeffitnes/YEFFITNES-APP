import { signOut } from "@/app/login/actions";
export default function SinPerfil() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
      <h1 className="font-display text-2xl font-semibold">No encontramos tu perfil</h1>
      <p className="max-w-xs text-sm text-white/60">Tu cuenta existe pero aún no está configurada. Avisa a Jeff para que la revise.</p>
      <form action={signOut}><button className="btn-primary">Salir</button></form>
    </main>
  );
}
