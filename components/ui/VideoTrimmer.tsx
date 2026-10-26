"use client";
import { useEffect, useRef, useState } from "react";
import { trimVideo, trimSupported, TrimError } from "@/lib/trim-video";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { Icon } from "@/components/ui/Icon";
// Cortador de vídeo: se elige el tramo (máx. maxSeconds) y se envía ahí mismo, sin salir de la app.
const MIN = 1;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export function VideoTrimmer({ file, duration, maxSeconds, onDone, onCancel }: { file: File; duration: number; maxSeconds: number; onDone: (f: File) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  const vid = useRef<HTMLVideoElement>(null), track = useRef<HTMLDivElement>(null), abort = useRef<AbortController | null>(null);
  const [range, setRange] = useState<[number, number]>([0, Math.min(maxSeconds, duration)]);
  const [playing, setPlaying] = useState(false), [busy, setBusy] = useState(false), [pct, setPct] = useState(0), [err, setErr] = useState(""), [now, setNow] = useState(0);
  const [s, e] = range;
  useEffect(() => () => abort.current?.abort(), []);
  // El vídeo de vista previa se queda dentro del tramo elegido.
  useEffect(() => {
    const v = vid.current; if (!v) return;
    const on = () => { setNow(v.currentTime); if (v.currentTime >= e || v.currentTime < s - 0.3) { v.currentTime = s; if (!playing) v.pause(); } };
    v.addEventListener("timeupdate", on); return () => v.removeEventListener("timeupdate", on);
  }, [s, e, playing]);
  const seek = (t: number) => { const v = vid.current; if (v) { v.currentTime = t; setNow(t); } };
  const toggle = () => { const v = vid.current; if (!v) return; if (v.paused) { if (v.currentTime < s || v.currentTime >= e) v.currentTime = s; void v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } };
  const drag = (kind: "l" | "r" | "m") => (ev: React.PointerEvent) => {
    ev.preventDefault(); const el = track.current; if (!el) return; (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    const w = el.getBoundingClientRect().width, x0 = ev.clientX, [s0, e0] = range;
    const move = (m: PointerEvent) => {
      const dt = ((m.clientX - x0) / w) * duration;
      if (kind === "m") { const len = e0 - s0, ns = Math.min(Math.max(0, s0 + dt), duration - len); setRange([ns, ns + len]); seek(ns); }
      else if (kind === "l") { const ns = Math.min(Math.max(0, s0 + dt), e0 - MIN); setRange([ns, Math.min(e0, ns + maxSeconds)]); seek(ns); }
      else { const ne = Math.max(Math.min(duration, e0 + dt), s0 + MIN); const ns = Math.max(s0, ne - maxSeconds); setRange([ns, ne]); seek(ne - 0.05); }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };
  const confirm = async () => {
    if (busy) return; setErr(""); vid.current?.pause(); setPlaying(false); setBusy(true); setPct(0);
    abort.current = new AbortController();
    try { onDone(await trimVideo(file, s, e, setPct, abort.current.signal)); }
    catch (x) { if (x instanceof TrimError && x.code === "cancelled") return; setErr(x instanceof TrimError && x.code === "unsupported" ? "Este navegador no puede recortar el vídeo. Recórtalo en tu galería y vuelve a elegirlo." : `No pudimos recortar el vídeo${x instanceof TrimError && x.reason ? ` (${x.reason})` : ""}. Inténtalo de nuevo o elige otro.`); setBusy(false); }
  };
  const L = (s / duration) * 100, R = (e / duration) * 100, P = Math.min(100, Math.max(0, (now / duration) * 100)), len = e - s;
  return (
    <div className="vt" role="dialog" aria-modal="true" aria-label="Recortar vídeo">
      <div className="vt-box">
        <div className="vt-head"><b>Recorta tu vídeo</b><button type="button" className="vt-x" aria-label="Cancelar" onClick={() => { abort.current?.abort(); onCancel(); }}><Icon name="close" size={18} /></button></div>
        <p className="vt-sub">Tu vídeo dura {fmt(duration)}. Elige el tramo que quieres enviar (máximo {maxSeconds} s).</p>
        <div className="vt-stage">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={vid} src={url ? `${url}#t=0.1` : undefined} playsInline preload="auto" onLoadedMetadata={() => seek(0)} onClick={toggle} />
          {!playing && !busy && <button type="button" className="vt-play" aria-label="Reproducir" onClick={toggle}><Icon name="play" size={22} /></button>}
          {busy && <div className="vt-busy"><BrandLoader dark label={`Preparando tu vídeo… ${pct}%`} /></div>}
        </div>
        <div className="vt-track" ref={track}>
          <div className="vt-dim" style={{ left: 0, width: `${L}%` }} /><div className="vt-dim" style={{ left: `${R}%`, right: 0 }} />
          <div className="vt-sel" style={{ left: `${L}%`, width: `${R - L}%` }} onPointerDown={drag("m")} />
          <div className="vt-h l" style={{ left: `${L}%` }} onPointerDown={drag("l")} aria-label="Inicio" role="slider" aria-valuenow={Math.round(s)} />
          <div className="vt-h r" style={{ left: `${R}%` }} onPointerDown={drag("r")} aria-label="Fin" role="slider" aria-valuenow={Math.round(e)} />
          <div className="vt-pos" style={{ left: `${P}%` }} />
        </div>
        <div className="vt-meta"><span>{fmt(s)}</span><b>{Math.round(len)} s de {maxSeconds} s</b><span>{fmt(e)}</span></div>
        {err && <p role="alert" className="vt-err">{err}</p>}
        <button type="button" className="vt-go" disabled={busy || !trimSupported()} onClick={confirm}>{busy ? "Preparando…" : "Usar este tramo"}</button>
      </div>
    </div>
  );
}
