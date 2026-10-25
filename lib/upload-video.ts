// Subida directa del teléfono a Bunny (TUS, reanudable). El servidor firma; la clave de Bunny nunca llega aquí.
export const MAX_VIDEO_SECONDS = 90;          // PROPUESTA: confirmar con Jeff
export const MAX_VIDEO_MB = 200;
export class UploadError extends Error { constructor(public code: string) { super(code); } }
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = "metadata"; v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null); v.onerror = () => done(null); v.src = url;
    setTimeout(() => done(null), 4000);
  });
}
export async function uploadVideo(file: File, onProgress: (pct: number) => void): Promise<string> {
  const r = await fetch("/api/video/upload-url", { method: "POST" });
  if (!r.ok) { const j = await r.json().catch(() => ({})) as { error?: string }; throw new UploadError(j.error ?? "failed"); }
  const a = (await r.json()) as { endpoint: string; libraryId: string; videoId: string; expire: number; signature: string };
  const { Upload } = await import("tus-js-client");
  await new Promise<void>((resolve, reject) => {
    const up = new Upload(file, {
      endpoint: a.endpoint, retryDelays: [0, 3000, 8000, 20000], chunkSize: 5 * 1024 * 1024,
      headers: { AuthorizationSignature: a.signature, AuthorizationExpire: String(a.expire), VideoId: a.videoId, LibraryId: a.libraryId },
      metadata: { filetype: file.type || "video/mp4", title: `reporte-${a.videoId.slice(0, 8)}` },
      onError: () => reject(new UploadError("upload_failed")),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    up.start();
  });
  return a.videoId;
}
