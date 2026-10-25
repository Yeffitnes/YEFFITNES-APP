// Carga con la marca: el logo late con una luz que lo recorre. Para vídeos y esperas largas (no para listas: ahí van los esqueletos).
export function BrandLoader({ label = "Cargando", dark = false, height }: { label?: string; dark?: boolean; height?: number }) {
  return (
    <div className={`brand-loader${dark ? " dark" : ""}`} role="status" aria-live="polite" style={height ? { minHeight: height } : undefined}>
      <span className="bl-logo"><img src={dark ? "/brand/logo.svg" : "/brand/logo-claro.svg"} alt="" width={168} height={40} /><i aria-hidden /></span>
      <span className="bl-bar" aria-hidden><i /></span>
      <span className="bl-label">{label}</span>
    </div>
  );
}
