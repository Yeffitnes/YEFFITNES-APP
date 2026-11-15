"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { BrandLoader } from "@/components/ui/BrandLoader";
type Play = { url?: string; processing?: boolean; progress?: number | null; width?: number | null; height?: number | null };
// Enlaces de reproducción ya pedidos (válidos 2 h en el servidor; aquí se reutilizan 20 min). prefetchPlay los pide antes de que
// la persona toque "ver": así el vídeo abre sin esperar al servidor (pedido de Cristian, 29-oct: "el vídeo se demora muchísimo").
const cache = new Map<string, { at: number; p: Promise<Play> }>();
export function getPlay(param: string): Promise<Play> {
  const hit = cache.get(param); if (hit && Date.now() - hit.at < 20 * 60_000) return hit.p;
  const p = fetch(`/api/video/play?${param}`).then((r) => r.json() as Promise<Play>).then((j) => { if (!j.url || j.processing) cache.delete(param); return j; }).catch((e) => { cache.delete(param); throw e; });
  cache.set(param, { at: Date.now(), p }); return p;
}
export const prefetchPlay = (param: string) => { warmBunny(); void getPlay(param).catch(() => {}); };
// Abre la conexión con el reproductor de Bunny antes de que haga falta (una sola vez).
let warmed = false;
export function warmBunny() {
  if (warmed || typeof document === "undefined") return; warmed = true;
  for (const h of ["https://player.mediadelivery.net", "https://iframe.mediadelivery.net"]) { const l = document.createElement("link"); l.rel = "preconnect"; l.href = h; l.crossOrigin = "anonymous"; document.head.appendChild(l); }
}
/** Reproduce un vídeo privado (Bunny). `param` es la pista que autoriza el servidor, p. ej. "message=<id>" o "day=<id>". */
export function BunnyModal({ param, title, sub, onClose }: { param: string; title: string; sub?: string; onClose: () => void }) {
  const [play, setPlay] = useState<Play | null>(null), [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    getPlay(param).then((j) => { if (off) return; if (j.url) setPlay(j); else setErr(true); }).catch(() => { if (!off) setErr(true); });
    return () => { off = true; };
  }, [param]);
  return (
    <Modal title={title} sub={sub} onClose={onClose} wide>
      {!play && !err && <div style={{ borderRadius: 12, overflow: "hidden" }}><BrandLoader dark label="Preparando tu vídeo" height={240} /></div>}
      {err && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el vídeo. Revisa tu conexión e inténtalo de nuevo en un momento.</p>}
      {play?.processing && <p role="status" className="vid-processing">Este vídeo se acaba de subir y Bunny lo está procesando{play.progress != null ? ` (${play.progress} %)` : ""}. Suele tardar unos minutos; vuelve a abrirlo en un rato.</p>}
      {play?.url && !play.processing && <VideoFrame url={play.url} title={title} width={play.width} height={play.height} />}
    </Modal>
  );
}

// Reproductor con la FORMA REAL del vídeo (30-oct, reporte de Cristian: "subí un vídeo horizontal y en la app todo es vertical").
// Horizontal: ocupa el ancho. Vertical: ocupa el alto disponible y queda centrado. Si no se sabe la forma, se usa 16:9.
export function VideoFrame({ url, title, width, height }: { url: string; title: string; width?: number | null; height?: number | null }) {
  const [loaded, setLoaded] = useState(false), ar = width && height ? width / height : 16 / 9;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: `min(100%, calc(70dvh * ${ar.toFixed(4)}))`, aspectRatio: `${ar}`, borderRadius: 12, overflow: "hidden", background: "#000" }}>
        {!loaded && <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}><BrandLoader dark label="Cargando vídeo" height={0} /></div>}
        <iframe onLoad={() => setLoaded(true)} src={url} title={title} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
      </div>
    </div>
  );
}
