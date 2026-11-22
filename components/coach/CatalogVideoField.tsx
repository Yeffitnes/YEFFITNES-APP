"use client";
// 21-nov (pedido de Cristian): el vídeo de una rutina o de un ejercicio puede ser un enlace de YouTube O un vídeo subido desde el
// celular (Bunny, como en Material). Uno u otro. El vídeo elegido se sube en segundo plano al guardar; mientras sube, queda el
// vídeo anterior.
import { useRef, useState } from "react";
import { youtubeId } from "@/lib/format";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS } from "@/lib/upload-video";
import { useVideoPick } from "@/components/ui/useVideoPick";
import { BunnyModal } from "@/components/ui/BunnyModal";

export type VideoSrc = { mode: "youtube" | "upload"; link: string; file: File | null; removed: boolean };
export const initVideoSrc = (yt: string | null | undefined, uploaded: boolean): VideoSrc => ({ mode: uploaded ? "upload" : "youtube", link: yt ? `https://youtu.be/${yt}` : "", file: null, removed: false });
// Lo que se guarda: el id de YouTube, el archivo nuevo, o mantener el vídeo subido. error: enlace inválido.
export function readVideoSrc(v: VideoSrc, uploaded: boolean): { error?: string; videoRef: string | null; file: File | null; keepUploaded: boolean } {
  if (v.mode === "youtube") {
    const id = v.link.trim() ? youtubeId(v.link) : null;
    if (v.link.trim() && !id) return { error: "Ese enlace de YouTube no es válido.", videoRef: null, file: null, keepUploaded: false };
    return { videoRef: id, file: null, keepUploaded: false };
  }
  if (v.file) return { videoRef: null, file: v.file, keepUploaded: false };
  return { videoRef: null, file: null, keepUploaded: uploaded && !v.removed };
}
const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 104857600 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export function CatalogVideoField({ label, hint, value, onChange, uploaded, playParam, onError }: {
  label: string; hint?: string; value: VideoSrc; onChange: (v: VideoSrc) => void; uploaded: boolean; playParam: string | null; onError: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null), [watch, setWatch] = useState(false);
  const { pick, trimmer } = useVideoPick({ maxSeconds: MAX_COACH_VIDEO_SECONDS, maxSourceSeconds: MAX_COACH_VIDEO_SECONDS, maxMB: MAX_COACH_VIDEO_MB, onFile: (f) => onChange({ ...value, mode: "upload", file: f }), onError });
  const has = uploaded && !value.removed;
  return (
    <div className="modal-field">
      <label>{label}</label>
      <div className="tp-wtabs vsrc-tabs" role="radiogroup" aria-label={`${label}: de dónde sale`}>
        <button type="button" role="radio" aria-checked={value.mode === "youtube"} className={`tp-wtab${value.mode === "youtube" ? " on" : ""}`} onClick={() => onChange({ ...value, mode: "youtube" })}>Enlace de YouTube</button>
        <button type="button" role="radio" aria-checked={value.mode === "upload"} className={`tp-wtab${value.mode === "upload" ? " on" : ""}`} onClick={() => onChange({ ...value, mode: "upload" })}>Subir desde el celular</button>
      </div>
      {value.mode === "youtube"
        ? <input aria-label={`${label}: enlace de YouTube`} value={value.link} onChange={(e) => onChange({ ...value, link: e.target.value })} placeholder="https://youtu.be/…" style={{ marginTop: 8 }} />
        : <div className="vsrc-up">
            {trimmer}
            <input ref={input} type="file" accept="video/*" hidden aria-label={`${label}: elegir vídeo`} onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <span className="vsrc-state">{value.file ? <><b>Listo para subir</b><small>{value.file.name.slice(0, 40)} · {mb(value.file.size)}</small></>
              : has ? <><b>Vídeo subido</b><small>Lo ven los clientes que tienen esto en su plan.</small></>
              : <><b>Sin vídeo</b><small>Graba o elige uno de la galería (hasta {MAX_COACH_VIDEO_SECONDS / 60} min).</small></>}</span>
            <span className="vsrc-acts">
              {!value.file && has && playParam && <button type="button" className="filter-chip" onClick={() => setWatch(true)}>Ver</button>}
              <button type="button" className="filter-chip active" onClick={() => input.current?.click()}>{value.file || has ? "Cambiar" : "Elegir vídeo"}</button>
              {(value.file || has) && <button type="button" className="filter-chip" onClick={() => onChange(value.file ? { ...value, file: null } : { ...value, removed: true })}>Quitar</button>}
            </span>
          </div>}
      {value.mode === "upload" && value.file && <p className="modal-cap-hint">Se sube al tocar Guardar, en segundo plano: puedes seguir usando la app.</p>}
      {hint && <p className="modal-cap-hint">{hint}</p>}
      {watch && playParam && <BunnyModal param={playParam} title={label} sub="Vídeo subido" onClose={() => setWatch(false)} />}
    </div>
  );
}
