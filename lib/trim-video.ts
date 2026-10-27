// Recorta (y ajusta de tamaño) un vídeo en el propio teléfono, sin librerías pesadas: se reproduce el tramo elegido
// sobre un lienzo y se graba con MediaRecorder. Tarda lo que dura el tramo (≤ 20 s) y deja un archivo liviano (≤ 720p).
export class TrimError extends Error { constructor(public code: "unsupported" | "failed" | "cancelled", public reason = "") { super(code); } }
const MIMES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
export const trimSupported = () => typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
const pickMime = () => MIMES.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? "";
export async function trimVideo(file: File, start: number, end: number, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<File> {
  if (!trimSupported()) throw new TrimError("unsupported");
  const url = URL.createObjectURL(file), v = document.createElement("video");
  v.src = url; v.playsInline = true; v.preload = "auto"; v.setAttribute("playsinline", "");
  let ac: AudioContext | null = null, rec: MediaRecorder | null = null, stopped = false, raf = 0, timer = 0;
  const cleanup = () => { stopped = true; cancelAnimationFrame(raf); clearInterval(timer); try { v.pause(); } catch { /* */ } try { void ac?.close(); } catch { /* */ } URL.revokeObjectURL(url); };
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new TrimError("failed", "no se pudo leer el vídeo")); setTimeout(() => rej(new TrimError("failed", "tardó demasiado en abrir")), 15000); });
    const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight), 720 / Math.min(v.videoWidth, v.videoHeight));
    const w = Math.max(2, Math.round((v.videoWidth * k) / 2) * 2), h = Math.max(2, Math.round((v.videoHeight * k) / 2) * 2);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new TrimError("failed");
    const stream = canvas.captureStream(30);
    try { // el sonido pasa por un nodo de audio (no suena en el teléfono mientras se graba)
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC(); await ac.resume().catch(() => {});
      const dest = ac.createMediaStreamDestination(); ac.createMediaElementSource(v).connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch { /* sin sonido si el navegador no deja */ }
    const mime = pickMime(), chunks: BlobPart[] = [];
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 128_000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    v.currentTime = start;
    await new Promise<void>((res) => { v.onseeked = () => res(); setTimeout(res, 3000); });
    const done = new Promise<Blob>((res, rej) => { rec!.onstop = () => res(new Blob(chunks, { type: rec!.mimeType || mime || "video/webm" })); rec!.onerror = () => rej(new TrimError("failed")); });
    const finish = () => { if (rec && rec.state !== "inactive") rec.stop(); };
    signal?.addEventListener("abort", finish);
    let lastT = -1, lastMove = Date.now(), stalled = false;
    const tick = () => {
      if (stopped) return;
      ctx.drawImage(v, 0, 0, w, h);
      const p = Math.min(1, Math.max(0, (v.currentTime - start) / (end - start))); onProgress(Math.round(p * 100));
      if (signal?.aborted) { cleanup(); return; }
      if (v.currentTime >= end - 0.02 || v.ended) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    // Si la pestaña se oculta, requestAnimationFrame se detiene: un temporizador de respaldo sigue pintando.
    timer = window.setInterval(() => {
      if (v.currentTime !== lastT) { lastT = v.currentTime; lastMove = Date.now(); } else if (Date.now() - lastMove > 8000 && !stopped) { stalled = true; finish(); }   // el vídeo no avanza: se corta en vez de esperar
      if (document.hidden && !stopped) { ctx.drawImage(v, 0, 0, w, h); if (v.currentTime >= end - 0.02 || v.ended) finish(); } }, 100);
    rec.start(500);
    try { await v.play(); } catch { v.muted = true; await v.play(); }   // Safari puede negar el sonido sin un toque reciente: se graba igual, sin audio
    raf = requestAnimationFrame(tick);
    const blob = await done;
    if (signal?.aborted) throw new TrimError("cancelled");
    if (stalled) throw new TrimError("failed", "el vídeo no avanzaba");
    if (!blob.size) throw new TrimError("failed");
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    onProgress(100);
    return new File([blob], `video-${Date.now()}.${ext}`, { type: blob.type || `video/${ext}` });
  } catch (e) { if (e instanceof TrimError) throw e; console.error("trimVideo", e); throw new TrimError("failed", e instanceof Error ? `${e.name}` : "error"); }
  finally { cleanup(); }
}
