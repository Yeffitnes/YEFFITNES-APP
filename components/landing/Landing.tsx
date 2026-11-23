"use client";
// Landing pública de Yeffitness: el enlace del Instagram de Yeff (22-nov; rehecha el 23-nov a pedido de Cristian: "tiene que ser
// muy impactante, es la primera entrada de cualquier cliente"). Orden pensado para quien llega desde Instagram en el celular:
//   1. Portada: titular grande, el personaje rudo de los ejercicios al fondo y un celular con lo que más vende (la sesión de
//      mañana arriba de Hoy, la gráfica de semana a semana y el aviso de la sesión).
//   2. Desfile de ejercicios dibujados (los mismos de la app).
//   3. Progreso: capturas reales de "Semana a semana" y del resumen semanal, récords, medidas y fotos.
//   4. Agenda: los avisos de la sesión cayendo en la pantalla bloqueada, y el evento en el calendario del celular.
//   5. El celular interactivo, el ecosistema (cada tarjeta con su dibujo), cómo empiezas, paquetes y cierre.
// Todo termina en el WhatsApp de Yeff; no enlaza a la app. Las pantallas usan datos de ejemplo (lo dice el pie).
import { useEffect, useRef } from "react";
import { PACKS, waLink } from "@/lib/landing";
import { PhoneTour, type TourHandle } from "./PhoneTour";

const WA = (t: string) => ({ href: waLink(t), target: "_blank", rel: "noopener noreferrer" });
const HELLO = "Hola Yeff, vi tu página y quiero entrenar contigo. ¿Me cuentas cómo funciona?";
const EX = (f: string) => `/ex/${f}.webp`;

// El ecosistema: cada tarjeta lleva un dibujo de la app y abre esa parte en el celular.
const PARTS: { t: string; d: string; screen: string; spot: string; img: string }[] = [
  { t: "Rutina del día", d: "Armada para ti, con vídeo de técnica, series, repeticiones y peso.", screen: "hoy", spot: "rutina", img: "30-sentadilla-con-barra" },
  { t: "Registro serie por serie", d: "Anotas lo que haces y el descanso se cuenta solo.", screen: "ejercicio", spot: "series", img: "13-peso-muerto" },
  { t: "Reporte diario con vídeo", d: "Le muestras a Yeff tu técnica y él te corrige.", screen: "hoy", spot: "reporte", img: "08-dominadas" },
  { t: "Progreso semana a semana", d: "Entrenos, peso movido, nutrición y hábitos, con tu promedio.", screen: "progreso", spot: "tendencias", img: "38-hip-thrust" },
  { t: "Resumen semanal", d: "Cada semana, lo que lograste y el comentario de Yeff.", screen: "resumen", spot: "titulo", img: "49-burpees" },
  { t: "Agenda con avisos", d: "Reservas tu llamada y te avisamos antes. Queda en tu calendario.", screen: "agenda", spot: "calendario", img: "06-flexiones" },
  { t: "Nutrición", d: "Comida por comida, con calorías y macros para tu objetivo.", screen: "nutricion", spot: "comidas", img: "147-paseo-del-granjero" },
  { t: "Hábitos", d: "Agua, pasos y sueño, con tu promedio de la semana.", screen: "hoy", spot: "habitos", img: "150-saltar-la-cuerda" },
  { t: "Material educativo", d: "Vídeos y artículos de técnica, nutrición y recuperación.", screen: "material", spot: "lista", img: "44-plancha" },
];
// Desfile de ejercicios (dos filas, en sentidos contrarios)
const ROW1 = ["30-sentadilla-con-barra", "08-dominadas", "38-hip-thrust", "18-elevaciones-laterales", "13-peso-muerto", "54-swing-con-kettlebell", "34-sentadilla-bulgara", "01-press-de-banca-con-barra", "151-thruster-con-mancuernas", "22-curl-con-barra"];
const ROW2 = ["49-burpees", "10-remo-con-barra", "16-press-militar-con-barra", "135-elevacion-de-piernas-colgado", "33-zancadas-con-mancuernas", "113-saltos-al-cajon", "07-fondos-en-paralelas", "147-paseo-del-granjero", "36-peso-muerto-rumano", "44-plancha"];
const name = (f: string) => { const s = f.replace(/^\d+-/, "").replace(/-/g, " "); return s.charAt(0).toUpperCase() + s.slice(1); };
const STEPS = [
  ["Le escribes a Yeff", "Por WhatsApp le cuentas tu objetivo y él te explica los paquetes."],
  ["Llamada inicial", "Se conocen: tu punto de partida, tu tiempo disponible y lo que quieres lograr."],
  ["Yeff arma tu plan", "Tu rutina y, si lo eliges, tu nutrición. Te activa la cuenta en la app."],
  ["Entrenas y te acompaña", "Registras, reportas y cada semana revisan juntos cómo vas."],
];

