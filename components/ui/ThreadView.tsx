"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "@/app/messages.css";
import { Modal } from "@/components/ui/Modal";
import { BunnyModal } from "@/components/ui/BunnyModal";
import { useMarkRead, useSendMessage, useSignedImage, useThread, sendErrorText, type Msg } from "@/lib/messages";
import { MAX_COACH_VIDEO_MB, MAX_COACH_VIDEO_SECONDS, MAX_VIDEO_MB, MAX_VIDEO_SECONDS, videoDuration } from "@/lib/upload-video";
import { youtubeId } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type Media = { kind: "image"; url: string } | { kind: "yt"; id: string } | { kind: "bunny"; msg: string };
const MAX_CLIENT_CHARS = 600, MAX_COACH_CHARS = 2000, MAX_UNREAD = 3;
const when = (iso: string) => { const d = new Date(iso), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1); const h = d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }); return d.toDateString() === t.toDateString() ? `Hoy · ${h}` : d.toDateString() === y.toDateString() ? `Ayer · ${h}` : `${d.toLocaleDateString("es", { day: "numeric", month: "short" })} · ${h}`; };
// Los mensajes no se acumulan: se borran solos 24 h después de que la otra persona los lee.
const goesIn = (readAt: string) => { const h = Math.ceil((new Date(readAt).getTime() + 86400000 - Date.now()) / 3600000); return h <= 1 ? "se borra en menos de 1 h" : h < 24 ? `se borra en ${h} h` : "se borra mañana"; };

