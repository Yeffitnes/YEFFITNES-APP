"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "@/app/messages.css";
import { Modal } from "@/components/ui/Modal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { useMarkRead, useSendMessage, useSignedImage, useThread, sendErrorText, type Msg } from "@/lib/messages";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, MAX_VIDEO_MB, MAX_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { youtubeId } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type Media = { kind: "image"; url: string } | { kind: "yt"; id: string } | { kind: "bunny"; msg: string };
const dayLabel = (iso: string) => { const d = new Date(iso), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1); const same = (a: Date, b: Date) => a.toDateString() === b.toDateString(); return same(d, t) ? "Hoy" : same(d, y) ? "Ayer" : d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }); };
const hour = (iso: string) => new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

function Bubble({ m, mine, other, open }: { m: Msg; mine: boolean; other: string; open: (x: Media) => void }) {
  const img = useSignedImage(m.imagePath);
  return (
    <div className={`msg ${mine ? "mine" : "theirs"}${m.pending ? " pending" : ""}${m.imagePath || m.youtubeId || m.hasVideo ? " has-media" : ""}`}>
      {m.imagePath && <button type="button" className="msg-media" aria-label="Ver foto" onClick={() => img.data && open({ kind: "image", url: img.data })} style={{ minHeight: img.data ? undefined : 120 }}>{img.data && <img src={img.data} alt="Foto enviada" loading="lazy" decoding="async" />}</button>}
      {m.youtubeId && <button type="button" className="msg-media" aria-label="Ver vídeo" onClick={() => open({ kind: "yt", id: m.youtubeId! })}><img src={`https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" /><span className="msg-play"><span><Icon name="play" size={18} /></span></span></button>}
      {m.hasVideo && <button type="button" className="msg-media" aria-label="Ver vídeo" onClick={() => open({ kind: "bunny", msg: m.id })}><span className="msg-video-btn"><Icon name="play" size={16} />Ver vídeo</span></button>}
      {m.body}
      <div className="msg-meta">{mine ? "Tú" : other} · {hour(m.createdAt)}{mine && !m.pending && m.readAt ? " · Visto" : ""}</div>
    </div>
  );
}

function MediaModal({ media, onClose }: { media: Media; onClose: () => void }) {
  if (media.kind === "bunny") return <BunnyModal param={`message=${media.msg}`} title="Vídeo" onClose={onClose} />;
  return (
    <Modal title={media.kind === "image" ? "Foto" : "Vídeo"} onClose={onClose} wide>
      {media.kind === "image" && <img src={media.url} alt="Foto enviada" style={{ width: "100%", borderRadius: 12 }} />}
      {media.kind === "yt" && <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}><iframe src={`https://www.youtube-nocookie.com/embed/${media.id}?rel=0&modestbranding=1&autoplay=1`} title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div>}
    </Modal>
  );
}

/** Hilo de mensajes. Cliente: sin `clientId` (RLS ya limita al suyo). Coach: con `clientId`. */
export function ThreadView({ clientId, ownClientId, otherName, coach = false, textOnly = false, initialText = "" }: { clientId?: string; ownClientId?: string; otherName: string; coach?: boolean; textOnly?: boolean; initialText?: string }) {
  const { data, isPending, isError, refetch } = useThread(clientId), send = useSendMessage(clientId, ownClientId), markRead = useMarkRead(clientId);
  const [text, setText] = useState(initialText), [image, setImage] = useState<File | null>(null), [video, setVideo] = useState<File | null>(null), [yt, setYt] = useState(""), [showYt, setShowYt] = useState(false);
  const [pct, setPct] = useState<number | null>(null), [err, setErr] = useState(""), [media, setMedia] = useState<Media | null>(null);
  const list = useRef<HTMLDivElement>(null), imgIn = useRef<HTMLInputElement>(null), vidIn = useRef<HTMLInputElement>(null), area = useRef<HTMLTextAreaElement>(null);
  const msgs = useMemo(() => data ?? [], [data]);
  const unreadFromOther = msgs.filter((m) => m.sender !== (coach ? "coach" : "client") && !m.readAt).length;
  useLayoutEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length]);
  useEffect(() => { if (unreadFromOther > 0 && document.visibilityState === "visible") void markRead(); }, [unreadFromOther]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxS = coach ? MAX_COACH_VIDEO_SECONDS : MAX_VIDEO_SECONDS, maxMB = coach ? MAX_COACH_VIDEO_MB : MAX_VIDEO_MB;
  const pickVideo = async (f: File | null) => {
    setErr(""); if (!f) return;
    if (!f.type.startsWith("video/")) return setErr("Elige un vídeo.");
    if (f.size > maxMB * 1048576) return setErr(`El vídeo pesa demasiado (máx. ${maxMB} MB).`);
    const d = await videoDuration(f); if (d && d > maxS + 2) return setErr(`El vídeo dura ${Math.round(d)} s; el máximo es ${maxS} s.`);
    setVideo(f); setImage(null); setYt(""); setShowYt(false);
  };
  const pickImage = (f: File | null) => { setErr(""); if (!f) return; if (!f.type.startsWith("image/")) return setErr("Elige una foto."); setImage(f); setVideo(null); setYt(""); setShowYt(false); };
  const ytId = yt.trim() ? youtubeId(yt) : null;
  const canSend = !send.isPending && (text.trim() || image || video || ytId);
  const submit = async () => {
    if (!canSend) return; setErr("");
    if (yt.trim() && !ytId) return setErr("Ese enlace de YouTube no es válido.");
    const body = text, a = { image, video, yt: ytId };
    try {
      setPct(video ? 0 : null);
      await send.mutateAsync({ body, image: a.image, video: a.video, youtube: a.yt, onProgress: setPct });
      setText(""); setImage(null); setVideo(null); setYt(""); setShowYt(false); if (area.current) area.current.style.height = "auto";
    } catch (e) { setErr(sendErrorText(e)); } finally { setPct(null); }
  };
  const grow = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; };
  let last = "";
  return (
    <div className="thread">
      <div className="thread-list" ref={list} aria-live="polite">
        {isPending && <><div className="sk" style={{ height: 56, width: "60%" }} /><div className="sk" style={{ height: 56, width: "50%", alignSelf: "flex-end" }} /><div className="sk" style={{ height: 56, width: "55%" }} /></>}
        {isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los mensajes. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
        {data && !msgs.length && <div className="thread-empty">{coach ? `Aún no hay mensajes con ${otherName}. Escríbele el primero.` : "Aquí puedes escribirle a tu coach en cualquier momento: dudas, cómo te sientes, una foto o un vídeo corto. Te responde cuando puede; no es un chat en vivo."}</div>}
        {msgs.map((m) => { const dl = dayLabel(m.createdAt), head = dl !== last; last = dl; return (
          <div key={m.id} style={{ display: "contents" }}>{head && <div className="thread-day">{dl}</div>}<Bubble m={m} mine={m.sender === (coach ? "coach" : "client")} other={otherName} open={setMedia} /></div>
        ); })}
      </div>
      <div className="composer">
        {(image || video || ytId) && <div className="comp-chip"><Icon name={image ? "camera" : video ? "video" : "play"} size={14} />{image ? image.name.slice(0, 24) : video ? video.name.slice(0, 24) : "Vídeo de YouTube"}<button type="button" aria-label="Quitar adjunto" onClick={() => { setImage(null); setVideo(null); setYt(""); setShowYt(false); }}><Icon name="close" size={14} /></button></div>}
        {showYt && !ytId && <input aria-label="Enlace de YouTube" placeholder="Pega el enlace de YouTube" value={yt} onChange={(e) => setYt(e.target.value)} style={{ width: "100%", marginBottom: 8, height: 40, border: "1px solid var(--line)", borderRadius: 12, padding: "0 12px", fontSize: 16 }} />}
        {pct !== null && <div className="comp-progress" aria-label={`Subiendo vídeo ${pct}%`}><i style={{ width: `${pct}%` }} /></div>}
        {err && <p role="alert" className="comp-err">{err}</p>}
        <div className="composer-row">
          {!textOnly && <>
            <input ref={imgIn} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <input ref={vidIn} type="file" accept="video/*" hidden onChange={(e) => { void pickVideo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <button type="button" className="comp-btn" aria-label="Adjuntar foto" disabled={send.isPending} onClick={() => imgIn.current?.click()}><Icon name="camera" size={19} /></button>
            <button type="button" className="comp-btn" aria-label="Adjuntar vídeo" disabled={send.isPending} onClick={() => vidIn.current?.click()}><Icon name="video" size={19} /></button>
            {coach && <button type="button" className="comp-btn" aria-label="Enlace de YouTube" disabled={send.isPending} onClick={() => { setShowYt((v) => !v); setImage(null); setVideo(null); }}><Icon name="play" size={16} /></button>}
          </>}
          <textarea ref={area} rows={1} maxLength={2000} aria-label="Escribe tu mensaje" placeholder="Mensaje…" value={text}
            onChange={(e) => { setText(e.target.value); grow(e.target); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); void submit(); } }} />
          <button type="button" className="comp-btn comp-send" disabled={!canSend} onClick={() => void submit()}>{send.isPending ? "…" : "Enviar"}</button>
        </div>
      </div>
      {media && <MediaModal media={media} onClose={() => setMedia(null)} />}
    </div>
  );
}
