"use client";
// Entrenar sin señal (pedido de Cristian, 30-oct, noche): en muchos gimnasios la señal se cae. Si una serie, deshacer una serie o
// terminar el entrenamiento no puede salir, se guarda EN EL TELÉFONO (localStorage) en orden y se envía sola al volver la señal
// (al reconectar, al volver a la app y cada 15 s). La pantalla la muestra como hecha mientras tanto.
// OJO (lección del 30-oct): esto NO pausa la red ni React Query. Es una cola local solo para estas acciones; lo demás sigue igual.
// 12-nov: también hábitos (los de fábrica y los de Jeff), marcar comidas y el reporte SOLO de texto. Un reporte con vídeo necesita
// internet para subir el vídeo: sin señal no se intenta (ReportCard lo explica).
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import type { WorkoutLog } from "@/lib/queries";

export type Op =
  | { t: "set"; date: string; itemId: string; setNumber: number; reps: number; weight: number | null }
  | { t: "unset"; date: string; itemId: string; setNumber: number }
  | { t: "finish"; date: string; effort: number; note: string; editing: boolean }
  | { t: "habit"; date: string; water?: number; steps?: number; sleep?: number }
  | { t: "habitx"; date: string; habit: string; value: number | null }
  | { t: "meal"; date: string; mealId: string; done: boolean }
  | { t: "report"; date: string; comment: string };
const KEY = (cid: string) => `yf-oq-${cid}`;
const listeners = new Set<() => void>();
const ping = () => listeners.forEach((l) => l());
export function readQueue(cid: string): Op[] { if (!cid || typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY(cid)) ?? "[]") as Op[]; } catch { return []; } }
function writeQueue(cid: string, q: Op[]) { try { if (q.length) localStorage.setItem(KEY(cid), JSON.stringify(q)); else localStorage.removeItem(KEY(cid)); } catch { /* sin almacenamiento: no hay cola */ } ping(); }

/** Error de red (sin señal), no un rechazo de la base. */
export const isNetErr = (e: unknown) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const m = (e as { message?: string } | null)?.message ?? String(e ?? "");
  return /failed to fetch|networkerror|load failed|fetch failed|network request failed|err_internet|err_network|timed? ?out/i.test(m);
};
export const offlineNow = () => typeof navigator !== "undefined" && navigator.onLine === false;
export const hasQueue = (cid: string) => readQueue(cid).length > 0;

// Clave de lo que se reemplaza: una misma serie, comida, hábito o reporte solo necesita su último estado. Los toques de agua/pasos/sueño
// se juntan en uno solo por día (cada campo con su último valor).
const opKey = (o: Op) => o.t === "set" || o.t === "unset" ? `s:${o.date}:${o.itemId}:${o.setNumber}` : o.t === "finish" ? `f:${o.date}` : o.t === "habitx" ? `hx:${o.date}:${o.habit}` : o.t === "meal" ? `m:${o.date}:${o.mealId}` : o.t === "report" ? `r:${o.date}` : `h:${o.date}`;
export function enqueue(cid: string, op: Op) {
  let q = readQueue(cid);
  // Solo los campos que trae (un "pasos" sin agua no debe borrar el agua anotada antes sin señal).
  if (op.t === "habit") { const old = q.find((o) => o.t === "habit" && o.date === op.date) as Extract<Op, { t: "habit" }> | undefined; const mine = Object.fromEntries(Object.entries(op).filter(([, v]) => v !== undefined)) as Op; if (old) op = { ...old, ...mine }; }
  q = q.filter((o) => opKey(o) !== opKey(op));
  writeQueue(cid, [...q, op]);
}
/** Lo que está en la cola, del tipo pedido (para mostrarlo encima de lo que dice la base). */
export const queued = <T extends Op["t"]>(cid: string, t: T) => readQueue(cid).filter((o): o is Extract<Op, { t: T }> => o.t === t);

/** Lo que está en la cola, aplicado sobre lo que dice la base (para que una relectura no "borre" lo guardado sin señal). */
export function applyQueue(cid: string, logs: WorkoutLog[]): WorkoutLog[] {
  const q = readQueue(cid); if (!q.length) return logs;
  let out = logs;
  for (const o of q) {
    if (o.t !== "set" && o.t !== "unset" && o.t !== "finish") continue;
    if (!out.some((l) => l.date === o.date)) out = [{ id: "tmp", date: o.date, effort: null, note: null, completed: false, coachComment: null, coachCommentAudio: null, sets: [] }, ...out];
    out = out.map((l) => {
      if (l.date !== o.date) return l;
      if (o.t === "set") return { ...l, sets: [...l.sets.filter((s) => !(s.itemId === o.itemId && s.setNumber === o.setNumber)), { itemId: o.itemId, setNumber: o.setNumber, reps: o.reps, weight: o.weight }] };
      if (o.t === "unset") return { ...l, sets: l.sets.filter((s) => !(s.itemId === o.itemId && s.setNumber === o.setNumber)) };
      return { ...l, completed: true, effort: o.effort, note: o.note, edits: (l.edits ?? 0) + (o.editing && l.completed ? 1 : 0) };
    });
  }
  return out;
}

