"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export const MAX_AUDIO_SECONDS = 120;
const MIMES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
export const audioSupported = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
// Grabadora de audio del micrófono (mp4/aac donde se puede, para que suene en cualquier teléfono). Máximo MAX_AUDIO_SECONDS.
export function useAudioRecorder(onDone: (blob: Blob, seconds: number) => void, onError: (m: string) => void) {
  const [recording, setRecording] = useState(false), [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), chunks = useRef<Blob[]>([]), timer = useRef(0), t0 = useRef(0), cancelled = useRef(false);
  const release = () => { clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setRecording(false); };
  const stop = useCallback((cancel = false) => { cancelled.current = cancel; if (rec.current && rec.current.state !== "inactive") rec.current.stop(); else release(); }, []);
  const start = useCallback(async () => {
    if (!audioSupported()) return onError("Este navegador no puede grabar audio.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = MIMES.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } });
      const r = new MediaRecorder(stream.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 64_000 }); rec.current = r; chunks.current = []; cancelled.current = false;
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        const secsDone = Math.round((Date.now() - t0.current) / 1000), type = r.mimeType || mime || "audio/webm"; release();
        if (cancelled.current || !chunks.current.length) return;
        if (secsDone < 1) return onError("El audio quedó muy corto.");
        onDone(new Blob(chunks.current, { type }), secsDone);
      };
      r.start(1000); t0.current = Date.now(); setSecs(0); setRecording(true);
      timer.current = window.setInterval(() => { const s = Math.floor((Date.now() - t0.current) / 1000); setSecs(s); if (s >= MAX_AUDIO_SECONDS) stop(); }, 250);
    } catch (e) { release(); onError(e instanceof DOMException && e.name === "NotAllowedError" ? "Permite el micrófono en tu navegador para grabar audio." : "No pudimos usar el micrófono."); }
  }, [onDone, onError, stop]);
  useEffect(() => () => { cancelled.current = true; if (rec.current && rec.current.state !== "inactive") rec.current.stop(); release(); }, []);
  return { recording, secs, start, stop };
}
