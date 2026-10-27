"use client";
// Personaje guía del onboarding. PROPUESTA provisional en la marca (cabeza negra con brillo rojo, cinta roja, ojos que parpadean):
// el diseño definitivo del personaje está NO DEFINIDO. Para cambiarlo por una ilustración basta con reemplazar este componente.
export function Guide({ size = 64, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <span className={`guide${talking ? " talking" : ""}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <defs>
          <radialGradient id="g-glow" cx="22%" cy="16%" r="90%"><stop offset="0" stopColor="#F7254B" stopOpacity=".75" /><stop offset=".62" stopColor="#F7254B" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#0A0910" />
        <circle cx="32" cy="32" r="30" fill="url(#g-glow)" />
        <path d="M6.5 22.5C14 17 22.5 14.5 32 14.5S50 17 57.5 22.5" stroke="#F7254B" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <g className="guide-eyes"><ellipse cx="23.5" cy="33" rx="3.6" ry="4.6" fill="#fff" /><ellipse cx="40.5" cy="33" rx="3.6" ry="4.6" fill="#fff" /></g>
        <path className="guide-mouth" d="M24.5 44.5c4.6 4.2 10.4 4.2 15 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  );
}
