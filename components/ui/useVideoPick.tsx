"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { videoDuration } from "@/lib/upload-video";
import { trimSupported, trimVideo } from "@/lib/trim-video";
import { VideoTrimmer } from "@/components/ui/VideoTrimmer";
import { BrandLoader } from "@/components/ui/BrandLoader";
const BIG_MB = 30; // un vídeo corto pero pesado (típico de la galería: 1080p/4K) se aligera antes de subirlo
// Elegir un vídeo: si se pasa del máximo, se abre el cortador en vez de rechazarlo; si es pesado, se aligera.
export function useVideoPick({ maxSeconds, maxMB, onFile, onError }: { maxSeconds: number; maxMB: number; onFile: (f: File) => void; onError: (m: string) => void }) {
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);
  const [busy, setBusy] = useState<{ label: string; pct?: number } | null>(null);
  const pick = async (f: File | null) => {
    if (!f) return; onError("");
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|3gp|mkv|avi|hevc)$/i.test(f.name)) return onError("Elige un vídeo.");
    setBusy({ label: "Leyendo tu vídeo…" });
    const d = await videoDuration(f);
    if (d && d > maxSeconds + 1) { setBusy(null); return setPending({ file: f, duration: d }); }
    if (d && f.size > BIG_MB * 1048576 && trimSupported()) {
      try {
        setBusy({ label: "Optimizando tu vídeo para subirlo más rápido…", pct: 0 });
        const small = await trimVideo(f, 0, d, (pct) => setBusy({ label: "Optimizando tu vídeo para subirlo más rápido…", pct }));
        setBusy(null); if (small.size < f.size) return onFile(small);
      } catch { /* si no se puede aligerar, se sube el original */ }
    }
    setBusy(null);
    if (f.size > maxMB * 1048576) return onError(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    onFile(f);
  };
  // En un portal: dentro de una tarjeta con recorte u animación, el cortador quedaba cortado o fuera de pantalla.
  const trimmer = pending
    ? createPortal(<VideoTrimmer file={pending.file} duration={pending.duration} maxSeconds={maxSeconds} onCancel={() => setPending(null)} onDone={(nf) => { setPending(null); onFile(nf); }} />, document.body)
    : busy ? createPortal(<div className="vt" role="status"><div className="vt-box" style={{ borderRadius: 22, margin: "auto 16px" }}><BrandLoader dark label={busy.pct !== undefined ? `${busy.label} ${busy.pct}%` : busy.label} /></div></div>, document.body) : null;
  return { pick, trimmer };
}
