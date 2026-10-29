"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { exImage } from "@/lib/exmeta";
// Miniatura del ejercicio con el personaje (0039). Si no hay imagen o no carga, muestra lo de siempre (fallback).
export function ExPic({ image, name, size = 44, className = "", fallback = null, onClick }: { image?: string | null; name: string; size?: number; className?: string; fallback?: React.ReactNode; onClick?: () => void }) {
  const [bad, setBad] = useState(false), src = exImage(image);
  if (!src || bad) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src} alt={`${name}: cómo se hace`} width={size} height={size} loading="lazy" decoding="async" className={`ex-pic ${className}`} onError={() => setBad(true)} />;
  return onClick ? <button type="button" className="ex-pic-btn" aria-label={`Ver imagen de ${name}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>{img}</button> : img;
}
// Vista ampliada (toque en la miniatura): imagen, nombre e indicación. Se cierra tocando fuera o con Escape.
export function ExPicViewer({ image, name, note, onClose }: { image?: string | null; name: string; note?: string | null; onClose: () => void }) {
  const src = exImage(image), [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!src || !m) return null;
  // Portal al body: dentro de una tarjeta con animación, "fixed" quedaba atado a la tarjeta y la imagen salía cortada.
  return createPortal(
    <div className="expv" role="dialog" aria-modal="true" aria-label={name} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="expv-box" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${name}: cómo se hace`} width={360} height={360} />
        <div className="expv-txt"><b>{name}</b>{note && <span>{note}</span>}</div>
        <button type="button" className="expv-close" autoFocus onClick={onClose}>Cerrar</button>
      </div>
    </div>, document.body);
}
