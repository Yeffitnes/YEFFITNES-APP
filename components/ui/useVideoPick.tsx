"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { videoDuration } from "@/lib/upload-video";
import { trimSupported, trimVideo } from "@/lib/trim-video";
import { VideoTrimmer } from "@/components/ui/VideoTrimmer";
import { BrandLoader } from "@/components/ui/BrandLoader";
const BIG_MB = 30; // un vídeo corto pero pesado (típico de la galería: 1080p/4K) se aligera antes de subirlo
// Elegir un vídeo: si se pasa del máximo, se abre el cortador en vez de rechazarlo; si es pesado, se aligera.
export function useVideoPick({ maxSeconds, maxMB, onFile, onError }: { maxSeconds: number; maxMB: number; onFile: (f: File) => void; onError: (m: string) => void }) {
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);
  const [busy, setBusy] = useState<{ label: string; pct?: number; skip?: boolean } | null>(null), ctl = useRef<AbortController | null>(null);
  const pick = async (f: File | null) => {
    if (!f) return; onError("");
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|3gp|mkv|avi|hevc)$/i.test(f.name)) return onError("Elige un vídeo.");
    setBusy({ label: "Leyendo tu vídeo…" });
    const d = await videoDuration(f);
    if (d && d > maxSeconds + 1) { setBusy(null); return setPending({ file: f, duration: d }); }
    if (d && f.size > BIG_MB * 1048576 && trimSupported()) {
      // Aligerar nunca debe atrapar al usuario: tiene un tope de tiempo y un botón para seguir con el original.
      const ac = new AbortController(); ctl.current = ac;
      const cap = window.setTimeout(() => ac.abort(), (d * 1.6 + 12) * 1000);
      try {
        setBusy({ label: "Optimizando tu vídeo para subirlo más rápido…", pct: 0, skip: true });
        const small = await trimVideo(f, 0, d, (pct) => setBusy({ label: "Optimizando tu vídeo para subirlo más rápido…", pct, skip: true }), ac.signal);
        window.clearTimeout(cap); ctl.current = null; setBusy(null); if (small.size < f.size) return onFile(small);
      } catch { /* si no se puede aligerar, se sube el original */ }
      window.clearTimeout(cap); ctl.current = null;
    }
    setBusy(null);
    if (f.size > maxMB * 1048576) return onError(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    onFile(f);
  };
  // En un portal: dentro de una tarjeta con recorte u animación, el cortador quedaba cortado o fuera de pantalla.
  const trimmer = pending
    ? createPortal(<VideoTrimmer file={pending.file} duration={pending.duration} maxSeconds={maxSeconds} onCancel={() => setPending(null)} onDone={(nf) => { setPending(null); onFile(nf); }} />, document.body)
    : busy ? createPortal(<div className="vt" role="status"><div className="vt-box" style={{ borderRadius: 22, margin: "auto 16px" }}><BrandLoader dark label={busy.pct !== undefined ? `${busy.label} ${busy.pct}%` : busy.label} />{busy.skip && <button type="button" className="vt-go" style={{ marginTop: 0, background: "rgba(255,255,255,.1)" }} onClick={() => ctl.current?.abort()}>Subir sin optimizar</button>}</div></div>, document.body) : null;
  return { pick, trimmer };
}
