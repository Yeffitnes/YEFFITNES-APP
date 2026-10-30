import { createHash } from "node:crypto";
// Bunny Stream: TODAS las claves viven solo en el servidor (variables de Netlify sin NEXT_PUBLIC_).
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const bunnyConfigured = () => !!(process.env.BUNNY_API_KEY && process.env.BUNNY_LIBRARY_ID);
const lib = () => process.env.BUNNY_LIBRARY_ID!, key = () => process.env.BUNNY_API_KEY!;
export async function createVideo(title: string): Promise<string> {
  const r = await fetch(`https://video.bunnycdn.com/library/${lib()}/videos`, { method: "POST", headers: { AccessKey: key(), "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ title }) });
  if (!r.ok) throw new Error(`bunny_create_${r.status}`);
  const j = (await r.json()) as { guid?: string }; if (!j.guid) throw new Error("bunny_no_guid"); return j.guid;
}
export async function deleteVideo(videoId: string): Promise<void> {
  const r = await fetch(`https://video.bunnycdn.com/library/${lib()}/videos/${videoId}`, { method: "DELETE", headers: { AccessKey: key() } });
  if (!r.ok && r.status !== 404) throw new Error(`bunny_delete_${r.status}`);   // 404 = ya no existe: cuenta como borrado
}
// Firma para subir directo desde el teléfono (TUS): SHA256(library_id + api_key + expiración + video_id)
export function uploadAuth(videoId: string, ttlSeconds = 3600) {
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { endpoint: "https://video.bunnycdn.com/tusupload", libraryId: lib(), videoId, expire, signature: sha(lib() + key() + expire + videoId) };
}
// Reproductor protegido: si la biblioteca tiene "token authentication", se firma con BUNNY_TOKEN_KEY; si no, enlace normal.
// autoplay + preload: empieza solo al abrir (menos espera y un toque menos). En iPhone, el autoplay con sonido puede esperar un toque.
export function embedUrl(videoId: string, ttlSeconds = 7200) {
  const base = `https://player.mediadelivery.net/embed/${lib()}/${videoId}`, opts = "autoplay=true&preload=true&responsive=true";
  const tk = process.env.BUNNY_TOKEN_KEY; if (!tk) return `${base}?${opts}`;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${base}?token=${sha(tk + videoId + expires)}&expires=${expires}&${opts}`;
}
// Estado del vídeo en Bunny: 0-2 = recién creado, subido o procesando (aún no se puede ver); 3 = codificando (se ve, quizá en baja
// calidad); 4 = listo. Máx. 1,2 s: si Bunny no responde, no estorba.
export async function videoStatus(videoId: string): Promise<{ processing: boolean; progress: number | null; width: number | null; height: number | null } | null> {
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 1200);
    const r = await fetch(`https://video.bunnycdn.com/library/${lib()}/videos/${videoId}`, { headers: { AccessKey: key(), accept: "application/json" }, signal: ctl.signal, cache: "no-store" }).finally(() => clearTimeout(t));
    if (!r.ok) return null;
    const j = (await r.json()) as { status?: number; encodeProgress?: number; width?: number; height?: number };
    // width/height (30-oct): para mostrar cada vídeo con su forma real (horizontal o vertical) y no siempre en un cuadro horizontal.
    return { processing: j.status != null && j.status <= 2, progress: typeof j.encodeProgress === "number" ? j.encodeProgress : null, width: j.width || null, height: j.height || null };
  } catch { return null; }
}
