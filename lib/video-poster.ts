"use client";
// Portada difuminada de un vídeo (pedido de Cristian, 29-oct): al elegir el vídeo, la app toma UN cuadro (cerca del segundo 1) y lo
// guarda diminuto (64 px de ancho, ~1-3 KB) dentro de la propia fila (materials.poster / plan_days.video_poster, migración 0041).
// Al verse ampliado y con desenfoque queda como un fondo suave "que deja ver un poquito el vídeo"; nunca se ve nítido,
// así que no expone el contenido. Si el navegador no puede leer el vídeo (algunos .mov en Chrome), no hay portada y se usa la de marca.
export async function posterFromVideo(file: File, width = 64): Promise<string | null> {
  if (typeof document === "undefined" || !file.type.startsWith("video/")) return null;
  const url = URL.createObjectURL(file), v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
  try {
    await new Promise<void>((ok, bad) => { const t = setTimeout(() => bad(new Error("timeout")), 8000); v.onloadeddata = () => { clearTimeout(t); ok(); }; v.onerror = () => { clearTimeout(t); bad(new Error("decode")); }; });
    const at = Number.isFinite(v.duration) && v.duration > 0 ? Math.min(1, v.duration / 3) : 0;
    if (at > 0) await new Promise<void>((ok) => { const t = setTimeout(ok, 3000); v.onseeked = () => { clearTimeout(t); ok(); }; v.currentTime = at; });
    if (!v.videoWidth || !v.videoHeight) return null;
    const c = document.createElement("canvas"); c.width = width; c.height = Math.max(1, Math.round((v.videoHeight / v.videoWidth) * width));
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.6);
    return data.startsWith("data:image/jpeg;base64,") && data.length < 16000 ? data : null;
  } catch { return null; } finally { URL.revokeObjectURL(url); v.removeAttribute("src"); v.load(); }
}
// Miniatura pública de YouTube (la usa el reproductor de YouTube para cualquiera que tenga el enlace).
export const ytThumb = (id: string | null | undefined) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);
