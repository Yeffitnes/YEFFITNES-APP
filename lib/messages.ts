"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast, useWorkspaceId } from "@/components/Providers";
import { compressImage } from "@/lib/image";
import { discardVideo, uploadVideo, UploadError } from "@/lib/upload-video";

export type Msg = { id: string; sender: "client" | "coach"; body: string | null; imagePath: string | null; audioPath: string | null; hasVideo: boolean; youtubeId: string | null; readAt: string | null; createdAt: string; pending?: boolean };
export type Thread = { clientId: string; name: string; status: string; lastSender: "client" | "coach"; lastBody: string | null; lastKind: "text" | "image" | "video" | "audio"; lastAt: string; unread: number };
type Raw = { id: string; sender: string; body: string | null; image_path: string | null; audio_path: string | null; video_id: string | null; youtube_id: string | null; read_at: string | null; created_at: string };

const ME = "me";
export const threadKey = (clientId?: string) => ["thread", clientId ?? ME] as const;
export const fetchThread = async (clientId?: string): Promise<Msg[]> => {
  let q = db().from("messages").select("id,sender,body,image_path,audio_path,video_id,youtube_id,read_at,created_at").order("created_at", { ascending: false }).limit(30);
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q; if (error) throw error;
  return (data as Raw[]).reverse().map((m) => ({ id: m.id, sender: m.sender as Msg["sender"], body: m.body, imagePath: m.image_path, audioPath: m.audio_path, hasVideo: !!m.video_id, youtubeId: m.youtube_id, readAt: m.read_at, createdAt: m.created_at }));
};
export const useThread = (clientId?: string, enabled = true) => useQuery({ queryKey: threadKey(clientId), queryFn: () => fetchThread(clientId), enabled, staleTime: 15_000, refetchInterval: 120_000 });
export const useThreads = () => useQuery({
  queryKey: ["threads"], staleTime: 10_000, refetchInterval: 60_000,
  queryFn: async (): Promise<Thread[]> => {
    const { data, error } = await db().rpc("list_threads"); if (error) throw error;
    return (data as { client_id: string; full_name: string; status: string; last_sender: string; last_body: string | null; last_kind: string; last_at: string; unread: number }[]).map((t) => ({ clientId: t.client_id, name: t.full_name || "Sin nombre", status: t.status, lastSender: t.last_sender as Thread["lastSender"], lastBody: t.last_body, lastKind: t.last_kind as Thread["lastKind"], lastAt: t.last_at, unread: Number(t.unread) }));
  },
});
export const useUnread = () => useQuery({ queryKey: ["unread"], staleTime: 15_000, refetchInterval: 60_000, queryFn: async () => { const { data, error } = await db().rpc("unread_messages"); if (error) throw error; return Number(data ?? 0); } });

// URL temporal (1 h) de una foto privada. Se cachea para no pedirla otra vez al volver a abrir el hilo.
export const useSignedImage = (path: string | null) => useQuery({
  queryKey: ["msg-img", path], enabled: !!path, staleTime: 50 * 60_000, gcTime: 55 * 60_000,
  queryFn: async () => { const { data, error } = await db().storage.from("message-images").createSignedUrl(path!, 3600); if (error) throw error; return data.signedUrl; },
});

// URL temporal (1 h) de un audio privado.
export const useSignedAudio = (path: string | null) => useQuery({
  queryKey: ["msg-audio", path], enabled: !!path, staleTime: 50 * 60_000, gcTime: 55 * 60_000,
  queryFn: async () => { const { data, error } = await db().storage.from("message-audio").createSignedUrl(path!, 3600); if (error) throw error; return data.signedUrl; },
});

export function useMarkRead(clientId?: string) {
  const qc = useQueryClient();
  return async () => { await db().rpc("mark_thread_read", { p_client: clientId ?? null }); void qc.invalidateQueries({ queryKey: ["unread"] }); void qc.invalidateQueries({ queryKey: ["threads"] }); void qc.invalidateQueries({ queryKey: threadKey(clientId) }); };
}