/** Marca con la clase "in" lo que entra en pantalla (para las animaciones de entrada). */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-rv]"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.25 });
    els.forEach((e) => io.observe(e)); return () => io.disconnect();
  }, []);
  return ref;
}

function Notif({ title, body, when, cls = "" }: { title: string; body: string; when: string; cls?: string }) {
  return (
    <div className={`lp-notif ${cls}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={34} height={34} />
      <div><span className="lp-notif-h"><b>Yeffitness</b><small>{when}</small></span><strong>{title}</strong><p>{body}</p></div>
    </div>
  );
}

export function Landing() {
  const tour = useRef<TourHandle>(null), root = useReveal();
  const open = (screen: string, spot: string) => { document.getElementById("app")?.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => tour.current?.show(screen, spot), 350); };
  return (
    <main className="lp" ref={root as React.RefObject<HTMLElement>}>
      <header className="lp-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="Yeffitness" height={30} />
        <nav><a href="#progreso">Progreso</a><a href="#agenda">Agenda</a><a href="#app">La app</a><a href="#paquetes">Paquetes</a></nav>
        <a className="lp-btn sm" {...WA(HELLO)}>Escríbele a Yeff</a>
      </header>

      {/* 1. Portada */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EX("30-sentadilla-con-barra")} alt="" fetchPriority="high" />
        </div>
        <div className="lp-hero-txt">
          <p className="lp-eyebrow"><span className="lp-live" aria-hidden />Coaching online · Yeff González</p>
          <h1><span>Entrena con plan.</span><span>Mide cada serie.</span><span className="lp-glow">Mira cómo cambias.</span></h1>
          <p className="lp-lead">Yeff te arma la rutina, revisa cada entreno y te responde. Tu progreso, semana a semana, en una app hecha para ti.</p>
          <div className="lp-cta"><a className="lp-btn" {...WA(HELLO)}>Quiero entrenar con Yeff</a><a className="lp-btn ghost" href="#app">Ver la app por dentro</a></div>
          <ul className="lp-proof"><li>Plan hecho para ti</li><li>Progreso semana a semana</li><li>Avisos de tus sesiones</li></ul>
        </div>
        <div className="lp-hero-art" aria-hidden>
          <div className="lp-hero-phone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/shots/hoy.webp" alt="" />
          </div>
          <Notif cls="lp-hero-notif" when="ahora" title="Mañana tienes sesión con Yeff" body="A las 7:00 a. m. · seguimiento. Te esperamos." />
          <div className="lp-hero-chart">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/shots/tendencias.webp" alt="" />
          </div>
        </div>
      </section>

      {/* 2. Desfile de ejercicios */}
      <section className="lp-ex" aria-labelledby="lp-ex-t">
        <div className="lp-head dark"><p className="lp-eyebrow">Más de 140 ejercicios</p><h2 id="lp-ex-t">Cada ejercicio, con su dibujo.</h2>
          <p>Antes de hacerlo, ves cómo se hace. Y en tu rutina, la técnica explicada por Yeff.</p></div>
        {/* Sin "lazy": las fichas entran de lado mientras el desfile corre y con "lazy" aparecían en blanco. Prioridad baja. */}
        {[ROW1, ROW2].map((row, r) => (
          <div key={r} className={`lp-marq${r ? " rev" : ""}`} aria-hidden={r === 1}>
            <div className="lp-marq-track">{[...row, ...row].map((f, i) => (
              <figure key={`${f}-${i}`} className="lp-exc">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EX(f)} alt={i < row.length && r === 0 ? `${name(f)}: dibujo del ejercicio` : ""} width={180} height={180} fetchPriority="low" decoding="async" />
                <figcaption>{name(f)}</figcaption>
              </figure>))}</div>
          </div>))}
      </section>

      {/* 3. Progreso */}
      <section className="lp-prog" id="progreso">
        <div className="lp-head dark"><p className="lp-eyebrow">Tu progreso</p><h2>Tu progreso no se adivina. <span className="lp-glow">Se ve.</span></h2>
          <p>Cada serie que anotas se convierte en gráficas, récords y un resumen de Yeff cada semana.</p></div>
        <div className="lp-bento">
          <figure className="lp-bx lp-bx-chart" data-rv>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/shots/tendencias.webp" alt="Gráfica de semana a semana de la app: peso movido por semana con el promedio" loading="lazy" />
            <figcaption><b>Semana a semana</b><span>Entrenos, peso movido, nutrición, hábitos y peso. Ves si vas mejorando sin hacer cuentas.</span></figcaption>
          </figure>
          <figure className="lp-bx lp-bx-sum" data-rv>
            <div className="lp-bx-shot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/shots/resumen_card.webp" alt="Resumen semanal de la app con el comentario de Yeff" loading="lazy" />
            </div>
            <figcaption><b>Tu resumen, cada semana</b><span>Lo que lograste frente a la semana anterior, con el comentario de Yeff.</span></figcaption>
          </figure>
          <div className="lp-bx lp-bx-rec" data-rv>
            <b className="lp-bx-t">Récords</b>
            <ul>{[["Sentadilla goblet", "20 kg × 15", "antes 18 kg"], ["Hip thrust", "60 kg × 15", "antes 55 kg"], ["Remo con mancuerna", "16 kg × 12", "antes 15 kg"]].map(([n, v, a], i) => (
              <li key={n} style={{ transitionDelay: `${0.15 + i * 0.15}s` }}><span className="lp-rec-ic">↑</span><span><b>{n}</b><small>{a}</small></span><strong>{v}</strong></li>))}</ul>
            <span className="lp-bx-sub">Cada récord queda guardado con la fecha.</span>
          </div>
          <div className="lp-bx lp-bx-line" data-rv>
            <b className="lp-bx-t">Peso y medidas</b>
            <svg viewBox="0 0 300 120" className="lp-line" aria-hidden><defs><linearGradient id="lpg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F7254B" stopOpacity=".35" /><stop offset="1" stopColor="#F7254B" stopOpacity="0" /></linearGradient></defs>
              <path className="lp-line-a" d="M0,24 C30,26 50,34 75,40 S120,52 150,60 S210,74 240,82 S280,90 300,92 L300,120 L0,120 Z" fill="url(#lpg)" />
              <path className="lp-line-p" d="M0,24 C30,26 50,34 75,40 S120,52 150,60 S210,74 240,82 S280,90 300,92" fill="none" stroke="#F7254B" strokeWidth="3" strokeLinecap="round" /></svg>
            <span className="lp-bx-sub">La curva de tu peso, cintura, cadera y demás medidas desde que empezaste.</span>
          </div>
          <div className="lp-bx lp-bx-ph" data-rv>
            <b className="lp-bx-t">Fotos de progreso</b>
            <div className="lp-ph">{["Frente", "Lado", "Espalda"].map((t) => <span key={t}><i aria-hidden /><small>{t}</small></span>)}</div>
            <span className="lp-bx-sub">Privadas: solo tú y Yeff las ven.</span>
          </div>
        </div>
      </section>

      {/* 4. Agenda con avisos */}
      <section className="lp-ag" id="agenda">
        <div className="lp-ag-txt">
          <p className="lp-eyebrow">Agenda</p>
          <h2>Tus sesiones con Yeff, <span className="lp-glow">sin olvidos.</span></h2>
          <ul className="lp-ag-list">
            <li><b>Reservas en segundos</b><span>En los horarios que Yeff publica, desde la app.</span></li>
            <li><b>Te avisamos tres veces</b><span>El día antes, esa mañana y 1 hora antes.</span></li>
            <li><b>Queda en tu calendario</b><span>Un toque y se agrega al calendario de tu celular, iPhone o Android.</span></li>
            <li><b>Yeff también recibe sus avisos</b><span>Sabe quién tiene sesión hoy y mañana desde que abre la app.</span></li>
          </ul>
        </div>
        <div className="lp-lock" data-rv aria-label="Ejemplo de los avisos de una sesión en la pantalla bloqueada">
          <div className="lp-lock-time"><small>Martes, 24 de noviembre</small><b>6:00</b></div>
          <div className="lp-lock-list">
            <Notif cls="n1" when="ayer, 8:00 p. m." title="Mañana tienes sesión con Yeff" body="A las 7:00 a. m. · seguimiento. Te esperamos." />
            <Notif cls="n2" when="6:00 a. m." title="Hoy tienes sesión con Yeff" body="A las 7:00 a. m. · seguimiento. Te avisamos 1 hora antes." />
            <div className="lp-cal n3"><span className="lp-cal-d"><small>MAR</small><b>24</b></span><span><b>Seguimiento con Yeff</b><small>7:00 – 7:30 a. m. · alarma 1 h antes</small></span></div>
            <Notif cls="n4" when="hace 1 min" title="Tu sesión empieza pronto" body="Hoy a las 07:00" />
          </div>
        </div>
      </section>

      {/* 5. La app por dentro */}
      <section className="lp-tour" id="app">
        <div className="lp-head"><p className="lp-eyebrow">La app por dentro</p><h2>Así se ve un día con Yeff.</h2>
          <p>Este es el celular de una clienta que lleva 12 semanas. Toca los puntos rojos, cambia de pantalla abajo o deja que el recorrido avance solo.</p></div>
        <PhoneTour ref={tour} />
      </section>

      <section className="lp-parts">
        <div className="lp-head dark"><p className="lp-eyebrow">Todo lo que tienes</p><h2>Un ecosistema completo, no solo una rutina.</h2>
          <p>Toca cualquiera y te lo muestro en el celular.</p></div>
        <div className="lp-grid">{PARTS.map((x) => (
          <button key={x.t} type="button" className="lp-part" onClick={() => open(x.screen, x.spot)} data-rv>
            <span className="lp-part-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EX(x.img)} alt="" width={360} height={360} loading="lazy" decoding="async" />
            </span>
            <span className="lp-part-txt"><b>{x.t}</b><span>{x.d}</span><small>Ver en la app</small></span></button>))}</div>
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
        <div className="lp-final-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EX("49-burpees")} alt="" width={360} height={360} loading="lazy" />
        </div>
        <h2>¿Empezamos <span className="lp-glow">hoy?</span></h2>
        <p>Escríbele a Yeff, cuéntale tu objetivo y arman tu plan.</p>
        <a className="lp-btn" {...WA(HELLO)}>Escribirle por WhatsApp</a>
      </section>
      <footer className="lp-foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="Yeffitness" height={22} /><span>Las pantallas, gráficas, récords y avisos de esta página usan datos de ejemplo.</span>
      </footer>
    </main>
  );
}
