"use client";
// Personaje guía (PROPUESTA provisional en la marca: cuerpo negro con brillo rojo, cinta y tenis rojos). El diseño definitivo está NO DEFINIDO:
// para cambiarlo basta con reemplazar este componente. Todo se mueve con CSS (bloque "Personaje guía" en portal.css) y respeta "reducir movimiento".
// Poses: idle (respira, parpadea y mira a los lados) · wave (saluda con la mano) · point (señala hacia `dir`) · cheer (celebra con los brazos arriba).
export type GuidePose = "idle" | "wave" | "point" | "cheer";
export type GuideDir = "up" | "down" | "left" | "right";
export function Guide({ size = 96, pose = "idle", dir = "down", talking = true, face = false }: { size?: number; pose?: GuidePose; dir?: GuideDir; talking?: boolean; face?: boolean }) {
  if (face) return <GuideFace size={size} talking={talking} />;
  return (
    <span className={`gd gd-${pose} gd-to-${dir}${talking ? " gd-talk" : ""}`} style={{ width: size, height: Math.round(size * 1.3) }} aria-hidden>
      <svg viewBox="0 0 120 156" width={size} height={Math.round(size * 1.3)}>
        <defs>
          <radialGradient id="gd-glow" cx="24%" cy="14%" r="95%"><stop offset="0" stopColor="#F7254B" stopOpacity=".8" /><stop offset=".6" stopColor="#F7254B" stopOpacity="0" /></radialGradient>
          <radialGradient id="gd-glow-b" cx="20%" cy="0%" r="110%"><stop offset="0" stopColor="#F7254B" stopOpacity=".55" /><stop offset=".55" stopColor="#F7254B" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse className="gd-shadow" cx="60" cy="151" rx="26" ry="3.6" fill="#0A0910" opacity=".16" />
        <g className="gd-all">
          <g className="gd-legs">
            <path d="M51 120 L49 140" stroke="#0A0910" strokeWidth="11" strokeLinecap="round" />
            <path d="M69 120 L71 140" stroke="#0A0910" strokeWidth="11" strokeLinecap="round" />
            <rect x="38" y="138" width="20" height="9" rx="4.5" fill="#F7254B" />
            <rect x="62" y="138" width="20" height="9" rx="4.5" fill="#F7254B" />
          </g>
          <g className="gd-arm gd-arm-l">
            <path d="M41 86 L29 110" stroke="#16131c" strokeWidth="10" strokeLinecap="round" />
            <path d="M31.2 105.6 L27 114" stroke="#F7254B" strokeWidth="10" strokeLinecap="butt" opacity=".9" />
            <circle cx="27.5" cy="114" r="6" fill="#16131c" />
          </g>
          <g className="gd-body">
            <path d="M38 88 Q38 78 49 77 L71 77 Q82 78 82 88 L80 120 Q80 126 74 126 L46 126 Q40 126 40 120 Z" fill="#0A0910" />
            <path d="M38 88 Q38 78 49 77 L71 77 Q82 78 82 88 L80 120 Q80 126 74 126 L46 126 Q40 126 40 120 Z" fill="url(#gd-glow-b)" />
            <path d="M47 77 L60 96 L73 77" stroke="#F7254B" strokeWidth="3.4" strokeLinejoin="round" fill="none" />
            <rect x="40.5" y="112" width="39" height="4" rx="2" fill="#F7254B" opacity=".85" />
          </g>
          <g className="gd-arm gd-arm-r">
            <path d="M79 86 L91 110" stroke="#16131c" strokeWidth="10" strokeLinecap="round" />
            <path d="M88.8 105.6 L93 114" stroke="#F7254B" strokeWidth="10" strokeLinecap="butt" opacity=".9" />
            <circle cx="92.5" cy="114" r="6" fill="#16131c" />
          </g>
          <g className="gd-head">
            <circle cx="60" cy="44" r="31" fill="#0A0910" />
            <circle cx="60" cy="44" r="31" fill="url(#gd-glow)" />
            <path d="M32.5 34C40 28.5 49.5 26 60 26S80 28.5 87.5 34" stroke="#F7254B" strokeWidth="6" strokeLinecap="round" fill="none" />
            <g className="gd-face">
              <g className="gd-eyes"><ellipse cx="50" cy="46" rx="3.8" ry="4.9" fill="#fff" /><ellipse cx="70" cy="46" rx="3.8" ry="4.9" fill="#fff" /></g>
              <ellipse cx="44" cy="55" rx="3.6" ry="2" fill="#F7254B" opacity=".45" /><ellipse cx="76" cy="55" rx="3.6" ry="2" fill="#F7254B" opacity=".45" />
              <path className="gd-mouth" d="M52.5 58c4.4 4 10.6 4 15 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
// Solo la cara (para espacios pequeños: botones, avisos, chips).
export function GuideFace({ size = 40, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <span className={`gd gd-idle gd-face-only${talking ? " gd-talk" : ""}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="27 11 66 66" width={size} height={size}>
        <defs><radialGradient id="gd-glow-f" cx="24%" cy="14%" r="95%"><stop offset="0" stopColor="#F7254B" stopOpacity=".8" /><stop offset=".6" stopColor="#F7254B" stopOpacity="0" /></radialGradient></defs>
        <g className="gd-head">
          <circle cx="60" cy="44" r="31" fill="#0A0910" /><circle cx="60" cy="44" r="31" fill="url(#gd-glow-f)" />
          <path d="M32.5 34C40 28.5 49.5 26 60 26S80 28.5 87.5 34" stroke="#F7254B" strokeWidth="6" strokeLinecap="round" fill="none" />
          <g className="gd-face"><g className="gd-eyes"><ellipse cx="50" cy="46" rx="3.8" ry="4.9" fill="#fff" /><ellipse cx="70" cy="46" rx="3.8" ry="4.9" fill="#fff" /></g>
            <path className="gd-mouth" d="M52.5 58c4.4 4 10.6 4 15 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
        </g>
      </svg>
    </span>
  );
}
