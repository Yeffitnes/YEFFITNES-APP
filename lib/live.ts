"use client";
import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import type { WorkoutLog } from "@/lib/queries";

// Tiempo real (pedido de Cristian, 29-oct: "no hay nada que esté funcionando a tiempo real"). Antes solo los mensajes llegaban al
// instante; un aviso de Jeff, su respuesta a un entrenamiento o una sesión cancelada se veían solo al salir y volver a entrar.
// Ahora la app escucha esos cambios (Supabase Realtime, migración 0041) y vuelve a leer lo que cambió. La base solo le manda a
// cada persona lo que sus políticas RLS le dejan ver. Como respaldo, al volver a la app (celular desbloqueado, pestaña al frente)
// se vuelve a leer todo lo que cambia seguido, por si la conexión en vivo se cortó mientras estaba en segundo plano.
type Row = Record<string, unknown>;
const CLIENT_KEYS = [["my-nudges"], ["logs"], ["my-bookings"], ["first-call"], ["coach-cancels"], ["materials"], ["announcements"], ["thread"], ["unread"], ["report"], ["me"]];
const COACH_KEYS = [["recent-logs"], ["client-logs"], ["coach-reports"], ["activity"], ["activity-today"], ["activity-unseen"], ["coach-attention"], ["advice-feed"], ["coach-slots"], ["client-bookings"], ["nudges"], ["threads"], ["unread"], ["clients"]];

function batcher(qc: QueryClient, ms: number) {
  const pending = new Set<string>(); let t: ReturnType<typeof setTimeout> | null = null;
  return (...keys: string[][]) => {
    keys.forEach((k) => pending.add(JSON.stringify(k)));
    if (t) return;
    t = setTimeout(() => { t = null; const all = Array.from(pending); pending.clear(); all.forEach((k) => void qc.invalidateQueries({ queryKey: JSON.parse(k) as string[] })); }, ms);
  };
}

export function useLiveSync(side: "client" | "coach", clientId?: string) {
  const qc = useQueryClient(), toast = useToast(), toastRef = useRef(toast); toastRef.current = toast;
  useEffect(() => {
    if (side === "client" && !clientId) return;
    const c = db(), inv = batcher(qc, side === "coach" ? 1200 : 250), say = (m: string) => toastRef.current(m);
    let ch: ReturnType<typeof c.channel>;
    if (side === "client") {
      const f = `client_id=eq.${clientId}`;
      ch = c.channel(`live-client-${clientId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "nudges", filter: f }, () => { inv(["my-nudges", clientId!]); say("Jeff te envió un aviso"); })
        // Cada serie que registra el propio cliente también cambia su registro del día: solo se relee si cambió lo de Jeff.
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workout_logs", filter: f }, (p: { new: Row }) => {
          const n = p.new, cached = qc.getQueryData<WorkoutLog[]>(["logs", clientId!])?.find((l) => l.id === n.id);
          const coachAt = (n.coach_seen_at as string | null) ?? null;
          if (!coachAt || (cached && cached.coachAt === coachAt)) return;
          inv(["logs", clientId!]);
          if (n.coach_comment || n.coach_comment_audio || n.coach_comment_image || n.coach_comment_video) say("Jeff respondió a tu entrenamiento");
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: f }, (p: { new: Row }) => {
          inv(["my-bookings", clientId!], ["first-call", clientId!], ["coach-cancels", clientId!], ["open-slots"]);
          if (p.new?.status === "cancelled" && p.new?.cancelled_by === "coach") say("Jeff canceló una de tus sesiones");
        })
        .subscribe();
    } else {
      ch = c.channel("live-coach")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => inv(["activity"], ["activity-today"], ["activity-unseen"], ["coach-attention"], ["recent-logs"]))
        .on("postgres_changes", { event: "*", schema: "public", table: "workout_logs" }, (p: { new: Row }) => inv(["recent-logs"], ["client-logs", String(p.new?.client_id ?? "")], ["advice-feed"], ["coach-attention"]))
        .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => inv(["coach-reports"], ["coach-attention"]))
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (p: { new: Row }) => inv(["coach-slots"], ["client-bookings", String(p.new?.client_id ?? "")], ["coach-attention"]))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "nudges" }, () => inv(["nudges"]))
        .subscribe();
    }
    // Respaldo: al volver a la app se relee lo que cambia seguido (en iPhone la conexión en vivo se corta en segundo plano).
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (Date.now() - hiddenAt < 3000) return;
      (side === "coach" ? COACH_KEYS : CLIENT_KEYS).forEach((k) => void qc.invalidateQueries({ queryKey: k }));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void c.removeChannel(ch); };
  }, [qc, side, clientId]);
}
