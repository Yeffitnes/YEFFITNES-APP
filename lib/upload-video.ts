// Subida directa del teléfono a Bunny (TUS, reanudable). El servidor firma; la clave de Bunny nunca llega aquí.
export const MAX_VIDEO_SECONDS = 30;          // Pedido por Jeff: máximo 30 s
export const MAX_VIDEO_MB = 200;
export const MAX_COACH_VIDEO_SECONDS = 300, MAX_COACH_VIDEO_MB = 500;   // el coach puede enviar vídeos más largos (explicaciones)
export class UploadError extends Error { constructor(public code: string) { super(code); } }
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = "metadata"; v.muted = true; v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null); v.onerror = () => done(null); v.src = url;
    setTimeout(() => done(null), 8000);
  });
}
// Descarta en el servidor un vídeo creado pero no usado (borra en Bunny y libera el cupo). Sin esperar ni fallar.
export const discardVideo = (videoId: string | null | undefined) => { if (videoId) void fetch("/api/video/discard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId }) }).catch(() => {}); };
export async function uploadVideo(file: File, onProgress: (pct: number) => void, opts: { purpose?: "report" | "message"; clientId?: string } = {}): Promise<string> {
  const r = await fetch("/api/video/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(opts) });
  if (!r.ok) { const j = await r.json().catch(() => ({})) as { error?: string }; throw new UploadError(j.error ?? "failed"); }
  const a = (await r.json()) as { endpoint: string; libraryId: string; videoId: string; expire: number; signature: string };
  const { Upload } = await import("tus-js-client");
  try { await new Promise<void>((resolve, reject) => {
    const up = new Upload(file, {
      endpoint: a.endpoint, retryDelays: [0, 3000, 8000, 20000], chunkSize: 5 * 1024 * 1024,
      headers: { AuthorizationSignature: a.signature, AuthorizationExpire: String(a.expire), VideoId: a.videoId, LibraryId: a.libraryId },
      metadata: { filetype: file.type || "video/mp4", title: `${opts.purpose === "message" ? "mensaje" : "reporte"}-${a.videoId.slice(0, 8)}` },
      onError: () => reject(new UploadError("upload_failed")),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    up.start();
  }); } catch (e) { discardVideo(a.videoId); throw e; }   // subida fallida: no deja el vídeo a medias ocupando espacio ni cupo
  return a.videoId;
}
