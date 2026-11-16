// Lecturas compartidas entre el navegador (React Query) y el servidor (el portal las lee al abrir para que Hoy salga sin esperar).
// Sin "use client": se pueden importar desde el layout del servidor.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanLevel, TrainingPlan, WorkoutLog } from "@/lib/queries";
// Si la base aún no tiene una columna nueva (migración sin correr), se lee sin ella en vez de romper la pantalla.
export const missingColumn = (e: { code?: string; message?: string }) => e.code === "42703" || /column .* does not exist/i.test(e.message ?? "");
// Lo mismo para una tabla o relación nueva (p. ej. exercise_swaps, 0044): PostgREST responde PGRST200 o 42P01.
export const missingTable = (e: { code?: string; message?: string }) => e.code === "PGRST200" || e.code === "42P01" || /relationship|does not exist/i.test(e.message ?? "");
export type PlanRaw = { id: string; name: string; status: "active" | "finished"; starts_on: string; ends_on: string | null; level: PlanLevel | null; level_reason: string | null; review_on: string | null; coach_note: string | null; cycle_weeks?: number | null; plan_days: { id: string; weekday: number; week?: number | null; name: string; est_minutes: number | null; category: string | null; video_ref: string | null; video_id: string | null; video_poster?: string | null; plan_items: { id: string; position: number; sets: number; reps: string; rest_seconds: number | null; target_weight: number | null; exercises: { name: string; muscle_group: string | null; equipment: string | null; video_ref: string | null; instructions: string | null; image?: string | null } | null }[] }[] };
export const loadTrainingPlans = async (sb: SupabaseClient, clientId: string): Promise<TrainingPlan[]> => {
  const q = (days: string, plan = "") => sb.from("training_plans").select(`id,name,status,starts_on,ends_on,level,level_reason,review_on,coach_note${plan},plan_days(${days},plan_items(id,position,sets,reps,rest_seconds,target_weight,exercises(name,muscle_group,equipment,video_ref,instructions,image)))`).eq("client_id", clientId).order("created_at", { ascending: false });
  let { data, error } = await q("id,weekday,week,name,est_minutes,category,video_ref,video_id,video_poster", ",cycle_weeks");
  if (error && missingColumn(error)) ({ data, error } = await q("id,weekday,name,est_minutes,category,video_ref,video_id,video_poster"));   // base sin la 0056
  if (error && missingColumn(error)) ({ data, error } = await q("id,weekday,name,est_minutes,category,video_ref,video_id"));   // base sin la 0041
  if (error) throw error;
  return mapPlans(data as unknown as PlanRaw[]);
};
// Lo comparten la lectura normal y el arranque del portal (portal_boot, 0041): misma forma de datos.
// Semanas (0056): un plan puede tener varias semanas distintas (week 1..cycle_weeks). "days" es la semana que corre hoy (lo que usan
// Hoy, Plan, resúmenes...); "allDays" trae todas, para la ficha de Jeff. Sin la 0056 todo es la semana 1.
export const planWeek = (startsOn: string, cycle: number, day: string = localDate(new Date())): number => {
  if (!cycle || cycle <= 1) return 1;
  const s = new Date(`${startsOn}T12:00:00Z`), mon = s.getTime() - ((s.getUTCDay() + 6) % 7) * 86_400_000;
  const w = Math.max(0, Math.floor((Date.parse(`${day}T12:00:00Z`) - mon) / (7 * 86_400_000)));
  return (w % cycle) + 1;
};
export const mapPlans = (rows: PlanRaw[]): TrainingPlan[] => rows.map((p) => {
  const cycle = Math.max(1, p.cycle_weeks ?? 1), week = planWeek(p.starts_on, cycle);
  const all = p.plan_days.map((d) => ({ id: d.id, weekday: d.weekday, week: d.week ?? 1, name: d.name, minutes: d.est_minutes, category: d.category, videoRef: d.video_ref, hasPersonalVideo: !!d.video_id, poster: d.video_poster ?? null, items: d.plan_items.sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, position: i.position, sets: i.sets, reps: i.reps, rest: i.rest_seconds, weight: i.target_weight, name: i.exercises?.name ?? "—", muscle: i.exercises?.muscle_group ?? null, equipment: i.exercises?.equipment ?? null, videoRef: i.exercises?.video_ref ?? null, instructions: i.exercises?.instructions ?? null, image: i.exercises?.image ?? null })) }));
  return { id: p.id, name: p.name, status: p.status, startsOn: p.starts_on, endsOn: p.ends_on, level: p.level, levelReason: p.level_reason, reviewOn: p.review_on, coachNote: p.coach_note,
    cycleWeeks: cycle, week, allDays: all, days: all.filter((d) => d.week === week) };
});
export type LogRaw = { id: string; log_date: string; effort: number | null; note: string | null; completed_at: string | null; coach_comment: string | null; coach_comment_audio: string | null; coach_comment_image?: string | null; coach_comment_video?: string | null; edits?: number | null; plan_day_id?: string | null; coach_seen_at?: string | null; feedback_seen_at?: string | null; plan_days?: { name: string } | null; set_logs: { plan_item_id: string | null; set_number: number; reps: number | null; weight: number | null }[] };
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const loadLogs = async (sb: SupabaseClient, clientId: string): Promise<WorkoutLog[]> => {
  const since = new Date(); since.setDate(since.getDate() - 90);
  const q = (extra: string) => sb.from("workout_logs").select(`id,log_date,effort,note,completed_at,plan_day_id,coach_comment,coach_comment_audio${extra},coach_seen_at,feedback_seen_at,plan_days(name),set_logs(plan_item_id,set_number,reps,weight)`).eq("client_id", clientId).gte("log_date", localDate(since)).order("log_date", { ascending: false });
  // De la más nueva a la más vieja: con la 0042 (correcciones), con la 0041 (foto/vídeo de Jeff) o sin ninguna.
  let { data, error } = await q(",coach_comment_image,coach_comment_video,edits");
  if (error && missingColumn(error)) ({ data, error } = await q(",coach_comment_image,coach_comment_video"));
  if (error && missingColumn(error)) ({ data, error } = await q(""));
  if (error) throw error;
  return mapLogs(data as unknown as LogRaw[]);
};
export const mapLogs = (rows: LogRaw[]): WorkoutLog[] => rows.map((l) => ({ id: l.id, date: l.log_date, effort: l.effort, note: l.note, completed: !!l.completed_at, coachComment: l.coach_comment, coachCommentAudio: l.coach_comment_audio, coachCommentImage: l.coach_comment_image ?? null, coachCommentVideo: !!l.coach_comment_video, edits: l.edits ?? 0, routine: l.plan_days?.name ?? null, dayId: l.plan_day_id ?? null, coachAt: l.coach_seen_at ?? null, feedbackSeenAt: l.feedback_seen_at ?? null, sets: l.set_logs.map((s) => ({ itemId: s.plan_item_id, setNumber: s.set_number, reps: s.reps, weight: s.weight })) }));
