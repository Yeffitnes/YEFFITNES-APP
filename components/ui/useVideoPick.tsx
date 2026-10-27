"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { videoDuration } from "@/lib/upload-video";
import { VideoTrimmer } from "@/components/ui/VideoTrimmer";
import { BrandLoader } from "@/components/ui/BrandLoader";
// Elegir un vídeo: si se pasa del máximo, se abre el cortador en vez de rechazarlo. Si cabe, se sube tal cual (sin recomprimir).
export function useVideoPick({ maxSeconds, maxSourceSeconds, maxMB, onFile, onError }: { maxSeconds: number; maxSourceSeconds?: number; maxMB: number; onFile: (f: File) => void; onError: (m: string) => void }) {
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);
  const [busy, setBusy] = useState<{ label: string; pct?: number; skip?: boolean } | null>(null);
  const token = useRef(0);
  const pick = async (f: File | null) => {
    if (!f) return; onError("");
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|3gp|mkv|avi|hevc)$/i.test(f.name)) return onError("Elige un vídeo.");
    setBusy({ label: "Leyendo tu vídeo…" });
    const my = ++token.current, d = await videoDuration(f);
    if (my !== token.current) return;   // se canceló mientras leía
    if (d && maxSourceSeconds && d > maxSourceSeconds + 1) { setBusy(null); return onError(`Ese vídeo dura ${Math.round(d)} s. Elige uno de máximo ${maxSourceSeconds} s (lo ideal es ${maxSeconds} s o menos).`); }
    if (d && d > maxSeconds + 1) { setBusy(null); return setPending({ file: f, duration: d }); }
    setBusy(null);
    if (f.size > maxMB * 1048576) return onError(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    onFile(f);
  };
  // En un portal: dentro de una tarjeta con recorte u animación, el cortador quedaba cortado o fuera de pantalla.
  const trimmer = pending
    ? createPortal(<VideoTrimmer file={pending.file} duration={pending.duration} maxSeconds={maxSeconds} onCancel={() => setPending(null)} onDone={(nf) => { setPending(null); onFile(nf); }} />, document.body)
    : busy ? createPortal(<div className="vt" role="status"><div className="vt-box" style={{ borderRadius: 22, margin: "auto 16px" }}><BrandLoader dark label={busy.pct !== undefined ? `${busy.label} ${busy.pct}%` : busy.label} /><button type="button" className="ghost-btn" style={{ margin: "0 auto 18px", display: "block" }} onClick={() => { token.current++; setBusy(null); }}>Cancelar</button></div></div>, document.body) : null;
  return { pick, trimmer };
}
