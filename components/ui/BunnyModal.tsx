"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
/** Reproduce un vídeo privado (Bunny). `param` es la pista que autoriza el servidor, p. ej. "message=<id>" o "day=<id>". */
export function BunnyModal({ param, title, sub, onClose }: { param: string; title: string; sub?: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null), [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(`/api/video/play?${param}`).then((r) => r.json()).then((j: { url?: string }) => { if (off) return; if (j.url) setUrl(j.url); else setErr(true); }).catch(() => { if (!off) setErr(true); });
    return () => { off = true; };
  }, [param]);
  return (
    <Modal title={title} sub={sub} onClose={onClose} wide>
      {!url && !err && <div className="sk" style={{ height: 240 }} />}
      {err && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el vídeo (puede que aún se esté procesando; prueba en un minuto).</p>}
      {url && <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}><iframe src={url} title={title} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div>}
    </Modal>
  );
}