export type SendInput = { body: string; audio?: Blob | null; image?: File | null; video?: File | null; youtube?: string | null; onProgress?: (pct: number) => void; signal?: AbortSignal };
export class SendError extends Error { constructor(public code: string) { super(code); } }
const ERR: Record<string, string> = { too_many: "Ya enviaste varios mensajes hoy. Escríbele de nuevo mañana.", wait_reply: "Tu coach aún no ha visto tus últimos mensajes. Cuando los vea podrás enviar más.", limit_text: "Ya enviaste tus 3 mensajes de hoy. Mañana puedes escribir de nuevo.", limit_image: "Hoy ya enviaste una foto. Mañana puedes enviar otra.", limit_video: "Hoy ya enviaste un vídeo. Mañana puedes enviar otro.", one_attachment: "Envía la foto y el vídeo por separado.", not_allowed: "No puedes enviar eso con tu cuenta.", too_long: "El mensaje es muy largo (máximo 600 caracteres).", empty: "Escribe algo antes de enviar.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa tu conexión y vuelve a intentarlo.", not_configured: "Los vídeos aún no están activados." };
export const sendErrorText = (e: unknown) => (e instanceof SendError || e instanceof UploadError ? ERR[e.code] : null) ?? "No se pudo enviar. Inténtalo de nuevo.";

export function useSendMessage(clientId?: string, ownClientId?: string) {
  const qc = useQueryClient(), ws = useWorkspaceId(), toast = useToast();
  return useMutation({
    mutationFn: async (x: SendInput) => {
      let imagePath: string | null = null, videoId: string | null = null, audioPath: string | null = null;
      const cid = clientId ?? ownClientId ?? null;
      if (x.image) {
        if (!cid) throw new SendError("not_allowed");
        const blob = await compressImage(x.image, 1280, 0.75);
        imagePath = `${ws}/${cid}/${crypto.randomUUID()}.jpg`;
        const up = await db().storage.from("message-images").upload(imagePath, blob, { contentType: "image/jpeg" });
        if (up.error) throw new SendError("not_allowed");
      }
      if (x.audio) {
        if (!clientId) throw new SendError("not_allowed");           // solo el coach envía audio
        const type = (x.audio.type || "audio/webm").split(";")[0], ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        audioPath = `${ws}/${clientId}/${crypto.randomUUID()}.${ext}`;
        const up = await db().storage.from("message-audio").upload(audioPath, x.audio, { contentType: type });
        if (up.error) throw new SendError("not_allowed");
        const { data: d2, error: e2 } = await db().rpc("send_audio_message", { p_client: clientId, p_audio: audioPath, p_body: x.body || null });
        if (e2) throw new SendError(/too_long|not_allowed/.exec(e2.message)?.[0] ?? "failed");
        void fetch("/api/push/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: d2 }) }).catch(() => {});
        return d2 as string;
      }
      if (x.video) videoId = await uploadVideo(x.video, x.onProgress ?? (() => {}), { purpose: "message", clientId, signal: x.signal });
      const { data, error } = await db().rpc("send_message", { p_client: clientId ?? null, p_body: x.body || null, p_image: imagePath, p_video: videoId, p_youtube: x.youtube ?? null });
      if (error) { discardVideo(videoId); throw new SendError(/limit_text|limit_image|limit_video|one_attachment|too_many|wait_reply|too_long|empty|not_allowed/.exec(error.message)?.[0] ?? "failed"); }
      void fetch("/api/push/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: data }) }).catch(() => {});
      return data as string;
    },
    onMutate: async (x) => {
      if (x.image || x.video || x.youtube || x.audio) return;       // con adjunto no hay vista previa: aparece al terminar de subir
      await qc.cancelQueries({ queryKey: threadKey(clientId) });
      const prev = qc.getQueryData<Msg[]>(threadKey(clientId));
      qc.setQueryData<Msg[]>(threadKey(clientId), (l) => [...(l ?? []), { id: `tmp-${Date.now()}`, sender: clientId ? "coach" : "client", body: x.body, imagePath: null, audioPath: null, hasVideo: false, youtubeId: null, readAt: null, createdAt: new Date().toISOString(), pending: true }]);
      return { prev };
    },
    onError: (e, _x, ctx) => { if (ctx?.prev) qc.setQueryData(threadKey(clientId), ctx.prev); if (!(e instanceof UploadError && e.code === "cancelled")) toast(sendErrorText(e), true); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: threadKey(clientId) }); void qc.invalidateQueries({ queryKey: ["threads"] }); },
  });
}

