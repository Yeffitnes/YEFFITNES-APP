"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { videoDuration } from "@/lib/upload-video";
import { VideoTrimmer } from "@/components/ui/VideoTrimmer";
// Elegir un vídeo: si se pasa del máximo, se abre el cortador en vez de rechazarlo.
export function useVideoPick({ maxSeconds, maxMB, onFile, onError }: { maxSeconds: number; maxMB: number; onFile: (f: File) => void; onError: (m: string) => void }) {
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);
  const pick = async (f: File | null) => {
    if (!f) return; onError("");
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|3gp|mkv|avi|hevc)$/i.test(f.name)) return onError("Elige un vídeo.");
    const d = await videoDuration(f);
    if (d && d > maxSeconds + 1) return setPending({ file: f, duration: d });
    if (f.size > maxMB * 1048576) return onError(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    onFile(f);
  };
  // En un portal: dentro de una tarjeta con recorte u animación, el cortador quedaba cortado o fuera de pantalla.
  const trimmer = pending ? createPortal(<VideoTrimmer file={pending.file} duration={pending.duration} maxSeconds={maxSeconds} onCancel={() => setPending(null)} onDone={(nf) => { setPending(null); onFile(nf); }} />, document.body) : null;
  return { pick, trimmer };
}