async function send(o: Op) {
  const r = o.t === "set" ? await db().rpc("log_set", { p_date: o.date, p_item: o.itemId, p_set: o.setNumber, p_reps: o.reps, p_weight: o.weight })
    : o.t === "unset" ? await db().rpc("unlog_set", { p_date: o.date, p_item: o.itemId, p_set: o.setNumber })
    : o.t === "finish" ? await db().rpc("finish_workout", { p_date: o.date, p_effort: o.effort, p_note: o.note })
    : o.t === "habit" ? await db().rpc("log_habit", { p_day: o.date, p_water: o.water ?? null, p_steps: o.steps ?? null, p_sleep: o.sleep ?? null })
    : o.t === "habitx" ? await db().rpc("log_habit_extra", { p_day: o.date, p_habit: o.habit, p_value: o.value })
    : o.t === "meal" ? await db().rpc("log_meal", { p_meal: o.mealId, p_date: o.date, p_done: o.done })
    : await db().rpc("submit_report", { p_date: o.date, p_comment: o.comment, p_video_id: null });
  if (r.error) throw r.error;
}
const flushing = new Set<string>();
/** Envía la cola en orden. Para en el primer error de red; un rechazo de la base (p. ej. ya revisado) se descarta y se avisa. */
export type FlushResult = { sent: number; dropped: number; finished: string[]; kinds: Op["t"][] };
export async function flushQueue(cid: string, qc: QueryClient, onResult?: (r: FlushResult) => void) {
  if (!cid || flushing.has(cid) || offlineNow() || !hasQueue(cid)) return;
  flushing.add(cid);
  let sent = 0, dropped = 0; const finished: string[] = [], kinds = new Set<Op["t"]>();
  try {
    for (let guard = 0; guard < 300; guard++) {
      const q = readQueue(cid); if (!q.length) break;
      const o = q[0];
      try { await send(o); sent++; kinds.add(o.t); if (o.t === "finish") finished.push(o.date); }
      catch (e) { if (isNetErr(e)) break; dropped++; }
      writeQueue(cid, readQueue(cid).filter((x) => JSON.stringify(x) !== JSON.stringify(o)));
    }
  } finally { flushing.delete(cid); }
  if (sent || dropped) {
    for (const k of [["logs", cid], ["habits", cid], ["meal-logs", cid], ["meal-lock", cid], ["report", cid]]) void qc.invalidateQueries({ queryKey: k });
    onResult?.({ sent, dropped, finished, kinds: Array.from(kinds) });
  }
}

/** Cuántas acciones esperan señal, y si el teléfono está sin conexión. */
export function useOfflineState(cid: string) {
  const sub = useCallback((cb: () => void) => { listeners.add(cb); window.addEventListener("online", cb); window.addEventListener("offline", cb); window.addEventListener("storage", cb);
    return () => { listeners.delete(cb); window.removeEventListener("online", cb); window.removeEventListener("offline", cb); window.removeEventListener("storage", cb); }; }, []);
  const pending = useSyncExternalStore(sub, () => readQueue(cid).length, () => 0);
  const offline = useSyncExternalStore(sub, () => offlineNow(), () => false);
  return { pending, offline };
}
/** Versión de la cola: cambia cada vez que la cola cambia (para volver a aplicar la cola sobre los datos). */
// 0 = la página aún no "despertó": NO se aplica la cola (lo guardado en el teléfono no existe en el servidor y React redibujaría
// todo, error 418). Desde el primer efecto vale ≥ 1 y la cola se aplica.
export function useQueueVersion(cid: string) {
  const [v, setV] = useState(0);
  useEffect(() => { setV((x) => x + 1); const f = () => setV((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, [cid]);
  return v;
}
/** Envía la cola al abrir, al reconectar, al volver a la app y cada 15 s mientras haya algo pendiente. */
export function useOfflineSync(cid: string, qc: QueryClient, onResult: (r: FlushResult) => void) {
  useEffect(() => {
    if (!cid) return;
    const go = () => void flushQueue(cid, qc, onResult);
    const vis = () => { if (document.visibilityState === "visible") go(); };
    go();
    window.addEventListener("online", go); document.addEventListener("visibilitychange", vis);
    const t = setInterval(() => { if (hasQueue(cid)) go(); }, 15_000);
    return () => { window.removeEventListener("online", go); document.removeEventListener("visibilitychange", vis); clearInterval(t); };
  }, [cid, qc]); // eslint-disable-line react-hooks/exhaustive-deps
}