// Tiempo real: cuando llega o se lee un mensaje, las pantallas se actualizan solas (y suena un aviso si la otra persona escribió).
export function useMessagesRealtime(side: "client" | "coach") {
  const qc = useQueryClient(), toast = useToast();
  useEffect(() => {
    const c = db(), ch = c.channel("messages-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p: { new: unknown }) => {
        const m = p.new as { sender: string; client_id: string };
        void qc.invalidateQueries({ queryKey: ["unread"] }); void qc.invalidateQueries({ queryKey: ["threads"] });
        void qc.invalidateQueries({ queryKey: side === "coach" ? threadKey(m.client_id) : threadKey() });
        if (m.sender !== side && !location.pathname.endsWith("/mensajes")) toast(side === "coach" ? "Nuevo mensaje de un cliente" : "Tu coach te escribió");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => { void qc.invalidateQueries({ queryKey: ["unread"] }); void qc.invalidateQueries({ queryKey: ["threads"] }); void qc.invalidateQueries({ queryKey: ["thread"] }); })   // "Visto" se actualiza al instante
      .subscribe();
    return () => { void c.removeChannel(ch); };
  }, [qc, toast, side]);
}

// Limpieza al abrir la bandeja del coach: borra los mensajes ya cumplidos y elimina sus fotos (Storage) y vídeos (Bunny).
export function usePurgeMessages() {
  const qc = useQueryClient();
  useEffect(() => {
    let off = false;
    void (async () => {
      try {
        const c = db(); await c.rpc("purge_messages");
        const { data } = await c.rpc("due_message_trash"), rows = (data ?? []) as { id: string; kind: string; ref: string }[];
        if (off || !rows.length) return;
        const imgs = rows.filter((r) => r.kind === "image");
        if (imgs.length) { const { error } = await c.storage.from("message-images").remove(imgs.map((r) => r.ref)); if (!error) await c.rpc("clear_message_trash", { p_ids: imgs.map((r) => r.id) }); }
        const auds = rows.filter((r) => r.kind === "audio");
        if (auds.length) { const { error } = await c.storage.from("message-audio").remove(auds.map((r) => r.ref)); if (!error) await c.rpc("clear_message_trash", { p_ids: auds.map((r) => r.id) }); }
        if (rows.some((r) => r.kind === "video")) await fetch("/api/messages/purge", { method: "POST" }).catch(() => {});
        void qc.invalidateQueries({ queryKey: ["threads"] }); void qc.invalidateQueries({ queryKey: ["thread"] });
      } catch { /* se reintenta la próxima vez */ }
    })();
    return () => { off = true; };
  }, [qc]);
}

// Audio suelto del coach (comentario de un entrenamiento): sube a la carpeta del cliente y devuelve la ruta.
export async function uploadCoachAudio(ws: string, clientId: string, blob: Blob): Promise<string> {
  const type = (blob.type || "audio/webm").split(";")[0], ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  const path = `${ws}/${clientId}/${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from("message-audio").upload(path, blob, { contentType: type }); if (up.error) throw up.error;
  return path;
}
