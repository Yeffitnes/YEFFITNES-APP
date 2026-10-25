import Link from "next/link";
// Página pública. Los textos son PROPUESTA (Jeff debe validarlos); no incluye precios ni planes porque aún no están definidos.
const FEATURES = [
  ["Rutina hecha para ti", "Tu plan por días, con vídeo de cada ejercicio. Registras series, peso y cómo te sentiste."],
  ["Nutrición clara", "Tu plan de comidas por día, con calorías y proteína definidas por tu coach."],
  ["Seguimiento real", "Mide tu peso y tus medidas, sube fotos de progreso y mira tu evolución."],
  ["Mensajes con Jeff", "Escríbele cuando lo necesites, con foto o vídeo. Te responde y te avisa al teléfono."],
  ["Agenda en tu mano", "Reserva tu sesión cuando te sirva y recibe una alarma para no olvidarla."],
  ["Reporte diario", "Cuéntale cómo te fue con un vídeo corto y un comentario."],
];
const STEPS = [["Crea tu cuenta", "Solo toma un minuto."], ["Jeff activa tu plan", "Te asigna lo que necesitas para tu objetivo."], ["Entrena y avanza", "Todo en una app que instalas en tu teléfono."]];
export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-ink text-white">
      <section className="relative px-6 pb-16 pt-12 text-center">
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(247,37,75,.4), rgba(247,37,75,0) 68%)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-56 -right-40 h-[560px] w-[560px] rounded-full" style={{ background: "radial-gradient(circle, rgba(205,177,112,.22), rgba(205,177,112,0) 68%)" }} />
        <div className="relative mx-auto max-w-2xl">
          <img src="/brand/logo.svg" alt="YEFFITNES TRAINING" className="mx-auto h-10" />
          <h1 className="mt-10 font-display text-4xl font-semibold leading-tight md:text-5xl">Tu coaching online, hecho a tu medida</h1>
          <p className="mx-auto mt-4 max-w-md text-white/65">Entrenamiento, nutrición y seguimiento personal con Jeff González, en una sola app.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link href="/login" className="btn-primary">Crear mi cuenta</Link><Link href="/login" className="text-sm text-white/70 underline">Ya tengo cuenta</Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-semibold">Todo lo que necesitas, en un solo lugar</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([t, d]) => <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-display text-base font-semibold text-pearl">{t}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{d}</p></div>)}</div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-center font-display text-2xl font-semibold">Así empiezas</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">{STEPS.map(([t, d], i) => <li key={t} className="rounded-2xl border border-white/10 p-5 text-center"><span className="font-mono text-xs text-pearl">0{i + 1}</span><div className="mt-2 font-display font-semibold">{t}</div><p className="mt-1 text-sm text-white/60">{d}</p></li>)}</ol>
        <div className="mt-10 text-center"><Link href="/login" className="btn-primary">Empezar ahora</Link></div>
      </section>
      <footer className="px-6 pb-10 text-center text-xs text-white/40">© YEFFITNES TRAINING</footer>
    </main>
  );
}
