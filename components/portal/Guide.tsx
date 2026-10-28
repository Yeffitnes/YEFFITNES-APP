"use client";
import { useId } from "react";
// Personaje guía de YEFFITNES (versión 3, 27-oct: ropa estilo ilustración): mezcla del primero (cabeza con solo la cinta, cara amable con sonrisa fija)
// con la propuesta de Cristian (ropa deportiva, codos y rodillas articulados, tenis, accesorios). Sin seguir el ratón y sin abrir la boca:
// al "hablar" la sonrisa solo se mueve un poco. Todo se anima con CSS (bloque "Personaje guía" en app/inicio/portal.css).
// Poses: idle · wave · point(dir) · cheer · flex · workout (mancuerna) · hydrate (botella) · squat (sentadilla)
//        · clipboard (planilla de la agenda) · stopwatch (cronómetro) · phone (celular, mensajes) · study (libro, material).
export type GuidePose = "idle" | "wave" | "point" | "cheer" | "flex" | "workout" | "hydrate" | "squat" | "clipboard" | "stopwatch" | "phone" | "study";
export type GuideDir = "up" | "down" | "down-left" | "left" | "right";   // down-left: señala abajo con la mano izquierda
const INK = "#0A0910", RED = "#F7254B";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`h${id}`} cx="24%" cy="14%" r="95%"><stop offset="0" stopColor={RED} stopOpacity=".8" /><stop offset=".6" stopColor={RED} stopOpacity="0" /></radialGradient>
      <radialGradient id={`b${id}`} cx="22%" cy="0%" r="110%"><stop offset="0" stopColor={RED} stopOpacity=".5" /><stop offset=".55" stopColor={RED} stopOpacity="0" /></radialGradient>
      <pattern id="mesh" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r=".45" fill="#2E293B" /></pattern>
      <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF5A78" /><stop offset=".6" stopColor={RED} /><stop offset="1" stopColor="#C8123A" /></linearGradient>
    </defs>
  );
}
// Cabeza: la del primer personaje (cinta roja, ojos blancos, mejillas y sonrisa fija).
function Head({ id }: { id: string }) {
  return (
    <g className="gd-head"><g className="gd-head-in">
      <circle cx="60" cy="44" r="31" fill={INK} />
      <circle cx="60" cy="44" r="31" fill={`url(#h${id})`} />
      <path d="M32.5 34C40 28.5 49.5 26 60 26S80 28.5 87.5 34" stroke={RED} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M38 31.2C44.5 28 51.8 26.9 60 26.9" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity=".45" />
      <g className="gd-face">
        <g className="gd-eyes"><ellipse cx="50" cy="46" rx="3.8" ry="4.9" fill="#fff" /><ellipse cx="70" cy="46" rx="3.8" ry="4.9" fill="#fff" /></g>
        <ellipse cx="44" cy="55" rx="3.6" ry="2" fill={RED} opacity=".45" /><ellipse cx="76" cy="55" rx="3.6" ry="2" fill={RED} opacity=".45" />
        <path className="gd-mouth" d="M52.5 58c4.4 4 10.6 4 15 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    </g></g>
  );
}
// ───── Ropa v3 (estilo ilustración: contorno negro, chaqueta abierta con capucha, camiseta con escudo, pantalón ancho de doble franja) ─────
const OUT = "#050408", JK = "#1B1824", JK2 = "#24202F", PANT = "#1E1A28", RIB = "#2E293B";
const ol = { stroke: OUT, strokeWidth: 1.1, strokeLinejoin: "round" as const };
const pipe = (w = 0.9) => ({ stroke: RED, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" });
// Se dibuja el lado izquierdo y el derecho es su espejo (x → 120 − x). Solo comandos absolutos (M L C Q Z) en estas rutas.
const mirror = (d: string) => { let i = 0; return d.replace(/-?\d*\.?\d+/g, (n) => (i++ % 2 === 0 ? String(+(120 - Number(n)).toFixed(2)) : n)); };
function Shoe({ x, flip }: { x: number; flip?: boolean; id: string }) {
  return (
    <g transform={`translate(${x} 148)${flip ? " scale(-1 1)" : ""}`}>
      <path d="M-10.5 1.2 Q-10.8 -5.2 -3 -6 L3.4 -6 Q9.6 -5.4 11 -0.6 L11.4 1.6 Z" fill={RED} {...ol} />
      <path d="M-9.6 -1.4 Q-6 -3 -1 -2.4" stroke="#fff" strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".85" />
      <path d="M2.4 -5.4 L5.6 -2.6 M4.2 -5.6 L7.2 -3" stroke="#fff" strokeWidth=".8" strokeLinecap="round" />
      <path d="M-11.2 0.8 L11.8 0.8 Q12.4 0.8 12.2 2.4 L11.8 4.4 Q11.6 5.2 10.8 5.2 L-10.4 5.2 Q-11.4 5.2 -11.6 4.2 L-11.8 2.2 Q-11.9 0.8 -11.2 0.8 Z" fill="#fff" {...ol} />
      <path d="M-10.4 3.2 L11 3.2" stroke="#D9DCE5" strokeWidth=".7" />
    </g>
  );
}
// Pantalón deportivo ancho (recto, cae sobre el tenis) con doble franja roja, pliegues y pretina acanalada con cordón.
const PT = {
  thigh: "M43.4 111.5 L60.4 111.5 L57.2 131.5 L39.4 131.5 Z",
  calf: "M39 129.5 L57.4 129.5 L57.2 147 Q48 148.8 38.2 147 Z",
  tPipe1: "M44.6 112.5 L40.8 130.5", tPipe2: "M46.4 112.5 L42.6 130.5",
  cPipe1: "M40.6 130.5 L39.9 146.4", cPipe2: "M42.4 130.5 L41.8 146.6",
  tFold: "M48.5 121.5 Q52 123 55.4 121.2", kFold: "M45.2 131.4 Q49.6 133.4 54.6 131", hFold: "M44 143 Q48.6 144.6 54 142.6", hFold2: "M51.6 139 Q53.6 140.6 55.6 139.6",
};
function Leg({ side }: { side: "l" | "r" }) {
  const m = side === "l" ? (d: string) => d : mirror;
  const fold = { stroke: OUT, strokeWidth: 0.9, strokeLinecap: "round" as const, fill: "none", opacity: 0.85 };
  return (
    <g className={`gd-thigh-${side}`}>
      <g className={`gd-calf-${side}`}>
        <path d={m(PT.calf)} fill={PANT} {...ol} />
        <path d={m(PT.cPipe1)} {...pipe(1)} /><path d={m(PT.cPipe2)} {...pipe(1)} />
        <path d={m(PT.hFold)} {...fold} /><path d={m(PT.hFold2)} {...fold} />
      </g>
      <path d={m(PT.thigh)} fill={PANT} />
      <path d={m("M43.4 111.5 L39.4 131.5 M60.4 111.5 L57.2 131.5")} stroke={OUT} strokeWidth="1.1" strokeLinecap="round" />
      <path d={m(PT.tPipe1)} {...pipe(1)} /><path d={m(PT.tPipe2)} {...pipe(1)} />
      <path d={m(PT.tFold)} {...fold} /><path d={m(PT.kFold)} {...fold} />
    </g>
  );
}
function Hips() {
  return (
    <g>
      <path d="M40.2 112 Q39.4 122 44.6 125.6 L75.4 125.6 Q80.6 122 79.8 112 Z" fill={PANT} {...ol} />
      <path d="M60 117 L60 125.4" stroke={OUT} strokeWidth=".9" strokeLinecap="round" />
      <path d="M40.4 113.8 L79.6 113.8" stroke={RIB} strokeWidth="5.2" strokeDasharray=".7 1.1" />
      <rect x="39.8" y="111.2" width="40.4" height="5.2" rx="2.2" fill="none" {...ol} />
      <path d="M57.6 114.6 Q56.4 119 55.6 123.4 M62.4 114.6 Q63.8 118.8 64.6 123" stroke="#E9EAF0" strokeWidth=".9" strokeLinecap="round" fill="none" />
      <circle cx="57.6" cy="114.4" r="1.2" fill={OUT} /><circle cx="62.4" cy="114.4" r="1.2" fill={OUT} />
      <rect x="54.8" y="123" width="1.6" height="2.6" rx=".6" fill={RED} /><rect x="63.8" y="122.6" width="1.6" height="2.6" rx=".6" fill={RED} />
    </g>
  );
}
// Torso: camiseta técnica con escudo "Y" debajo de una chaqueta abierta con capucha, cordones y bordes acanalados.
function Torso() {
  return (
    <g className="gd-body">
      {/* capucha detrás del cuello (asoma a los lados de la cabeza) */}
      <path d="M41 82 Q38 71 48 68.6 L72 68.6 Q82 71 79 82 Z" fill={JK} {...ol} />
      <path d="M45 80 Q44 73 51 71.6 L69 71.6 Q76 73 75 80 Z" fill="#3A0E1A" />
      {/* camiseta interior */}
      <path d="M47.6 78 L72.4 78 L72 111 L48 111 Z" fill="#121019" {...ol} />
      <path d="M48.4 80 L71.6 80 L71.4 110 L48.6 110 Z" fill="url(#mesh)" opacity=".55" />
      <path d="M50.6 78 Q60 87 69.4 78" stroke={RED} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M49.6 92 L53 96 L53 106 M70.4 92 L67 96 L67 106" {...pipe(0.8)} opacity=".8" />
      <g transform="translate(60 96)"><circle r="5.4" fill="#1D1A28" stroke={RED} strokeWidth="1.1" /><path d="M-2.3 -2.4 L0 0 L2.3 -2.4 M0 0 L0 2.9" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
      {/* chaqueta: panel izquierdo y su espejo */}
      {[(d: string) => d, mirror].map((m, i) => (
        <g key={i}>
          <path d={m("M39 86 C39 78.6 44 77 49.6 76.6 L53.2 77.4 Q51.6 94 52.4 108.6 L41.4 108.6 Q40.2 97 39 86 Z")} fill={JK} {...ol} />
          <path d={m("M49.6 76.8 L53 77.6 Q51.4 94 52.2 108.4")} stroke={RED} strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={m("M41.6 84 L45.4 89.6 L45.4 100.4 L48.6 104")} {...pipe(0.9)} />
          <path d={m("M43.4 82 Q46.6 80.2 49.4 80.6")} {...pipe(0.7)} opacity=".7" />
          <path d={m("M47.8 97.4 L51 97.4")} stroke={OUT} strokeWidth=".9" strokeLinecap="round" />
          <path d={m("M52.2 79 Q51 86 51.4 93")} stroke="#E9EAF0" strokeWidth=".9" strokeLinecap="round" fill="none" />
          <rect x={i ? 67.8 : 50.6} y="92.6" width="1.6" height="2.8" rx=".6" fill={RED} />
        </g>
      ))}
      {/* borde acanalado de la chaqueta */}
      {[(d: string) => d, mirror].map((m, i) => (
        <g key={`h${i}`}>
          <path d={m("M41 108.2 L52.6 108.2 L52.6 112.6 L41.4 112.6 Z")} fill={JK} />
          <path d={m("M41.6 110.4 L52.2 110.4")} stroke={RIB} strokeWidth="4.4" strokeDasharray=".7 1.1" />
          <path d={m("M41 108.2 L52.6 108.2 L52.6 112.6 L41.4 112.6 Z")} fill="none" {...ol} />
        </g>
      ))}
    </g>
  );
}
function Accessory({ pose }: { pose: GuidePose }) {
  if (pose === "workout") return (
    <g transform="translate(93 122) rotate(10)">
      <rect x="-9" y="-1.6" width="18" height="3.2" rx="1.6" fill="#D9DCE5" />
      <rect x="-12.5" y="-6" width="4.2" height="12" rx="1.6" fill={INK} stroke={RED} strokeWidth=".9" />
      <rect x="8.3" y="-6" width="4.2" height="12" rx="1.6" fill={INK} stroke={RED} strokeWidth=".9" />
    </g>);
  if (pose === "hydrate") return (
    <g transform="translate(93 117) rotate(-8)">
      <rect x="-3.6" y="-10" width="7.2" height="15" rx="2.6" fill="#fff" stroke="#D9DCE5" strokeWidth=".7" />
      <rect x="-2.6" y="-4" width="5.2" height="8" rx="1.3" fill={RED} opacity=".85" />
      <rect x="-2.8" y="-12.6" width="5.6" height="3" rx="1" fill={RED} />
    </g>);
  // Objetos que se sostienen frente al pecho o en alto: se dibujan en la mano y se contrarrestan los giros del brazo para que queden derechos.
  const held = (turn: number, child: React.ReactNode) => <g transform={`translate(93 121) rotate(${turn})`}>{child}</g>;
  if (pose === "clipboard") return held(130, (
    <g className="gd-acc-bob" transform="translate(-3 -10) rotate(-6)">
      <rect x="-7" y="-9" width="14" height="18" rx="2" fill="#2A2436" stroke={OUT} strokeWidth="1" />
      <rect x="-5.6" y="-6.6" width="11.2" height="14.4" rx="1" fill="#fff" />
      <rect x="-3" y="-10.4" width="6" height="3.4" rx="1.2" fill={RED} stroke={OUT} strokeWidth=".8" />
      <path d="M-3.8 -3 L-2.6 -1.8 L-0.6 -4.2 M0.8 -2.8 L3.8 -2.8 M-3.8 1.4 L-2.6 2.6 L-0.6 0.2 M0.8 1.6 L3.8 1.6 M-3.8 5 L3.8 5" stroke={RED} strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>));
  if (pose === "stopwatch") return held(120, (
    <g transform="translate(0 -9)">
      <rect x="-1.4" y="-10.6" width="2.8" height="2.4" rx=".7" fill="#D9DCE5" stroke={OUT} strokeWidth=".7" />
      <circle r="7.6" fill="#fff" stroke={OUT} strokeWidth="1.1" />
      <circle r="5.8" fill="none" stroke={RED} strokeWidth="1" />
      <path className="gd-tick" d="M0 0 L0 -4.6" stroke={OUT} strokeWidth="1.2" strokeLinecap="round" />
      <circle r=".9" fill={OUT} />
    </g>));
  if (pose === "phone") return held(130, (
    <g className="gd-acc-bob" transform="translate(-2 -9) rotate(-8)">
      <rect x="-4.6" y="-8.2" width="9.2" height="16.4" rx="2.2" fill={OUT} />
      <rect x="-3.6" y="-6.6" width="7.2" height="12.4" rx="1.2" fill="#fff" />
      <rect x="-2.6" y="-5" width="4.6" height="2.4" rx="1.2" fill={RED} /><rect x="-0.8" y="-1.6" width="3.4" height="2.4" rx="1.2" fill="#D9DCE5" /><rect x="-2.6" y="1.8" width="4" height="2.4" rx="1.2" fill={RED} />
    </g>));
  if (pose === "study") return held(130, (
    <g transform="translate(-4 -9) rotate(-4)">
      <path d="M0 -6.6 Q-5 -8.4 -10 -6.8 L-10 6.4 Q-5 4.8 0 6.6 Q5 4.8 10 6.4 L10 -6.8 Q5 -8.4 0 -6.6 Z" fill={RED} stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
      <path d="M0 -5.6 Q-4.4 -7.2 -8.6 -5.8 L-8.6 5 Q-4.4 3.8 0 5.4 Q4.4 3.8 8.6 5 L8.6 -5.8 Q4.4 -7.2 0 -5.6 Z" fill="#fff" />
      <path d="M0 -5.6 L0 5.4" stroke="#D9DCE5" strokeWidth=".8" />
      <path d="M-6.8 -3 L-2 -3 M-6.8 -0.4 L-2 -0.4 M-6.8 2.2 L-3.4 2.2 M2 -3 L6.8 -3 M2 -0.4 L6.8 -0.4" stroke="#B5B9C6" strokeWidth=".7" strokeLinecap="round" />
    </g>));
  return null;
}
// Brazo con manga de chaqueta (franja roja a lo largo) y puño acanalado.
function Arm({ side, pose }: { side: "l" | "r"; pose: GuidePose }) {
  const L = side === "l", sh = L ? 41 : 79, el = L ? 31 : 89, hd = L ? 27 : 93, o = L ? -3.4 : 3.4;
  const cx0 = el + (hd - el) * 0.66, cy0 = 104 + 15 * 0.66, cx1 = el + (hd - el) * 0.9, cy1 = 104 + 15 * 0.9;
  return (
    <g className={`gd-arm-${side}`}>
      <path d={`M${sh} 85 L${el} 104`} stroke={OUT} strokeWidth="13.4" strokeLinecap="round" />
      <path d={`M${sh} 85 L${el} 104`} stroke={JK} strokeWidth="11.2" strokeLinecap="round" />
      <path d={`M${sh + o} ${85 - 1.4} L${el + o} ${104 - 1.2}`} {...pipe(1)} />
      <g className={`gd-fore-${side}`}>
        <path d={`M${el} 104 L${cx1} ${cy1}`} stroke={OUT} strokeWidth="12.4" strokeLinecap="round" />
        <path d={`M${el} 104 L${cx1} ${cy1}`} stroke={JK2} strokeWidth="10.2" strokeLinecap="round" />
        <path d={`M${el + o * 0.9} ${104 - 0.6} L${cx0 + o * 0.9} ${cy0 - 0.6}`} {...pipe(1)} />
        <path d={`M${cx0} ${cy0} L${cx1} ${cy1}`} stroke={RIB} strokeWidth="10.2" strokeDasharray=".7 1" />
        {!L && <g transform={`translate(${hd - 0.6} 115.6) rotate(14)`}><rect x="-3.4" y="-2.8" width="6.8" height="5.6" rx="1.5" fill={OUT} /><rect x="-2.2" y="-1.7" width="4.4" height="3.4" rx=".8" fill={RED} opacity=".9" /></g>}
        <circle cx={hd} cy="121" r="5.8" fill={INK} {...ol} />
        {!L && <Accessory pose={pose} />}
      </g>
    </g>
  );
}
export function Guide({ size = 96, pose = "idle", dir = "down", talking = true, face = false }: { size?: number; pose?: GuidePose; dir?: GuideDir; talking?: boolean; face?: boolean }) {
  const id = useId().replace(/:/g, "");
  if (face) return <GuideFace size={size} talking={talking} />;
  const h = Math.round(size * 1.333);
  return (
    <span className={`gd gd-${pose} gd-to-${dir}${talking ? " gd-talk" : ""}`} style={{ width: size, height: h }} aria-hidden>
      <svg viewBox="0 0 120 160" width={size} height={h}>
        <Defs id={id} />
        <ellipse className="gd-shadow" cx="60" cy="153" rx="26" ry="3.4" fill={INK} opacity=".16" />
        <g className="gd-feet"><Shoe x={44} id={id} /><Shoe x={76} flip id={id} /></g>
        <g className="gd-all">
          <g className="gd-legs"><Leg side="l" /><Leg side="r" /><Hips /></g>
          <Arm side="l" pose={pose} />
          <Torso />
          <Arm side="r" pose={pose} />
          <Head id={id} />
        </g>
      </svg>
    </span>
  );
}
// Solo la cara (espacios pequeños: paneles "Falta poco", avisos, chips).
export function GuideFace({ size = 40, talking = false }: { size?: number; talking?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={`gd gd-idle gd-face-only${talking ? " gd-talk" : ""}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="27 11 66 66" width={size} height={size}><Defs id={id} /><Head id={id} /></svg>
    </span>
  );
}