function MsgCard({ m, mine, other, open }: { m: Msg; mine: boolean; other: string; open: (x: Media) => void }) {
  const img = useSignedImage(m.imagePath), fresh = !mine && !m.readAt;
  const status = m.pending ? "Enviando…" : mine ? (m.readAt ? `Visto · ${goesIn(m.readAt)}` : "Enviado · aún sin ver") : m.readAt ? `Leído · ${goesIn(m.readAt)}` : "Nuevo";
  return (
    <article className={`mb-card ${mine ? "mine" : "theirs"}${fresh ? " fresh" : ""}${m.pending ? " pending" : ""}`}>
      <header className="mb-head"><span className="mb-who">{mine ? "Tú" : other}</span><span className="mb-when">{when(m.createdAt)}</span><span className={`mb-status${fresh ? " new" : ""}`}>{status}</span></header>
      {m.imagePath && <button type="button" className="mb-media" aria-label="Ver foto" onClick={() => img.data && open({ kind: "image", url: img.data })}>{img.data ? <img src={img.data} alt="Foto enviada" loading="lazy" decoding="async" /> : <span className="mb-media-wait"><Icon name="image" size={20} /></span>}</button>}
      {m.youtubeId && <button type="button" className="mb-media" aria-label="Ver vídeo" onClick={() => open({ kind: "yt", id: m.youtubeId! })}><img src={`https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" /><span className="mb-play"><Icon name="play" size={18} /></span></button>}
      {m.hasVideo && <button type="button" className="mb-media video" aria-label="Ver vídeo" onClick={() => open({ kind: "bunny", msg: m.id })}><span className="mb-play"><Icon name="play" size={18} /></span><span className="mb-video-label">Ver vídeo</span></button>}
      {m.body && <p className="mb-body">{m.body}</p>}
    </article>
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

/** Mensajes entre un cliente y su coach. NO es un chat: un cuadro para escribir arriba y tarjetas debajo (lo más nuevo primero).
 *  Cliente: sin `clientId` (RLS ya limita al suyo). Coach: con `clientId`. */
export function ThreadView({ clientId, ownClientId, otherName, coach = false, textOnly = false, initialText = "" }: { clientId?: string; ownClientId?: string; otherName: string; coach?: boolean; textOnly?: boolean; initialText?: string }) {
  const { data, isPending, isError, refetch } = useThread(clientId), send = useSendMessage(clientId, ownClientId), markRead = useMarkRead(clientId);
  const [text, setText] = useState(initialText), [image, setImage] = useState<File | null>(null), [video, setVideo] = useState<File | null>(null), [yt, setYt] = useState(""), [showYt, setShowYt] = useState(false);
  const [pct, setPct] = useState<number | null>(null), [err, setErr] = useState(""), [media, setMedia] = useState<Media | null>(null), [justSent, setJustSent] = useState(false);
  const imgIn = useRef<HTMLInputElement>(null), vidIn = useRef<HTMLInputElement>(null);
  const msgs = useMemo(() => [...(data ?? [])].reverse(), [data]);       // lo más nuevo primero
  const me = coach ? "coach" : "client", maxChars = coach ? MAX_COACH_CHARS : MAX_CLIENT_CHARS;
  const unreadFromOther = msgs.filter((m) => m.sender !== me && !m.readAt).length;
  const mineUnread = msgs.filter((m) => m.sender === me && !m.readAt && !m.pending).length, blocked = !coach && mineUnread >= MAX_UNREAD;
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (unreadFromOther > 0 && document.visibilityState === "visible") void markRead(); }, [unreadFromOther]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!justSent) return; const t = setTimeout(() => setJustSent(false), 6000); return () => clearTimeout(t); }, [justSent]);
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
  const canSend = !send.isPending && !blocked && (text.trim() || image || video || ytId);
  const submit = async () => {
    if (!canSend) return; setErr("");
    if (yt.trim() && !ytId) return setErr("Ese enlace de YouTube no es válido.");
    try {
      setPct(video ? 0 : null);
      await send.mutateAsync({ body: text, image, video, youtube: ytId, onProgress: setPct });
      setText(""); setImage(null); setVideo(null); setYt(""); setShowYt(false); setJustSent(true);
    } catch (e) { setErr(sendErrorText(e)); } finally { setPct(null); }
  };
  const label = send.isPending ? (video ? `Subiendo ${pct ?? 0}%` : image ? "Subiendo foto…" : "Enviando…") : coach ? "Enviar" : "Enviar a tu coach";
  return (
    <div className="mb">
      <section className="mb-compose" aria-label={coach ? `Escribir a ${otherName}` : "Escribir a tu coach"}>
        {blocked ? <div className="mb-wait"><Icon name="clock" size={18} /><div><b>Tu coach aún no ha visto tus últimos mensajes.</b><span>Apenas los vea podrás escribirle de nuevo. Te avisamos cuando responda.</span></div></div> : <>
          <textarea rows={3} maxLength={maxChars} aria-label="Escribe tu mensaje" placeholder={coach ? `Responder a ${otherName}…` : "Cuéntale a tu coach: una duda, cómo te sientes, algo que notaste…"} value={text} onChange={(e) => setText(e.target.value)} />
          {(preview || video || ytId) && <div className="mb-attach">{preview && <img src={preview} alt="Vista previa" />}<span><Icon name={image ? "camera" : video ? "video" : "play"} size={14} />{image ? "Foto lista para enviar" : video ? video.name.slice(0, 26) : "Vídeo de YouTube"}</span><button type="button" aria-label="Quitar adjunto" onClick={() => { setImage(null); setVideo(null); setYt(""); setShowYt(false); }}><Icon name="close" size={14} /></button></div>}
          {showYt && !ytId && <input className="mb-yt" aria-label="Enlace de YouTube" placeholder="Pega el enlace de YouTube" value={yt} onChange={(e) => setYt(e.target.value)} />}
          {pct !== null && <div className="comp-progress" aria-label={`Subiendo vídeo ${pct}%`}><i style={{ width: `${pct}%` }} /></div>}
          {err && <p role="alert" className="comp-err">{err}</p>}
          <div className="mb-tools">
            {!textOnly && <>
              <input ref={imgIn} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <input ref={vidIn} type="file" accept="video/*" hidden onChange={(e) => { void pickVideo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <button type="button" className="mb-tool" disabled={send.isPending} onClick={() => imgIn.current?.click()}><Icon name="camera" size={16} />Foto</button>
              <button type="button" className="mb-tool" disabled={send.isPending} onClick={() => vidIn.current?.click()}><Icon name="video" size={16} />Vídeo</button>
              {coach && <button type="button" className="mb-tool" disabled={send.isPending} onClick={() => { setShowYt((v) => !v); setImage(null); setVideo(null); }}><Icon name="play" size={14} />YouTube</button>}
            </>}
            <span className="mb-count">{text.length}/{maxChars}</span>
            <button type="button" className="mini-btn primary mb-send" disabled={!canSend} onClick={() => void submit()}>{label}</button>
          </div>
          <p className="mb-note">{coach ? "Los mensajes se borran solos 24 horas después de que el cliente los lee." : `Puedes tener hasta ${MAX_UNREAD} mensajes sin leer. Se borran solos 24 horas después de que tu coach los lee.`}</p>
        </>}
        {justSent && !blocked && <p className="mb-sent" role="status"><Icon name="check" size={14} stroke={2.4} /> Enviado. {coach ? "Le llegó un aviso." : "Tu coach te responde cuando pueda."}</p>}
      </section>
      <div className="mb-list" aria-live="polite">
        {isPending && <><div className="sk" style={{ height: 84 }} /><div className="sk" style={{ height: 84 }} /></>}
        {isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los mensajes. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
        {data && !msgs.length && <div className="mb-empty">{coach ? `Aún no hay mensajes con ${otherName}.` : "Todavía no hay mensajes. Cuando tu coach te escriba, aparecerá aquí. No es un chat: lo ve y te responde con calma."}</div>}
        {msgs.map((m) => <MsgCard key={m.id} m={m} mine={m.sender === me} other={otherName} open={setMedia} />)}
      </div>
      {media && <MediaModal media={media} onClose={() => setMedia(null)} />}
    </div>
  );
}
