"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast, useWorkspaceId } from "@/components/Providers";
import { compressImage } from "@/lib/image";
import { uploadVideo, UploadError } from "@/lib/upload-video";

export type Msg = { id: string; sender: "client" | "coach"; body: string | null; imagePath: string | null; hasVideo: boolean; youtubeId: string | null; readAt: string | null; createdAt: string; pending?: boolean };
export type Thread = { clientId: string; name: string; status: string; lastSender: "client" | "coach"; lastBody: string | null; lastKind: "text" | "image" | "video"; lastAt: string; unread: number };
type Raw = { id: string; sender: string; body: string | null; image_path: string | null; video_id: string | null; youtube_id: string | null; read_at: string | null; created_at: string };

const ME = "me";
export const threadKey = (clientId?: string) => ["thread", clientId ?? ME] as const;
export const fetchThread = async (clientId?: string): Promise<Msg[]> => {
  let q = db().from("messages").select("id,sender,body,image_path,video_id,youtube_id,read_at,created_at").order("created_at", { ascending: false }).limit(100);
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q; if (error) throw error;
  return (data as Raw[]).reverse().map((m) => ({ id: m.id, sender: m.sender as Msg["sender"], body: m.body, imagePath: m.image_path, hasVideo: !!m.video_id, youtubeId: m.youtube_id, readAt: m.read_at, createdAt: m.created_at }));
};
export const useThread = (clientId?: string, enabled = true) => useQuery({ queryKey: threadKey(clientId), queryFn: () => fetchThread(clientId), enabled, staleTime: 10_000, refetchInterval: 60_000 });
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

export function useMarkRead(clientId?: string) {
  const qc = useQueryClient();
  return async () => { await db().rpc("mark_thread_read", { p_client: clientId ?? null }); void qc.invalidateQueries({ queryKey: ["unread"] }); void qc.invalidateQueries({ queryKey: ["threads"] }); };
}

export type SendInput = { body: string; image?: File | null; video?: File | null; youtube?: string | null; onProgress?: (pct: number) => void };
export class SendError extends Error { constructor(public code: string) { super(code); } }
const ERR: Record<string, string> = { too_many: "Enviaste muchos mensajes seguidos. Espera un rato.", not_allowed: "No puedes enviar eso con tu cuenta.", too_long: "El mensaje es muy largo.", empty: "Escribe algo antes de enviar.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa tu conexión y vuelve a intentarlo.", not_configured: "Los vídeos aún no están activados." };
export const sendErrorText = (e: unknown) => (e instanceof SendError || e instanceof UploadError ? ERR[e.code] : null) ?? "No se pudo enviar. Inténtalo de nuevo.";

export function useSendMessage(clientId?: string, ownClientId?: string) {
  const qc = useQueryClient(), ws = useWorkspaceId(), toast = useToast();
  return useMutation({
    mutationFn: async (x: SendInput) => {
      let imagePath: string | null = null, videoId: string | null = null;
      const cid = clientId ?? ownClientId ?? null;
      if (x.image) {
        if (!cid) throw new SendError("not_allowed");
        const blob = await compressImage(x.image, 1400, 0.85);
        imagePath = `${ws}/${cid}/${crypto.randomUUID()}.jpg`;
        const up = await db().storage.from("message-images").upload(imagePath, blob, { contentType: "image/jpeg" });
        if (up.error) throw new SendError("not_allowed");
      }
      if (x.video) videoId = await uploadVideo(x.video, x.onProgress ?? (() => {}), { purpose: "message", clientId });
      const { data, error } = await db().rpc("send_message", { p_client: clientId ?? null, p_body: x.body || null, p_image: imagePath, p_video: videoId, p_youtube: x.youtube ?? null });
      if (error) throw new SendError(/too_many|too_long|empty|not_allowed/.exec(error.message)?.[0] ?? "failed");
      void fetch("/api/push/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: data }) }).catch(() => {});
      return data as string;
    },
    onMutate: async (x) => {
      if (x.image || x.video || x.youtube) return;       // con adjunto no hay vista previa: aparece al terminar de subir
      await qc.cancelQueries({ queryKey: threadKey(clientId) });
      const prev = qc.getQueryData<Msg[]>(threadKey(clientId));
      qc.setQueryData<Msg[]>(threadKey(clientId), (l) => [...(l ?? []), { id: `tmp-${Date.now()}`, sender: clientId ? "coach" : "client", body: x.body, imagePath: null, hasVideo: false, youtubeId: null, readAt: null, createdAt: new Date().toISOString(), pending: true }]);
      return { prev };
    },
    onError: (e, _x, ctx) => { if (ctx?.prev) qc.setQueryData(threadKey(clientId), ctx.prev); toast(sendErrorText(e), true); },
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => { void qc.invalidateQueries({ queryKey: ["unread"] }); void qc.invalidateQueries({ queryKey: ["threads"] }); })
      .subscribe();
    return () => { void c.removeChannel(ch); };
  }, [qc, toast, side]);
}
