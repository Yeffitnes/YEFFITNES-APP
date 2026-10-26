"use client";
import { useState } from "react";
import { videoDuration } from "@/lib/upload-video";
import { VideoTrimmer } from "@/components/ui/VideoTrimmer";
// Elegir un vídeo: si se pasa del máximo, se abre el cortador en vez de rechazarlo.
export function useVideoPick({ maxSeconds, maxMB, onFile, onError }: { maxSeconds: number; maxMB: number; onFile: (f: File) => void; onError: (m: string) => void }) {
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);
  const pick = async (f: File | null) => {
    if (!f) return; onError("");
    if (!f.type.startsWith("video/")) return onError("Elige un vídeo.");
    const d = await videoDuration(f);
    if (d && d > maxSeconds + 1) return setPending({ file: f, duration: d });
    if (f.size > maxMB * 1048576) return onError(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    onFile(f);
  };
  const trimmer = pending ? <VideoTrimmer file={pending.file} duration={pending.duration} maxSeconds={maxSeconds} onCancel={() => setPending(null)} onDone={(nf) => { setPending(null); onFile(nf); }} /> : null;
  return { pick, trimmer };
}
