import Link from "next/link";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center">
      <img src="/brand/logo.svg" alt="YEFFITNES TRAINING" className="h-10" />
      <p className="max-w-md text-white/60">Tu coaching online, hecho a tu medida.</p>
      <Link href="/login" className="btn-primary">Entrar</Link>
    </main>
  );
}
