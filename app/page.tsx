import Link from "next/link";
// Entrada de la app: solo para quien ya es cliente. La página de venta vive aparte (carpeta /landing) y no enlaza aquí.
export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-white">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full" style={{ background: "radial-gradient(circle, rgba(247,37,75,.34), rgba(247,37,75,0) 65%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-56 -right-40 h-[560px] w-[560px] rounded-full" style={{ background: "radial-gradient(circle, rgba(205,177,112,.2), rgba(205,177,112,0) 65%)" }} />
      <div className="relative">
        <img src="/brand/logo.svg" alt="YEFFITNES TRAINING" className="mx-auto h-9" />
        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.18em] text-pearl">Portal privado de clientes</p>
        <h1 className="mx-auto mt-4 max-w-md font-display text-3xl font-semibold leading-tight md:text-4xl">Tu entrenamiento, tu nutrición y tu progreso en un solo lugar.</h1>
        <Link href="/login" className="btn-primary mt-10 inline-flex">Iniciar sesión</Link>
      </div>
      <p className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">YEFFITNES TRAINING</p>
    </main>
  );
}
