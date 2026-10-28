"use client";
import { useId } from "react";
// Personaje guía de YEFFITNES (versión 2, 27-oct): mezcla del primero (cabeza con solo la cinta, cara amable con sonrisa fija)
// con la propuesta de Cristian (ropa deportiva, codos y rodillas articulados, tenis, accesorios). Sin seguir el ratón y sin abrir la boca:
// al "hablar" la sonrisa solo se mueve un poco. Todo se anima con CSS (bloque "Personaje guía" en app/inicio/portal.css).
// Poses: idle · wave · point(dir) · cheer · flex · workout (mancuerna) · hydrate (botella) · squat (sentadilla).
export type GuidePose = "idle" | "wave" | "point" | "cheer" | "flex" | "workout" | "hydrate" | "squat";
export type GuideDir = "up" | "down" | "left" | "right";
const INK = "#0A0910", CLOTH = "#16131F", RED = "#F7254B";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`h${id}`} cx="24%" cy="14%" r="95%"><stop offset="0" stopColor={RED} stopOpacity=".8" /><stop offset=".6" stopColor={RED} stopOpacity="0" /></radialGradient>
      <radialGradient id={`b${id}`} cx="22%" cy="0%" r="110%"><stop offset="0" stopColor={RED} stopOpacity=".5" /><stop offset=".55" stopColor={RED} stopOpacity="0" /></radialGradient>
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
function Shoe({ x, flip, id }: { x: number; flip?: boolean; id: string }) {
  return (
    <g transform={`translate(${x} 148)${flip ? " scale(-1 1)" : ""}`}>
      <path d="M-9 1.5 Q-9 -4.5 -2 -5 L3 -5 Q8 -4.6 9.5 -1 L10 1.5 Z" fill={`url(#r${id})`} />
      <rect x="-10" y="1" width="21" height="3.6" rx="1.8" fill="#fff" />
      <path d="M-2.5 -3.8 L1.5 -1.4" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".9" />
    </g>
  );
}
function Leg({ side }: { side: "l" | "r" }) {
  const L = side === "l", hip = L ? 52 : 68, knee = L ? 48 : 72, ankle = L ? 46.5 : 73.5, stripe = L ? -4.2 : 4.2;
  return (
    <g className={`gd-thigh-${side}`}>
      <path d={`M${hip} 113 L${knee} 130`} stroke={CLOTH} strokeWidth="11.5" strokeLinecap="round" />
      <path d={`M${hip + stripe} 115 L${knee + stripe} 129`} stroke={RED} strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
      <g className={`gd-calf-${side}`}>
        <path d={`M${knee} 130 L${ankle} 143`} stroke={CLOTH} strokeWidth="10.5" strokeLinecap="round" />
        <path d={`M${knee + stripe} 131 L${ankle + stripe * 0.9} 141`} stroke={RED} strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
        <rect x={ankle - 5.2} y="141.5" width="10.4" height="3.2" rx="1.6" fill={INK} />
      </g>
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
  return null;
}
function Arm({ side, pose }: { side: "l" | "r"; pose: GuidePose }) {
  const L = side === "l", sh = L ? 41 : 79, el = L ? 31 : 89, hd = L ? 27 : 93;
  return (
    <g className={`gd-arm-${side}`}>
      <path d={`M${sh} 85 L${el} 104`} stroke={INK} strokeWidth="9.5" strokeLinecap="round" />
      <g className={`gd-fore-${side}`}>
        <path d={`M${el} 104 L${hd} 119`} stroke="#14111C" strokeWidth="8.6" strokeLinecap="round" />
        <path d={`M${el + (hd - el) * 0.62} ${104 + 15 * 0.62} L${el + (hd - el) * 0.8} ${104 + 15 * 0.8}`} stroke={RED} strokeWidth="8.8" strokeLinecap="butt" />
        {!L && <rect x="90" y="110" width="5.4" height="4.6" rx="1.3" fill="#fff" transform="rotate(14 92.7 112.3)" />}
        <circle cx={hd} cy="121" r="5.6" fill={INK} />
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
          <g className="gd-legs"><Leg side="l" /><Leg side="r" />
            <path d="M40 112 Q40 121 52 121 L68 121 Q80 121 80 112 Z" fill={CLOTH} />
            <rect x="39.5" y="109.5" width="41" height="5" rx="2.5" fill={INK} stroke={RED} strokeWidth=".8" />
          </g>
          <Arm side="l" pose={pose} />
          <g className="gd-body">
            <path d="M39 86 C39 77 48 76 60 76 C72 76 81 77 81 86 L79 111 C79 114 74 115 60 115 C46 115 41 114 41 111 Z" fill={INK} />
            <path d="M39 86 C39 77 48 76 60 76 C72 76 81 77 81 86 L79 111 C79 114 74 115 60 115 C46 115 41 114 41 111 Z" fill={`url(#b${id})`} />
            <path d="M48 76.5 L60 92 L72 76.5" stroke={RED} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            <path d="M43.5 82 Q41 94 43.5 106" stroke={RED} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9" />
            <path d="M76.5 82 Q79 94 76.5 106" stroke={RED} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9" />
            <g transform="translate(60 101)"><circle r="5" fill="#1D1A28" stroke={RED} strokeWidth="1" /><path d="M-2.1 -2.2 L0 0 L2.1 -2.2 M0 0 L0 2.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
          </g>
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
