"use client";
import { useState } from "react";
import { useSignedAudio } from "@/lib/messages";
import { feedbackUnseen, hasFeedback, localDate, useLogs, useMarkFeedbackSeen, type WorkoutLog } from "@/lib/queries";
import { Icon } from "@/components/ui/Icon";
import { QuickRow } from "./QuickRow";
// Respuestas de Jeff a los entrenamientos (pedido de Cristian, 28-oct):
//  - En Hoy salen como aviso hasta "Marcar como visto".
//  - Quedan guardadas aquí (Mensajes → "Respuestas de Jeff a tus entrenamientos") durante 7 días, para releerlas o volver a escucharlas.
//  - Y cuando vuelve a tocar esa misma rutina, la tarjeta "Rutina de hoy" recuerda lo que Jeff dijo la última vez.
export const FEEDBACK_KEEP_DAYS = 7;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayLabel = (ymd: string) => cap(new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }));
export function CoachAudio({ path }: { path: string }) {
  const a = useSignedAudio(path);
  return a.data ? <audio controls src={a.data} style={{ width: "100%", marginTop: 8 }} /> : <div className="sk" style={{ height: 40, marginTop: 8 }} />;
}
export function FeedbackHistory({ cid }: { cid: string }) {
  const logs = useLogs(cid), seen = useMarkFeedbackSeen(cid), [all, setAll] = useState(false);
  const since = localDate(new Date(Date.now() - FEEDBACK_KEEP_DAYS * 86_400_000));
  const list = (logs.data ?? []).filter((l) => l.date >= since && hasFeedback(l));
  if (!list.length) return null;
  const unseen = list.filter(feedbackUnseen).length, shown = all ? list : list.slice(0, 3);
  return (
    <div className="fbh">
      <QuickRow icon="message" tone={unseen ? "new" : "idle"} chip={unseen ? `${unseen} nueva${unseen === 1 ? "" : "s"}` : undefined} defaultOpen={unseen > 0}
        title="Respuestas de Jeff a tus entrenamientos" sub={`Las de los últimos ${FEEDBACK_KEEP_DAYS} días. No se responden; quedan aquí para releerlas.`}>
        {shown.map((l: WorkoutLog) => (
          <div key={l.id} className={`fbh-item${feedbackUnseen(l) ? " new" : ""}`}>
            <div className="fbh-head"><b>{l.routine ?? "Entrenamiento"}</b><span>{dayLabel(l.date)}</span></div>
            {l.coachComment && <p className="fb-text">{l.coachComment}</p>}
            {l.coachCommentAudio && <CoachAudio path={l.coachCommentAudio} />}
            {feedbackUnseen(l) && <button type="button" className="mini-btn ghost" style={{ marginTop: 8 }} disabled={seen.isPending} onClick={() => seen.mutate(l.id)}><Icon name="check" size={13} stroke={2.4} /> Marcar como visto</button>}
          </div>))}
        {list.length > 3 && <button type="button" className="fbh-more" onClick={() => setAll(!all)}>{all ? "Ver menos" : `Ver las ${list.length}`}</button>}
      </QuickRow>
    </div>
  );
}
// En "Rutina de hoy": lo que Jeff dijo la última vez que hiciste ESTA misma rutina (hasta 3 semanas atrás).
export function LastTimeFeedback({ logs, dayId, dayName, today }: { logs: WorkoutLog[]; dayId: string; dayName: string; today: string }) {
  const [open, setOpen] = useState(false);
  const since = localDate(new Date(Date.now() - 21 * 86_400_000));
  const prev = logs.find((l) => l.date < today && l.date >= since && hasFeedback(l) && (l.dayId === dayId || (!!l.routine && l.routine === dayName)));
  if (!prev) return null;
  return (
    <div className={`last-fb${open ? " open" : ""}`}>
      <button type="button" className="last-fb-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="message" size={14} /><span><b>Lo que te dijo Jeff la última vez</b><small>{dayLabel(prev.date)}{prev.coachCommentAudio ? " · con audio" : ""}</small></span><Icon name="down" size={14} />
      </button>
      {open && <div className="last-fb-body">{prev.coachComment && <p className="fb-text">{prev.coachComment}</p>}{prev.coachCommentAudio && <CoachAudio path={prev.coachCommentAudio} />}</div>}
    </div>
  );
}
