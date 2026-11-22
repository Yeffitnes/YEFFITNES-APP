"use client";
// Landing pública de Yeffitness (22-nov, pedido de Cristian): el enlace de Instagram de Yeff. Muestra la app por dentro con un
// celular interactivo (pantallas reales, datos de ejemplo), el personaje de Yeff como guía y los paquetes sin precio: todo termina
// en el WhatsApp de Yeff. No enlaza a la app ni al inicio de sesión.
import { useRef } from "react";
import { Guide, type GuidePose } from "@/components/portal/Guide";
import { PACKS, waLink } from "@/lib/landing";
import { PhoneTour, type TourHandle } from "./PhoneTour";

const WA = (t: string) => ({ href: waLink(t), target: "_blank", rel: "noopener noreferrer" });
const HELLO = "Hola Yeff, vi tu página y quiero entrenar contigo. ¿Me cuentas cómo funciona?";
// El ecosistema: cada tarjeta abre esa parte en el celular de arriba.
const PARTS: { t: string; d: string; screen: string; spot: string; pose: GuidePose }[] = [
  { t: "Rutina del día", d: "Armada para ti, con vídeo de técnica, series, repeticiones y peso.", screen: "hoy", spot: "rutina", pose: "workout" },
  { t: "Registro serie por serie", d: "Anotas lo que haces y el descanso se cuenta solo.", screen: "ejercicio", spot: "series", pose: "stopwatch" },
  { t: "Reporte diario con vídeo", d: "Le muestras a Yeff tu técnica y él te corrige.", screen: "hoy", spot: "reporte", pose: "phone" },
  { t: "Nutrición", d: "Comida por comida, con calorías y macros para tu objetivo.", screen: "nutricion", spot: "comidas", pose: "hydrate" },
  { t: "Hábitos", d: "Agua, pasos y sueño, con tu promedio de la semana.", screen: "hoy", spot: "habitos", pose: "hydrate" },
  { t: "Agenda con Yeff", d: "Reservas tus llamadas en los horarios que él publica.", screen: "agenda", spot: "calendario", pose: "clipboard" },
  { t: "Progreso y récords", d: "Peso, medidas, récords y logros, semana a semana.", screen: "progreso", spot: "logros", pose: "flex" },
  { t: "Resumen semanal", d: "Cada semana, lo que lograste y el comentario de Yeff.", screen: "resumen", spot: "titulo", pose: "cheer" },
  { t: "Material educativo", d: "Vídeos y artículos de técnica, nutrición y recuperación.", screen: "material", spot: "lista", pose: "study" },
];
const STEPS = [
  ["Le escribes a Yeff", "Por WhatsApp le cuentas tu objetivo y él te explica los paquetes."],
  ["Llamada inicial", "Se conocen: tu punto de partida, tu tiempo disponible y lo que quieres lograr."],
  ["Yeff arma tu plan", "Tu rutina y, si lo eliges, tu nutrición. Te activa la cuenta en la app."],
  ["Entrenas y te acompaña", "Registras, reportas y cada semana revisan juntos cómo vas."],
];

export function Landing() {
  const tour = useRef<TourHandle>(null);
  const open = (screen: string, spot: string) => { document.getElementById("app")?.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => tour.current?.show(screen, spot), 350); };
  return (
    <main className="lp">
      <header className="lp-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="Yeffitness" height={30} />
        <nav><a href="#app">La app</a><a href="#paquetes">Paquetes</a></nav>
        <a className="lp-btn sm" {...WA(HELLO)}>Escríbele a Yeff</a>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-txt">
          <p className="lp-eyebrow">Coaching online con Yeff González</p>
          <h1>Tu entrenamiento, tu nutrición y tu progreso. <span>Con Yeff, en una app hecha para ti.</span></h1>
          <p className="lp-lead">No es una hoja de ejercicios. Es un plan armado para ti, un registro de cada serie y un coach que revisa lo que haces y te responde.</p>
          <div className="lp-cta"><a className="lp-btn" href="#app">Recorre la app por dentro</a><a className="lp-btn ghost" {...WA(HELLO)}>Preguntar por WhatsApp</a></div>
        </div>
        <div className="lp-hero-art" aria-hidden>
          <div className="lp-hero-phone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/shots/hoy.webp" alt="" />
          </div>
          <div className="lp-hero-guide"><span className="lp-stage" /><Guide size={128} pose="wave" dir="left" /><span className="lp-hero-say">Hola, soy Yeff. Te muestro la app por dentro.</span></div>
        </div>
      </section>

      <section className="lp-tour" id="app">
        <div className="lp-head"><p className="lp-eyebrow">La app por dentro</p><h2>Así se ve un día con Yeff.</h2>
          <p>Este es el celular de una clienta que lleva 12 semanas. Toca los puntos rojos, cambia de pantalla abajo o deja que el recorrido avance solo.</p></div>
        <PhoneTour ref={tour} />
      </section>

      <section className="lp-parts">
        <div className="lp-head dark"><p className="lp-eyebrow">Todo lo que tienes</p><h2>Un ecosistema completo, no solo una rutina.</h2>
          <p>Toca cualquiera y te lo muestro en el celular.</p></div>
        <div className="lp-grid">{PARTS.map((x) => (
          <button key={x.t} type="button" className="lp-part" onClick={() => open(x.screen, x.spot)}>
            <span className="lp-part-face"><Guide size={44} pose={x.pose} talking={false} /></span>
            <b>{x.t}</b><span>{x.d}</span><small>Ver en la app</small></button>))}</div>
      </section>

      <section className="lp-steps">
        <div className="lp-head"><p className="lp-eyebrow">Cómo empiezas</p><h2>Cuatro pasos entre tu objetivo y tu primer entrenamiento.</h2></div>
        <ol>{STEPS.map(([t, d], i) => <li key={t}><span className="lp-num">{i + 1}</span><b>{t}</b><p>{d}</p></li>)}</ol>
      </section>

      <section className="lp-packs" id="paquetes">
        <div className="lp-head dark"><p className="lp-eyebrow">Paquetes</p><h2>Elige cómo quieres que te acompañe.</h2><p>Los precios te los da Yeff por WhatsApp, según tu caso.</p></div>
        <div className="lp-pack-row">{PACKS.map((p) => (
          <div key={p.name} className={`lp-pack${p.highlight ? " hl" : ""}`}>
            {p.highlight && <span className="lp-pack-tag">El más completo</span>}
            <h3>{p.name}</h3><p>{p.tagline}</p>
            <ul>{p.includes.map((i) => <li key={i}>{i}</li>)}</ul>
            <a className={`lp-btn${p.highlight ? "" : " ghost"}`} {...WA(`Hola Yeff, quiero saber el precio del paquete ${p.name}.`)}>Preguntar precio</a>
          </div>))}</div>
      </section>

      <section className="lp-final">
        <Guide size={110} pose="cheer" />
        <h2>¿Empezamos?</h2>
        <p>Escríbele a Yeff, cuéntale tu objetivo y arman tu plan.</p>
        <a className="lp-btn" {...WA(HELLO)}>Escribirle por WhatsApp</a>
      </section>
      <footer className="lp-foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="Yeffitness" height={22} /><span>Las pantallas de la app usan datos de ejemplo.</span>
      </footer>
    </main>
  );
}
