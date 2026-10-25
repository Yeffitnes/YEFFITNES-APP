"use client";
import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/BrandLoader";
// Reproductor del diseño (modal oscuro). Vídeos de YouTube sin cookies; los privados (Bunny) se agregarán con su propia fuente.
export function VideoModal({ ytId, title, sub, onClose }: { ytId: string; title: string; sub?: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null), [ready, setReady] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); closeRef.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="video-modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="video-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="video-modal-stage">{!ready && <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}><BrandLoader dark label="Cargando vídeo" height={0} /></div>}<iframe onLoad={() => setReady(true)} src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
        <div className="video-modal-bar">
          <div className="video-modal-info"><div className="video-modal-title">{title}</div>{sub && <div className="video-modal-sub">{sub}</div>}<a className="video-modal-sub" style={{ textDecoration: "underline", marginTop: 4, display: "inline-block" }} href={`https://www.youtube.com/watch?v=${ytId}`} target="_blank" rel="noopener noreferrer">¿No carga? Ábrelo en YouTube</a></div>
          <button ref={closeRef} className="video-modal-close" aria-label="Cerrar vídeo" onClick={onClose}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
        </div>
      </div>
    </div>
  );
}
export const PLAY_PATH = "M6 4l11 6-11 6V4z";
