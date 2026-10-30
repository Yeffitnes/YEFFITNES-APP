"use client";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { useBackgroundUpload } from "@/lib/upload-manager";
import { bogotaDay, type NudgeKind } from "@/lib/nudges";
import { loadLogs, loadTrainingPlans, localDate, missingColumn } from "@/lib/fetchers";

export type Plan = { id: string; name: string; features: string[] };
export type ClientRow = { id: string; name: string; planId: string | null; plan: string | null; status: "pending" | "active" | "paused"; createdAt: string; objective: string | null; objectiveAt: string | null; accessRequestedAt?: string | null; objectiveVideo?: boolean; planSince?: string | null; heightCm?: number | null; startWeight?: number | null };
export type Ex = { id: string; name: string; category: string; muscle: string | null; equipment: string | null; difficulty: number; instructions: string | null; videoRef: string | null; used: number; image?: string | null; suggSets?: number | null; suggReps?: string | null };
export type RoutineItem = { exerciseId: string; name: string; hasVideo: boolean; sets: number; reps: string; rest: number | null };
export type Routine = { id: string; name: string; category: string | null; minutes: number | null; video: string | null; items: RoutineItem[] };

type ClientRaw = { id: string; status: string; plan_id: string | null; created_at: string; objective: string | null; objective_at: string | null; access_requested_at?: string | null; objective_video_id?: string | null; plan_since?: string | null; height_cm?: number | null; start_weight_kg?: number | null; plans: unknown; profiles: unknown };
type ExRaw = { id: string; name: string; category: string; muscle_group: string | null; equipment: string | null; difficulty: number; instructions: string | null; video_ref: string | null; image?: string | null; sugg_sets?: number | null; sugg_reps?: string | null; template_items: unknown };
type RoutineRaw = { id: string; name: string; category: string | null; est_minutes: number | null; video_ref: string | null; template_items: unknown };
export const fetchPlans = async (): Promise<Plan[]> => {
  const { data, error } = await db().from("plans").select("id,name,features").eq("active", true).order("name");
  if (error) throw error; return data as Plan[];
};
export const fetchClients = async (): Promise<ClientRow[]> => {
  const { data, error } = await db().from("clients").select("id,status,plan_id,created_at,objective,objective_at,access_requested_at,objective_video_id,plan_since,height_cm,start_weight_kg,plans(name),profiles!inner(full_name,role)").eq("profiles.role", "client").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ClientRaw[]).map((c) => ({ id: c.id, name: (c.profiles as unknown as { full_name: string }).full_name || "Sin nombre", planId: c.plan_id, plan: (c.plans as unknown as { name: string } | null)?.name ?? null, status: c.status as ClientRow["status"], createdAt: c.created_at, objective: c.objective, objectiveAt: c.objective_at, accessRequestedAt: c.access_requested_at ?? null, objectiveVideo: !!c.objective_video_id, planSince: c.plan_since ?? null, heightCm: c.height_cm ?? null, startWeight: c.start_weight_kg ?? null }));
};
export const fetchExercises = async (): Promise<Ex[]> => {
  const { data, error } = await db().from("exercises").select("id,name,category,muscle_group,equipment,difficulty,instructions,video_ref,image,sugg_sets,sugg_reps,template_items(count)").eq("active", true).order("name");
  if (error) throw error;
  return (data as unknown as ExRaw[]).map((e) => ({ id: e.id, name: e.name, category: e.category, muscle: e.muscle_group, equipment: e.equipment, difficulty: e.difficulty, instructions: e.instructions, videoRef: e.video_ref, image: e.image ?? null, suggSets: e.sugg_sets ?? null, suggReps: e.sugg_reps ?? null, used: (e.template_items as unknown as { count: number }[])?.[0]?.count ?? 0 }));
};
export const fetchRoutines = async (): Promise<Routine[]> => {
  const { data, error } = await db().from("routine_templates").select("id,name,category,est_minutes,video_ref,template_items(position,exercise_id,sets,reps,rest_seconds,exercises(name,video_ref))").eq("active", true).order("created_at", { ascending: false });
  if (error) throw error;
  type It = { position: number; exercise_id: string; sets: number; reps: string; rest_seconds: number | null; exercises: { name: string; video_ref: string | null } | null };
  return (data as unknown as RoutineRaw[]).map((r) => ({ id: r.id, name: r.name, category: r.category, minutes: r.est_minutes, video: r.video_ref,
    items: ((r.template_items as unknown as It[]) ?? []).sort((a, b) => a.position - b.position).map((i) => ({ exerciseId: i.exercise_id, name: i.exercises?.name ?? "—", hasVideo: !!i.exercises?.video_ref, sets: i.sets, reps: i.reps, rest: i.rest_seconds })) }));
};

export const KEYS = { plans: ["plans"], clients: ["clients"], exercises: ["exercises"], routines: ["routines"] } as const;
export const useClients = (enabled = true) => useQuery({ queryKey: KEYS.clients, queryFn: fetchClients, staleTime: 15_000, refetchInterval: 45_000, enabled });
export const usePlans = () => useQuery({ queryKey: KEYS.plans, queryFn: fetchPlans, staleTime: 300_000 });
export const useExercises = () => useQuery({ queryKey: KEYS.exercises, queryFn: fetchExercises, staleTime: 120_000 });
export const useRoutines = () => useQuery({ queryKey: KEYS.routines, queryFn: fetchRoutines, staleTime: 120_000 });

// Asignar plan: la pantalla cambia al instante (optimista) y se corrige sola si la base lo rechaza.
export function useSetPlan() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string | null }) => {
      const { error } = await db().from("clients").update(planId ? { plan_id: planId, status: "active" } : { plan_id: null, status: "pending" }).eq("id", id);
      if (error) throw error;
      // Si se acaba de activar, le llega "Tu plan está activo" (la base de datos decide si toca; si no, no envía nada).
      if (planId) void fetch("/api/access/activated", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: id }) }).catch(() => {});
    },
    onMutate: async ({ id, planId }) => {
      await qc.cancelQueries({ queryKey: KEYS.clients });
      const prev = qc.getQueryData<ClientRow[]>(KEYS.clients);
      const plans = qc.getQueryData<Plan[]>(KEYS.plans);
      qc.setQueryData<ClientRow[]>(KEYS.clients, (l) => l?.map((c) => (c.id === id ? { ...c, planId, plan: plans?.find((p) => p.id === planId)?.name ?? null, status: planId ? "active" : "pending" } : c)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(KEYS.clients, ctx?.prev); toast("No pudimos guardar el plan. Inténtalo de nuevo.", true); },
    onSuccess: () => toast("Plan actualizado"),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.clients }),
  });
}

export type ExerciseInput = { id?: string; name: string; category: string; muscle: string; equipment: string; difficulty: number; instructions: string; videoRef: string | null; image?: string | null; suggSets?: number | null; suggReps?: string | null };
export function useSaveExercise(workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (x: ExerciseInput) => {
      const row = { name: x.name, category: x.category, muscle_group: x.muscle || null, equipment: x.equipment || null, difficulty: x.difficulty, instructions: x.instructions || null, video_provider: x.videoRef ? "youtube" : null, video_ref: x.videoRef, image: x.image ?? null, sugg_sets: x.suggSets ?? null, sugg_reps: x.suggReps?.trim() || null };
      const { error } = x.id ? await db().from("exercises").update(row).eq("id", x.id) : await db().from("exercises").insert({ ...row, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => { toast("Ejercicio guardado"); qc.invalidateQueries({ queryKey: KEYS.exercises }); qc.invalidateQueries({ queryKey: KEYS.routines }); },
    onError: () => toast("No pudimos guardar el ejercicio. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}
export function useArchive(table: "exercises" | "routine_templates") {
  const qc = useQueryClient(), toast = useToast();
  const key = table === "exercises" ? KEYS.exercises : KEYS.routines;
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await db().from(table).update({ active: false }).eq("id", id); if (error) throw error; },
    onMutate: async (id) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<{ id: string }[]>(key); qc.setQueryData<{ id: string }[]>(key, (l) => l?.filter((i) => i.id !== id)); return { prev }; },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos archivarlo. Inténtalo de nuevo.", true); },
    onSuccess: () => toast("Archivado"),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
export type RoutineInput = { id?: string; name: string; category: string; minutes: number | null; video: string | null; items: { exercise_id: string; sets: number; reps: string; rest_seconds: number | null }[] };
export function useSaveRoutine() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (r: RoutineInput) => {
      const { error } = await db().rpc("save_routine", { p_id: r.id ?? null, p_name: r.name, p_category: r.category || null, p_minutes: r.minutes, p_items: r.items, p_video: r.video });
      if (error) throw error;
    },
    onSuccess: () => { toast("Rutina guardada"); qc.invalidateQueries({ queryKey: KEYS.routines }); qc.invalidateQueries({ queryKey: KEYS.exercises }); },
    onError: () => toast("No pudimos guardar la rutina. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}

// ---- Entrenamiento por días ----
export type PlanItem = { image?: string | null; id: string; position: number; sets: number; reps: string; rest: number | null; weight: number | null; name: string; muscle: string | null; equipment: string | null; videoRef: string | null; instructions: string | null };
export type PlanDay = { id: string; weekday: number; name: string; minutes: number | null; category: string | null; videoRef: string | null; hasPersonalVideo: boolean; poster?: string | null; items: PlanItem[] };
export type PlanLevel = "beginner" | "intermediate" | "advanced";
export type TrainingPlan = { id: string; name: string; status: "active" | "finished"; startsOn: string; endsOn: string | null; level: PlanLevel | null; levelReason: string | null; reviewOn: string | null; coachNote: string | null; days: PlanDay[] };
export const fetchTrainingPlans = (clientId: string): Promise<TrainingPlan[]> => loadTrainingPlans(db(), clientId);
// Asigna el vídeo personalizado de un día (lo usa la subida en segundo plano, que ya no depende de la pantalla).
export async function assignDayVideo(qc: QueryClient, clientId: string, dayId: string, videoId: string, poster?: Promise<string | null>) {
  const { error } = await db().rpc("set_day_video", { p_day: dayId, p_video: videoId }); if (error) throw error;
  // Portada difuminada (0041). Si falla (p. ej. la base aún sin la 0041), el vídeo queda igual, solo sin portada.
  const p = poster ? await poster.catch(() => null) : null;
  await db().from("plan_days").update({ video_poster: p }).eq("id", dayId).then(() => undefined, () => undefined);
  await qc.invalidateQueries({ queryKey: ["plans-of", clientId] });
}
export function useSetDayVideo(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { dayId: string; videoId: string | null }) => { const { error } = await db().rpc("set_day_video", { p_day: v.dayId, p_video: v.videoId }); if (error) throw error; },
    onSuccess: (_d, v) => toast(v.videoId ? "Vídeo personalizado asignado" : "Vídeo personalizado quitado"),
    onError: () => toast("No pudimos guardar el vídeo. Inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["plans-of", clientId] }),
  });
}
export const useTrainingPlans = (clientId: string) => useQuery({ queryKey: ["plans-of", clientId], queryFn: () => fetchTrainingPlans(clientId), staleTime: 60_000, enabled: !!clientId });
export function useCreatePlan(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (name: string) => { const { error } = await db().rpc("create_training_plan", { p_client: clientId, p_name: name }); if (error) throw error; },
    onSuccess: () => { toast("Plan creado"); qc.invalidateQueries({ queryKey: ["plans-of", clientId] }); },
    onError: () => toast("No pudimos crear el plan. Inténtalo de nuevo.", true),
  });
}
export function useAssignDay(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { planId: string; weekdays: number[]; templateId: string }) => {
      const res = await Promise.all(v.weekdays.map((w) => db().rpc("assign_day", { p_plan: v.planId, p_weekday: w, p_template: v.templateId })));
      const bad = res.find((r) => r.error); if (bad?.error) throw bad.error;
    },
    onSuccess: (_d, v) => { toast(v.weekdays.length > 1 ? `Rutina asignada a ${v.weekdays.length} días` : "Rutina asignada"); qc.invalidateQueries({ queryKey: ["plans-of", clientId] }); },
    onError: () => toast("No pudimos asignar la rutina a todos los días. Revisa cuáles quedaron e inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["plans-of", clientId] }), // si falló uno, otros días pudieron guardarse
  });
}
export function useClearDay(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["plans-of", clientId];
  return useMutation({
    // Se pide la fila borrada de vuelta: si no vuelve ninguna, la base no borró nada (sin error visible) y se avisa.
    mutationFn: async (dayId: string) => { const { data, error } = await db().from("plan_days").delete().eq("id", dayId).select("id"); if (error) throw error; if (!data?.length) throw new Error("no_delete"); },
    onMutate: async (dayId: string) => { // el día se libera al instante
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TrainingPlan[]>(key);
      if (prev) qc.setQueryData<TrainingPlan[]>(key, prev.map((pl) => ({ ...pl, days: pl.days.filter((x) => x.id !== dayId) })));
      return { prev };
    },
    onSuccess: () => toast("Día libre: queda como descanso"),
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast("No pudimos dejar el día libre. Inténtalo de nuevo.", true); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
export function useSetWeight(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["plans-of", clientId];
  return useMutation({
    mutationFn: async (v: { itemId: string; weight: number | null }) => { const { error } = await db().from("plan_items").update({ target_weight: v.weight }).eq("id", v.itemId); if (error) throw error; },
    onMutate: async (v) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<TrainingPlan[]>(key);
      qc.setQueryData<TrainingPlan[]>(key, (l) => l?.map((p) => ({ ...p, days: p.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === v.itemId ? { ...i, weight: v.weight } : i)) })) }))); return { prev }; },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos guardar el peso. Inténtalo de nuevo.", true); },
  });
}

// ---- Portal del cliente ----
export type Me = { id: string; status: string; planName: string | null; features: string[]; onboarded: boolean; objective: string | null; objectiveAt: string | null; accessRequestedAt?: string | null; objectiveVideo?: boolean };
export const fetchMe = async (profileId: string): Promise<Me | null> => {
  const { data, error } = await db().from("clients").select("id,status,onboarded_at,objective,objective_at,access_requested_at,objective_video_id,plans(name,features)").eq("profile_id", profileId).maybeSingle();
  if (error) throw error; if (!data) return null;
  const p = (data as unknown as { plans: { name: string; features: string[] } | null }).plans;
  return { id: data.id, status: data.status, planName: p?.name ?? null, features: p?.features ?? [], onboarded: !!(data as unknown as { onboarded_at: string | null }).onboarded_at, objective: (data as unknown as { objective: string | null }).objective, objectiveAt: (data as unknown as { objective_at: string | null }).objective_at, accessRequestedAt: (data as unknown as { access_requested_at: string | null }).access_requested_at, objectiveVideo: !!(data as unknown as { objective_video_id: string | null }).objective_video_id };
};
// El cliente pendiente pide acceso a su coach (0034). Devuelve la hora de la solicitud para pintarla al instante.
export function useRequestAccess(profileId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async () => { const r = await fetch("/api/access/request", { method: "POST" }); if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "failed"); },
    onSuccess: () => { qc.setQueryData<Me | null>(["me", profileId], (m) => (m ? { ...m, accessRequestedAt: new Date().toISOString() } : m)); toast("Listo. Le avisamos a tu coach."); },
    onError: (e) => toast((e as Error).message === "not_pending" ? "Tu cuenta ya está activa. Recarga la app." : "No pudimos enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}
export const useMe = (profileId: string) => useQuery({ queryKey: ["me", profileId], staleTime: 60_000, enabled: !!profileId, queryFn: () => fetchMe(profileId) });
export type SetLog = { itemId: string | null; setNumber: number; reps: number | null; weight: number | null };
export type WorkoutLog = { id: string; date: string; effort: number | null; note: string | null; completed: boolean; coachComment: string | null; coachCommentAudio: string | null; coachCommentImage?: string | null; coachCommentVideo?: boolean; sets: SetLog[]; routine?: string | null; dayId?: string | null; coachAt?: string | null; feedbackSeenAt?: string | null };
export { localDate };
export const fetchLogs = (clientId: string): Promise<WorkoutLog[]> => loadLogs(db(), clientId);
export const useLogs = (clientId: string) => useQuery({ queryKey: ["logs", clientId], staleTime: 30_000, enabled: !!clientId, queryFn: () => fetchLogs(clientId) });
export function useLogSet(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["logs", clientId];
  return useMutation({
    mutationFn: async (v: { date: string; itemId: string; setNumber: number; reps: number; weight: number | null }) => {
      const { error } = await db().rpc("log_set", { p_date: v.date, p_item: v.itemId, p_set: v.setNumber, p_reps: v.reps, p_weight: v.weight }); if (error) throw error;
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<WorkoutLog[]>(key);
      qc.setQueryData<WorkoutLog[]>(key, (l = []) => {
        const s: SetLog = { itemId: v.itemId, setNumber: v.setNumber, reps: v.reps, weight: v.weight };
        const has = l.some((x) => x.date === v.date);
        const base = has ? l : [{ id: "tmp", date: v.date, effort: null, note: null, completed: false, coachComment: null, coachCommentAudio: null, sets: [] }, ...l];
        return base.map((x) => (x.date === v.date ? { ...x, sets: [...x.sets.filter((y) => !(y.itemId === v.itemId && y.setNumber === v.setNumber)), s] } : x));
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos guardar la serie. Revisa tu conexión e inténtalo de nuevo.", true); },
    // Sin releer todo tras cada serie (más rápido). Solo se vuelve a leer si falló o si el registro aún es provisional.
    onSuccess: () => { if (qc.getQueryData<WorkoutLog[]>(key)?.some((l) => l.id === "tmp")) qc.invalidateQueries({ queryKey: key }); },
  });
}
export function useUnlogSet(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["logs", clientId];
  return useMutation({
    mutationFn: async (v: { date: string; itemId: string; setNumber: number }) => { const { error } = await db().rpc("unlog_set", { p_date: v.date, p_item: v.itemId, p_set: v.setNumber }); if (error) throw error; },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<WorkoutLog[]>(key);
      qc.setQueryData<WorkoutLog[]>(key, (l = []) => l.map((x) => (x.date === v.date ? { ...x, sets: x.sets.filter((y) => !(y.itemId === v.itemId && y.setNumber === v.setNumber)) } : x)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos deshacer la serie. Inténtalo de nuevo.", true); },
  });
}
export function useFinish(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { date: string; effort: number; note: string }) => { const { error } = await db().rpc("finish_workout", { p_date: v.date, p_effort: v.effort, p_note: v.note }); if (error) throw error; },
    onSuccess: (_d, v) => { toast("¡Entrenamiento guardado! Buen trabajo."); qc.invalidateQueries({ queryKey: ["logs", clientId] }); notifyActivity(v.date); },
    onError: () => toast("No pudimos guardar tu entrenamiento. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}

// ---- Revisión del coach (dashboard y ficha) ----
export type RecentLog = { id: string; clientId: string; clientName: string; date: string; routine: string | null; effort: number | null; completed: boolean; completedAt: string | null; seen: boolean };
type RecentRaw = { id: string; client_id: string; log_date: string; effort: number | null; completed_at: string | null; coach_seen_at: string | null; plan_days: { name: string } | null; clients: { profiles: { full_name: string } | null } | null };
export const fetchRecentLogs = async (): Promise<RecentLog[]> => {
  const since = new Date(); since.setDate(since.getDate() - 21);
  const { data, error } = await db().from("workout_logs").select("id,client_id,log_date,effort,completed_at,coach_seen_at,plan_days(name),clients(profiles(full_name))").gte("log_date", localDate(since)).order("log_date", { ascending: false }).limit(300);
  if (error) throw error;
  return (data as unknown as RecentRaw[]).map((l) => ({ id: l.id, clientId: l.client_id, clientName: l.clients?.profiles?.full_name || "Cliente", date: l.log_date, routine: l.plan_days?.name ?? null, effort: l.effort, completed: !!l.completed_at, completedAt: l.completed_at, seen: !!l.coach_seen_at }));
};
export const useRecentLogs = () => useQuery({ queryKey: ["recent-logs"], staleTime: 30_000, queryFn: fetchRecentLogs });
export const fetchActivePlanClients = async (): Promise<string[]> => {
  const { data, error } = await db().from("training_plans").select("client_id").eq("status", "active"); if (error) throw error; return (data as unknown as { client_id: string }[]).map((r) => r.client_id);
};
export const useActivePlanClients = () => useQuery({ queryKey: ["active-plan-clients"], staleTime: 60_000, queryFn: fetchActivePlanClients });
export type ClientLog = { id: string; date: string; routine: string | null; effort: number | null; note: string | null; completed: boolean; seen: boolean; comment: string | null; commentAudio: string | null; commentImage?: string | null; commentVideo?: string | null; clientSaw?: boolean; sets: { exercise: string; n: number; reps: number | null; weight: number | null; itemId: string | null; warmup: boolean }[] };
type ClientLogRaw = { id: string; log_date: string; effort: number | null; note: string | null; completed_at: string | null; coach_seen_at: string | null; coach_comment: string | null; coach_comment_audio: string | null; coach_comment_image?: string | null; coach_comment_video?: string | null; feedback_seen_at?: string | null; plan_days: { name: string } | null; set_logs: { exercise_name: string; set_number: number; reps: number | null; weight: number | null; plan_item_id: string | null; kind: string }[] };
export const useClientLogs = (clientId: string) => useQuery({ queryKey: ["client-logs", clientId], staleTime: 30_000, queryFn: async (): Promise<ClientLog[]> => {
  const q = (extra: string) => db().from("workout_logs").select(`id,log_date,effort,note,completed_at,coach_seen_at,coach_comment,coach_comment_audio${extra},feedback_seen_at,plan_days(name),set_logs(exercise_name,set_number,reps,weight,plan_item_id,kind)`).eq("client_id", clientId).order("log_date", { ascending: false }).limit(15);
  let { data, error } = await q(",coach_comment_image,coach_comment_video");
  if (error && missingColumn(error)) ({ data, error } = await q(""));   // base sin la 0041
  if (error) throw error;
  return (data as unknown as ClientLogRaw[]).map((l) => ({ id: l.id, date: l.log_date, routine: l.plan_days?.name ?? null, effort: l.effort, note: l.note, completed: !!l.completed_at, seen: !!l.coach_seen_at, comment: l.coach_comment, commentAudio: l.coach_comment_audio, commentImage: l.coach_comment_image ?? null, commentVideo: l.coach_comment_video ?? null, clientSaw: !!l.feedback_seen_at && !!l.coach_seen_at && l.feedback_seen_at >= l.coach_seen_at, sets: l.set_logs.map((x) => ({ exercise: x.exercise_name, n: x.set_number, reps: x.reps, weight: x.weight, itemId: x.plan_item_id, warmup: x.kind === "warmup" })) }));
} });
export const notifyFeedback = (logId: string) => { void fetch("/api/push/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logId }) }).catch(() => {}); };
export function useReviewWorkout(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    // 0041: la respuesta también puede llevar foto y vídeo (media = true los guarda; null = quitar). notify = false cuando el vídeo
    // aún se está subiendo: la notificación sale cuando termina (así al cliente no le llegan dos).
    mutationFn: async (v: { id: string; comment: string; audio?: string | null; image?: string | null; video?: string | null; media?: boolean; notify?: boolean }) => {
      const { error } = await db().rpc("review_workout", v.media ? { p_log: v.id, p_comment: v.comment, p_audio: v.audio ?? null, p_image: v.image ?? null, p_video: v.video ?? null, p_media: true } : { p_log: v.id, p_comment: v.comment, p_audio: v.audio ?? null }); if (error) throw error;
      // Si Jeff dejó algo (texto, audio, foto o vídeo), al cliente le llega "Jeff respondió a tu entrenamiento" (la base decide si toca).
      if (v.notify !== false && (v.comment.trim() || v.audio || v.image || v.video)) notifyFeedback(v.id);
    },
    onSuccess: () => { toast("Revisión guardada"); qc.invalidateQueries({ queryKey: ["client-logs", clientId] }); qc.invalidateQueries({ queryKey: ["recent-logs"] }); },
    onError: () => toast("No pudimos guardar la revisión. Inténtalo de nuevo.", true),
  });
}

// ---- Progreso (mediciones y fotos) ----
export type Measure = { id: string; date: string; weight: number | null; waist: number | null; hip: number | null; chest: number | null; arm: number | null; thigh: number | null; by: "client" | "coach" };
type MeasureRaw = { id: string; measured_on: string; weight_kg: number | null; waist_cm: number | null; hip_cm: number | null; chest_cm: number | null; arm_cm: number | null; thigh_cm: number | null; recorded_by: "client" | "coach" };
export const fetchMeasures = async (clientId: string): Promise<Measure[]> => {
  const { data, error } = await db().from("measurements").select("id,measured_on,weight_kg,waist_cm,hip_cm,chest_cm,arm_cm,thigh_cm,recorded_by").eq("client_id", clientId).order("measured_on", { ascending: true });
  if (error) throw error;
  return (data as unknown as MeasureRaw[]).map((m) => ({ id: m.id, date: m.measured_on, weight: m.weight_kg, waist: m.waist_cm, hip: m.hip_cm, chest: m.chest_cm, arm: m.arm_cm, thigh: m.thigh_cm, by: m.recorded_by }));
};
export const useMeasures = (clientId: string) => useQuery({ queryKey: ["measures", clientId], staleTime: 60_000, enabled: !!clientId, queryFn: () => fetchMeasures(clientId) });
export type MeasureInput = Partial<Record<"weight" | "waist" | "hip" | "chest" | "arm" | "thigh", number>>;
export function useSaveMeasure(clientId: string, workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: MeasureInput) => {
      const row: Record<string, unknown> = { workspace_id: workspaceId, client_id: clientId, measured_on: localDate(), recorded_by: "client" };
      const col = { weight: "weight_kg", waist: "waist_cm", hip: "hip_cm", chest: "chest_cm", arm: "arm_cm", thigh: "thigh_cm" } as const;
      (Object.keys(v) as (keyof MeasureInput)[]).forEach((k) => { if (v[k] != null) row[col[k]] = v[k]; });
      const { error } = await db().from("measurements").upsert(row, { onConflict: "client_id,measured_on" }); if (error) throw error;
    },
    onSuccess: () => { toast("Medición guardada"); qc.invalidateQueries({ queryKey: ["measures", clientId] }); },
    onError: () => toast("No pudimos guardar la medición. Revisa los valores e inténtalo de nuevo.", true),
  });
}
export type Photo = { id: string; date: string; url: string | null; path: string };
export const usePhotos = (clientId: string) => useQuery({ queryKey: ["photos", clientId], staleTime: 30 * 60_000, enabled: !!clientId, queryFn: async (): Promise<Photo[]> => {
  const { data, error } = await db().from("progress_photos").select("id,taken_on,storage_path").eq("client_id", clientId).order("taken_on", { ascending: true }); if (error) throw error;
  const rows = data as unknown as { id: string; taken_on: string; storage_path: string }[];
  if (!rows.length) return [];
  const { data: urls } = await db().storage.from("progress-photos").createSignedUrls(rows.map((r) => r.storage_path), 3600);
  return rows.map((r) => ({ id: r.id, date: r.taken_on, url: (urls as { path: string | null; signedUrl: string }[] | null)?.find((u) => u.path === r.storage_path)?.signedUrl ?? null, path: r.storage_path }));
} });
export function useUploadPhoto(clientId: string, workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (blob: Blob) => {
      const path = `${workspaceId}/${clientId}/${crypto.randomUUID()}.jpg`;
      const up = await db().storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg" }); if (up.error) throw up.error;
      const { error } = await db().from("progress_photos").insert({ workspace_id: workspaceId, client_id: clientId, taken_on: localDate(), storage_path: path });
      if (error) { await db().storage.from("progress-photos").remove([path]); throw error; }
    },
    // La foto aparece al instante (vista previa local) mientras sube; al terminar se reemplaza por la guardada.
    onMutate: async (blob) => { const key = ["photos", clientId]; await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<unknown[]>(key); qc.setQueryData<unknown[]>(key, (l = []) => [...l, { id: "tmp-upload", date: localDate(), url: URL.createObjectURL(blob), path: "" }]); return { prev }; },
    onSuccess: () => { toast("Foto guardada"); },
    onError: (_e, _b, ctx) => { if (ctx) qc.setQueryData(["photos", clientId], ctx.prev); toast("No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.", true); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["photos", clientId] }),
  });
}
export function useDeletePhoto(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["photos", clientId];
  return useMutation({
    mutationFn: async (p: { id: string; path: string }) => {
      const rm = await db().storage.from("progress-photos").remove([p.path]); if (rm.error) throw rm.error; // primero el archivo: así no queda ninguno huérfano al que el coach aún pueda acceder
      const { error } = await db().from("progress_photos").delete().eq("id", p.id); if (error) throw error;
    },
    onMutate: async (p) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<Photo[]>(key); qc.setQueryData<Photo[]>(key, (l) => l?.filter((x) => x.id !== p.id)); return { prev }; },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos borrar la foto. Inténtalo de nuevo.", true); },
    onSuccess: () => toast("Foto eliminada"),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
export function useGiveConsent(profileId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async () => { const { error } = await db().rpc("give_image_consent"); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["consent", profileId] }) });
}
export const useConsent = (profileId: string) => useQuery({ queryKey: ["consent", profileId], staleTime: 300_000, enabled: !!profileId, queryFn: async () => {
  const { data, error } = await db().from("clients").select("image_consent_at").eq("profile_id", profileId).maybeSingle(); if (error) throw error; return !!data?.image_consent_at;
} });

// ---- Agenda ----
export const KIND_LABEL: Record<string, string> = { initial: "Llamada inicial", followup: "Seguimiento" };
export const KIND_COLOR: Record<string, string> = { initial: "#F7254B", followup: "#B08A3E" };
const AG_ERR: Record<string, string> = {
  slot_taken: "Ese horario acaba de ser reservado por otra persona. Elige otro.", slot_unavailable: "Ese horario ya no está disponible. Elige otro.",
  already_has_booking: "Ya tienes una sesión reservada. Si quieres cambiarla, escríbele a Jeff.", too_late: "Faltan menos de 24 horas: escribe a tu coach para cambiarla.",
  cancel_closed: "Ya pasaron los 10 minutos para cancelar. Escríbele a Jeff para cambiarla.",
  not_active: "Tu cuenta aún no está activa.", has_booking: "Ese hueco tiene una reserva: primero cancela la reserva.",
};
export const agendaError = (e: unknown) => { const m = (e as { message?: string })?.message ?? ""; const k = Object.keys(AG_ERR).find((x) => m.includes(x)); return k ? AG_ERR[k] : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo."; };
export function weekBounds(offset: number) {
  const t = new Date(); t.setHours(0, 0, 0, 0); const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7) + offset * 7);
  const next = new Date(mon); next.setDate(mon.getDate() + 7); return { from: mon, to: next };
}
export type Slot = { id: string; startsAt: string; duration: number; kind: string; taken: boolean; mine: boolean; capacity: number; booked: number };
export const useOpenSlots = (offset: number) => useQuery({ queryKey: ["open-slots", offset], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<Slot[]> => {
  const { from, to } = weekBounds(offset);
  const { data, error } = await db().rpc("list_open_slots", { p_from: from.toISOString(), p_to: to.toISOString() }); if (error) throw error;
  return (data as { id: string; starts_at: string; duration_min: number; kind: string; taken: boolean; mine: boolean; capacity: number; booked: number }[]).map((s) => ({ id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, taken: s.taken, mine: s.mine, capacity: s.capacity, booked: s.booked }));
} });
// createdAt y bookedBy (29-oct): el cliente puede cancelar solo en los 10 min siguientes a reservar lo que reservó él.
export type MyBooking = { id: string; startsAt: string; duration: number; kind: string; createdAt?: string; bookedBy?: string };
export const CANCEL_WINDOW_MS = 10 * 60_000;
export const sessionEnded = (b: { startsAt: string; duration: number }, now = new Date()) => new Date(b.startsAt).getTime() + b.duration * 60_000 <= now.getTime();
// Lo que ya terminó NO es "próxima sesión" aunque la pantalla lleve horas abierta: filtrar con la hora actual (useNow) al pintar.
export const upcomingOnly = <T extends { startsAt: string; duration: number }>(l: T[] | undefined, now = new Date()) => (l ?? []).filter((b) => !sessionEnded(b, now));
export const useMyBookings = (clientId: string) => useQuery({ queryKey: ["my-bookings", clientId], staleTime: 20_000, enabled: !!clientId, queryFn: async (): Promise<MyBooking[]> => {
  const { data, error } = await db().from("bookings").select("id,created_at,booked_by,availability_slots(starts_at,duration_min,kind)").eq("client_id", clientId).eq("status", "confirmed"); if (error) throw error;
  return (data as unknown as { id: string; created_at: string; booked_by: string; availability_slots: { starts_at: string; duration_min: number; kind: string } | null }[])
    .filter((b) => b.availability_slots && !sessionEnded({ startsAt: b.availability_slots.starts_at, duration: b.availability_slots.duration_min }))
    .map((b) => ({ id: b.id, startsAt: b.availability_slots!.starts_at, duration: b.availability_slots!.duration_min, kind: b.availability_slots!.kind, createdAt: b.created_at, bookedBy: b.booked_by }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
} });
// Sesiones que Jeff le canceló al cliente en los últimos 7 días (aviso en Hoy aunque no le haya llegado la notificación).
export type CoachCancel = { id: string; startsAt: string; reason: string | null; at: string };
export const useCoachCancels = (clientId: string) => useQuery({ queryKey: ["coach-cancels", clientId], staleTime: 60_000, enabled: !!clientId, queryFn: async (): Promise<CoachCancel[]> => {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const q = (cols: string) => db().from("bookings").select(cols).eq("client_id", clientId).eq("status", "cancelled").eq("cancelled_by", "coach").gte("cancelled_at", since).order("cancelled_at", { ascending: false });
  let { data, error } = await q("id,cancelled_at,cancel_reason,availability_slots(starts_at)");
  if (error && missingColumn(error)) ({ data, error } = await q("id,cancelled_at,availability_slots(starts_at)"));
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; cancelled_at: string; cancel_reason?: string | null; availability_slots: { starts_at: string } | null }[])
    .filter((b) => b.availability_slots && new Date(b.availability_slots.starts_at).getTime() > Date.now() - 86_400_000)
    .map((b) => ({ id: b.id, startsAt: b.availability_slots!.starts_at, reason: b.cancel_reason ?? null, at: b.cancelled_at }));
} });
// Primera llamada (decisión de Cristian, 27-oct): todo cliente agenda primero una llamada con Jeff; su rutina y nutrición llegan después.
// any = ya tuvo o tiene una sesión (confirmada o hecha); next = la próxima confirmada.
export type FirstCall = { any: boolean; next: { startsAt: string } | null };
export const useFirstCall = (clientId: string) => useQuery({ queryKey: ["first-call", clientId], staleTime: 30_000, enabled: !!clientId, queryFn: async (): Promise<FirstCall> => {
  const { data, error } = await db().from("bookings").select("status,availability_slots(starts_at)").eq("client_id", clientId).in("status", ["confirmed", "completed"]); if (error) throw error;
  const rows = data as unknown as { status: string; availability_slots: { starts_at: string } | null }[];
  const next = rows.filter((b) => b.status === "confirmed" && b.availability_slots && new Date(b.availability_slots.starts_at) > new Date()).map((b) => b.availability_slots!.starts_at).sort()[0];
  return { any: rows.length > 0, next: next ? { startsAt: next } : null };
} });
function useAgendaInvalidate() { const qc = useQueryClient(); return () => ["open-slots", "my-bookings", "coach-slots", "first-call", "client-bookings", "coach-attention"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export function useBookSlot() {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (slotId: string) => { const { error } = await db().rpc("book_slot", { p_slot: slotId }); if (error) throw error; },
    onSuccess: () => toast("¡Sesión reservada!"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}
export function useCancelBooking() {
  const toast = useToast(), inv = useAgendaInvalidate();
  // reason: motivo de Jeff para el cliente (0041); se guarda en la reserva y sale en la notificación y en la pantalla Hoy del cliente.
  return useMutation({ mutationFn: async (v: string | { id: string; reason?: string }) => { const id = typeof v === "string" ? v : v.id, reason = typeof v === "string" ? "" : v.reason?.trim() ?? "";
      const { error } = await db().rpc("cancel_booking", reason ? { p_booking: id, p_reason: reason } : { p_booking: id }); if (error) throw error; },
    onSuccess: () => toast("Sesión cancelada"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}
export type ClientBookingRow = { id: string; startsAt: string; duration: number; kind: string; status: string; capacity: number; bookedBy?: string };
export const useClientBookings = (clientId: string) => useQuery({ queryKey: ["client-bookings", clientId], staleTime: 30_000, enabled: !!clientId, queryFn: async (): Promise<ClientBookingRow[]> => {
  const { data, error } = await db().from("bookings").select("id,status,booked_by,availability_slots(starts_at,duration_min,kind,capacity)").eq("client_id", clientId); if (error) throw error;
  return (data as unknown as { id: string; status: string; booked_by: string; availability_slots: { starts_at: string; duration_min: number; kind: string; capacity: number } | null }[]).filter((b) => b.availability_slots)
    .map((b) => ({ id: b.id, status: b.status, bookedBy: b.booked_by, startsAt: b.availability_slots!.starts_at, duration: b.availability_slots!.duration_min, kind: b.availability_slots!.kind, capacity: b.availability_slots!.capacity })).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
} });
export type CoachBooking = { id: string; clientName: string; by: string };
export type CoachSlot = { id: string; startsAt: string; duration: number; kind: string; capacity: number; bookings: CoachBooking[]; booking: CoachBooking | null };
export const useCoachSlots = (offset: number) => useQuery({ queryKey: ["coach-slots", offset], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<CoachSlot[]> => {
  const { from, to } = weekBounds(offset);
  const { data, error } = await db().from("availability_slots").select("id,starts_at,duration_min,kind,capacity,bookings(id,status,booked_by,clients(profiles(full_name)))").eq("status", "open").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at"); if (error) throw error;
  type Raw = { id: string; starts_at: string; duration_min: number; kind: string; capacity: number; bookings: { id: string; status: string; booked_by: string; clients: { profiles: { full_name: string } | null } | null }[] };
  return (data as unknown as Raw[]).map((s) => { const bs = s.bookings.filter((x) => x.status === "confirmed").map((b) => ({ id: b.id, clientName: b.clients?.profiles?.full_name || "Cliente", by: b.booked_by }));
    return { id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, capacity: s.capacity, bookings: bs, booking: bs[0] ?? null }; });
} });
export function usePublishSlots(workspaceId: string) {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (v: { starts: string[]; duration: number; kind: string; capacity: number }) => {
      const { error } = await db().from("availability_slots").upsert(v.starts.map((s) => ({ workspace_id: workspaceId, starts_at: s, duration_min: v.duration, kind: v.kind, capacity: v.capacity })), { onConflict: "workspace_id,starts_at", ignoreDuplicates: true }); if (error) throw error; },
    onSuccess: () => toast("Disponibilidad publicada"), onError: () => toast("No pudimos publicar los horarios. Revisa los datos e inténtalo de nuevo.", true), onSettled: inv });
}
export function useRemoveSlot() {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().from("availability_slots").update({ status: "cancelled" }).eq("id", id); if (error) throw error; },
    onSuccess: () => toast("Horario quitado"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}
export function useCoachBook() {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (v: { slotId: string; clientId: string }) => { const { error } = await db().rpc("coach_book_slot", { p_slot: v.slotId, p_client: v.clientId }); if (error) throw error; },
    onSuccess: () => toast("Cliente agendado"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}

// ---- Material educativo ----
export const MAT_CATS = ["Técnica", "Nutrición", "Movilidad", "Recuperación", "Motivación"];
export type FeaturedPeriod = "day" | "week";
export type CoachMaterial = { id: string; kind: "video" | "article"; title: string; category: string; body: string | null; videoRef: string | null; privateVideo: boolean; tier: "basic" | "full"; featured: boolean; featuredPeriod: FeaturedPeriod; featuredUntil: string | null; published: boolean; date: string; views: number; poster?: string | null };
const bogotaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
export const useCoachMaterials = () => useQuery({ queryKey: ["coach-materials"], staleTime: 30_000, queryFn: async (): Promise<CoachMaterial[]> => {
  const q = (extra: string) => db().from("materials").select(`id,kind,title,category,body,video_ref,video_id,tier,is_featured,featured_period,featured_until,published,published_on${extra},material_views(count)`).order("published_on", { ascending: false }).order("created_at", { ascending: false });
  let { data, error } = await q(",poster");
  if (error && missingColumn(error)) ({ data, error } = await q(""));   // base sin la 0041
  if (error) throw error;
  type Raw = { id: string; kind: "video" | "article"; title: string; category: string; body: string | null; video_ref: string | null; video_id: string | null; tier: "basic" | "full"; is_featured: boolean; featured_period: FeaturedPeriod; featured_until: string | null; published: boolean; published_on: string; poster?: string | null; material_views: { count: number }[] };
  const today = bogotaToday();
  return (data as unknown as Raw[]).map((m) => ({ id: m.id, kind: m.kind, title: m.title, category: m.category, body: m.body, videoRef: m.video_ref, privateVideo: !!m.video_id, tier: m.tier,
    featured: m.is_featured && (!m.featured_until || m.featured_until >= today), featuredPeriod: m.featured_period ?? "week", featuredUntil: m.featured_until, published: m.published, date: m.published_on, views: m.material_views?.[0]?.count ?? 0, poster: m.poster ?? null }));
} });
// file: vídeo privado nuevo (Bunny). Se guarda como borrador, se sube en segundo plano y al terminar se engancha y se publica (0035).
export type MaterialInput = { id?: string; kind: "video" | "article"; title: string; category: string; body: string; videoRef: string; tier: "basic" | "full"; published: boolean; file?: File | null; keepPrivate?: boolean; feature?: FeaturedPeriod; poster?: string | null };
export function useSaveMaterial(workspaceId: string) {
  const qc = useQueryClient(), toast = useToast(), upload = useBackgroundUpload();
  return useMutation({
    mutationFn: async (v: MaterialInput) => {
      const priv = v.kind === "video" && (!!v.file || !!v.keepPrivate);
      const row: Record<string, unknown> = { title: v.title.trim(), kind: v.kind, category: v.category, tier: v.tier, published: v.file ? false : v.published, body: v.kind === "article" ? v.body.trim() : null };
      if (v.kind !== "video" || !priv) { row.video_ref = v.kind === "video" ? v.videoRef : null; row.video_id = null; }
      // Portada difuminada (0041): la del vídeo nuevo; un vídeo de YouTube usa la miniatura de YouTube (no se guarda).
      if (v.poster !== undefined) row.poster = v.poster;
      const write = (r: Record<string, unknown>) => (v.id ? db().from("materials").update(r).eq("id", v.id).select("id").single() : db().from("materials").insert({ ...r, workspace_id: workspaceId }).select("id").single());
      let res = await write(row);
      if (res.error && "poster" in row && missingColumn(res.error)) { delete row.poster; res = await write(row); }   // base sin la 0041
      if (res.error) throw res.error;
      const id = (res.data as { id: string }).id;
      if (v.file) upload({ file: v.file, label: `Vídeo "${v.title.trim().slice(0, 28)}"`, opts: { purpose: "material" }, finish: async (vid, q) => {
        const { error } = await db().rpc("attach_material_video", { p_material: id, p_video: vid, p_publish: v.published }); if (error) throw error;
        // Vídeo del día / de la semana: se destaca en Hoy apenas termina de subir.
        if (v.feature) { const f = await db().rpc("set_featured_material", { p_id: id, p_on: true, p_period: v.feature }); if (f.error) throw f.error; }
        void q.invalidateQueries({ queryKey: ["coach-materials"] });
      } });
      else if (v.feature) { const f = await db().rpc("set_featured_material", { p_id: id, p_on: true, p_period: v.feature }); if (f.error) throw f.error; }
    },
    onSuccess: (_d, v) => toast(v.file ? (v.feature ? `Guardado. El vídeo se está subiendo; al terminar sale en Hoy como ${v.feature === "day" ? "vídeo del día" : "vídeo de la semana"}.` : "Guardado. El vídeo se está subiendo; se publica solo al terminar.") : v.feature ? `Listo: ya sale en Hoy como ${v.feature === "day" ? "vídeo del día" : "vídeo de la semana"}.` : v.id ? "Contenido actualizado" : "Contenido publicado"),
    onError: () => toast("No pudimos guardar el contenido. Revisa los datos e inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["coach-materials"] }),
  });
}
export function useDeleteMaterial() {
  const qc = useQueryClient(), toast = useToast();
  // Se confirma que de verdad se borró (antes, si la base no borraba nada, igual decía "eliminado").
  return useMutation({ mutationFn: async (id: string) => { const { data, error } = await db().from("materials").delete().eq("id", id).select("id"); if (error) throw error; if (!data?.length) throw new Error("not_deleted"); },
    onMutate: async (id) => { await qc.cancelQueries({ queryKey: ["coach-materials"] }); const prev = qc.getQueryData<CoachMaterial[]>(["coach-materials"]); qc.setQueryData<CoachMaterial[]>(["coach-materials"], (l) => l?.filter((m) => m.id !== id)); return { prev }; },
    onSuccess: () => toast("Contenido eliminado"), onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["coach-materials"], ctx.prev); toast("No pudimos eliminarlo. Inténtalo de nuevo.", true); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["coach-materials"] }); void qc.invalidateQueries({ queryKey: ["materials"] }); } });
}
export function useFeatureMaterial() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({ mutationFn: async (v: { id: string; on: boolean; period?: FeaturedPeriod }) => { const { error } = await db().rpc("set_featured_material", { p_id: v.id, p_on: v.on, p_period: v.period ?? "week" }); if (error) throw error; },
    onSuccess: (_d, v) => toast(!v.on ? "Ya no hay vídeo destacado" : v.period === "day" ? "Listo: es el vídeo del día. Se ve en Hoy hasta la medianoche." : "Listo: es el vídeo de la semana. Se ve en Hoy durante 7 días."),
    onError: (e) => toast((e as { message?: string })?.message?.includes("not_featurable") ? "Solo un vídeo publicado y de acceso para todos los planes se puede destacar." : "No pudimos destacarlo. Inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["coach-materials"] }) });
}
export type MaterialItem = { id: string; kind: "video" | "article"; title: string; category: string; tier: string; date: string; featured: boolean; featuredPeriod: FeaturedPeriod; privateVideo: boolean; unlocked: boolean; isNew: boolean; poster?: string | null; videoRef?: string | null };
export const useMaterialList = () => useQuery({ queryKey: ["materials"], staleTime: 60_000, queryFn: async (): Promise<MaterialItem[]> => {
  const { data, error } = await db().rpc("list_materials"); if (error) throw error;
  return (data as { id: string; kind: "video" | "article"; title: string; category: string; tier: string; published_on: string; is_featured: boolean; unlocked: boolean; is_new: boolean; featured_period?: FeaturedPeriod; private_video?: boolean; poster?: string | null; video_ref?: string | null }[])
    .map((m) => ({ id: m.id, kind: m.kind, title: m.title, category: m.category, tier: m.tier, date: m.published_on, featured: m.is_featured, featuredPeriod: m.featured_period ?? "week", privateVideo: !!m.private_video, unlocked: m.unlocked, isNew: m.is_new, poster: m.poster ?? null, videoRef: m.video_ref ?? null }));
} });
export type MaterialOpen = { id: string; kind: "video" | "article"; title: string; category: string; body: string | null; videoRef: string | null; privateVideo: boolean; date: string };
export function useOpenMaterial() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (id: string): Promise<MaterialOpen> => {
      const { data, error } = await db().rpc("open_material", { p_id: id }); if (error) throw error;
      const m = (data as { id: string; kind: "video" | "article"; title: string; category: string; body: string | null; video_ref: string | null; published_on: string; private_video?: boolean }[])[0];
      return { id: m.id, kind: m.kind, title: m.title, category: m.category, body: m.body, videoRef: m.video_ref, privateVideo: !!m.private_video, date: m.published_on };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
    onError: (e) => toast((e as { message?: string })?.message?.includes("locked") ? "Este contenido no está incluido en tu plan." : "No pudimos abrir el contenido. Inténtalo de nuevo.", true),
  });
}

// ---- Anuncios a todos y notas privadas ----
export type Announcement = { id: string; title: string | null; body: string; pinned: boolean; createdAt: string; expiresOn?: string | null };
export const useCoachAnnouncements = () => useQuery({ queryKey: ["coach-announcements"], staleTime: 30_000, queryFn: async (): Promise<Announcement[]> => {
  const { data, error } = await db().from("announcements").select("id,title,body,pinned,created_at,expires_on").order("pinned", { ascending: false }).order("created_at", { ascending: false }); if (error) throw error;
  return (data as { id: string; title: string | null; body: string; pinned: boolean; created_at: string; expires_on: string | null }[]).map((a) => ({ id: a.id, title: a.title, body: a.body, pinned: a.pinned, createdAt: a.created_at, expiresOn: a.expires_on }));
} });
export function useSaveAnnouncement(workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { title: string; body: string; pinned: boolean; expiresOn: string }) => {
      const { error } = await db().from("announcements").insert({ workspace_id: workspaceId, title: v.title.trim() || null, body: v.body.trim(), pinned: v.pinned, expires_on: v.expiresOn || null }); if (error) throw error; },
    onSuccess: () => toast("Anuncio publicado"), onError: () => toast("No pudimos publicar el anuncio. Revisa el texto (máx. 1000 caracteres).", true),
    onSettled: () => qc.invalidateQueries({ queryKey: ["coach-announcements"] }) });
}
export function useDeleteAnnouncement() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => toast("Anuncio eliminado"), onError: () => toast("No pudimos eliminarlo. Inténtalo de nuevo.", true), onSettled: () => qc.invalidateQueries({ queryKey: ["coach-announcements"] }) });
}
export const useMyAnnouncements = (enabled: boolean) => useQuery({ queryKey: ["announcements"], staleTime: 60_000, enabled, queryFn: async (): Promise<Announcement[]> => {
  const { data, error } = await db().rpc("list_announcements"); if (error) throw error;
  return (data as { id: string; title: string | null; body: string; pinned: boolean; created_at: string }[]).map((a) => ({ id: a.id, title: a.title, body: a.body, pinned: a.pinned, createdAt: a.created_at }));
} });
export type Note = { id: string; body: string; createdAt: string };
export const useNotes = (clientId: string) => useQuery({ queryKey: ["notes", clientId], staleTime: 30_000, enabled: !!clientId, queryFn: async (): Promise<Note[]> => {
  const { data, error } = await db().from("client_notes").select("id,body,created_at").eq("client_id", clientId).order("created_at", { ascending: false }); if (error) throw error;
  return (data as { id: string; body: string; created_at: string }[]).map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at }));
} });
export function useAddNote(clientId: string, workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({ mutationFn: async (body: string) => { const { error } = await db().from("client_notes").insert({ workspace_id: workspaceId, client_id: clientId, body: body.trim() }); if (error) throw error; },
    onSuccess: () => toast("Nota guardada"), onError: () => toast("No pudimos guardar la nota. Inténtalo de nuevo.", true), onSettled: () => qc.invalidateQueries({ queryKey: ["notes", clientId] }) });
}
export function useDeleteNote(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["notes", clientId];
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().from("client_notes").delete().eq("id", id); if (error) throw error; },
    onMutate: async (id) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<Note[]>(key); qc.setQueryData<Note[]>(key, (l) => l?.filter((n) => n.id !== id)); return { prev }; },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos borrar la nota.", true); }, onSettled: () => qc.invalidateQueries({ queryKey: key }) });
}

// ---- Reporte diario ----
export const useVideoEnabled = () => useQuery({ queryKey: ["video-enabled"], staleTime: 600_000, queryFn: async (): Promise<boolean> => {
  const r = await fetch("/api/video/config"); if (!r.ok) return false; return !!((await r.json()) as { enabled?: boolean }).enabled;
} });
export type MyReport = { id: string; date: string; comment: string | null; hasVideo: boolean; seen: boolean };
export const useTodayReport = (clientId: string, date: string, enabled = true) => useQuery({ queryKey: ["report", clientId, date], staleTime: 30_000, enabled: !!clientId && enabled, queryFn: async (): Promise<MyReport | null> => {
  const { data, error } = await db().from("daily_reports").select("id,report_date,comment,video_state,coach_seen_at").eq("client_id", clientId).eq("report_date", date).maybeSingle(); if (error) throw error;
  return data ? { id: data.id, date: data.report_date, comment: data.comment, hasVideo: data.video_state !== "none", seen: !!data.coach_seen_at } : null;
} });
const REPORT_ERR: Record<string, string> = { already_reviewed: "Tu coach ya revisó este reporte; no se puede cambiar.", bad_date: "La fecha del reporte no es válida.", not_allowed: "Tu plan no incluye el reporte diario." };
export const reportError = (e: unknown) => { const m = (e as { message?: string })?.message ?? ""; const k = Object.keys(REPORT_ERR).find((x) => m.includes(x)); return k ? REPORT_ERR[k] : "No pudimos enviar tu reporte. Revisa tu conexión e inténtalo de nuevo."; };
export function useSubmitReport(clientId: string, date: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({ mutationFn: async (v: { comment: string; videoId: string | null }) => { const { error } = await db().rpc("submit_report", { p_date: date, p_comment: v.comment, p_video_id: v.videoId }); if (error) throw error; },
    onSuccess: () => toast("¡Reporte enviado!"), onError: (e) => toast(reportError(e), true), onSettled: () => qc.invalidateQueries({ queryKey: ["report", clientId, date] }) });
}
export type CoachReport = { id: string; clientId: string; clientName: string; date: string; comment: string | null; videoState: "none" | "uploaded" | "deleted"; seen: boolean; sentAt: string; deleteAfter: string | null };
// Texto de cuándo se borra el vídeo (migración 0033: 32 h sin verlo, 12 h después de verlo).
export function videoExpiry(r: CoachReport): string | null {
  if (r.videoState !== "uploaded" || !r.deleteAfter) return null;
  const h = Math.ceil((new Date(r.deleteAfter).getTime() - Date.now()) / 3600000);
  const when = h <= 1 ? "en menos de 1 h" : `en ${h} h`;
  return r.seen ? `El vídeo se borra ${when}.` : `Si no lo ves, el vídeo se borra solo ${when}.`;
}
export const useCoachReports = (enabled = true) => useQuery({ queryKey: ["coach-reports"], staleTime: 20_000, refetchInterval: 60_000, enabled, queryFn: async (): Promise<CoachReport[]> => {
  const since = new Date(); since.setDate(since.getDate() - 14);
  const { data, error } = await db().from("daily_reports").select("id,client_id,report_date,comment,video_state,coach_seen_at,created_at,delete_after,clients(profiles(full_name))").gte("report_date", localDate(since)).order("report_date", { ascending: false }).order("created_at", { ascending: false }); if (error) throw error;
  type Raw = { id: string; client_id: string; report_date: string; comment: string | null; video_state: "none" | "uploaded" | "deleted"; coach_seen_at: string | null; created_at: string; delete_after: string | null; clients: { profiles: { full_name: string } | null } | null };
  return (data as unknown as Raw[]).map((r) => ({ id: r.id, clientId: r.client_id, clientName: r.clients?.profiles?.full_name || "Cliente", date: r.report_date, comment: r.comment, videoState: r.video_state, seen: !!r.coach_seen_at, sentAt: r.created_at, deleteAfter: r.delete_after }));
} });
export function useReviewReport() {
  const qc = useQueryClient(), toast = useToast(), key = ["coach-reports"];
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().rpc("review_report", { p_id: id }); if (error) throw error; },
    onMutate: async (id) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<CoachReport[]>(key); const r = prev?.find((x) => x.id === id);
      qc.setQueryData<CoachReport[]>(key, (l) => l?.map((x) => (x.id === id ? { ...x, seen: true, deleteAfter: x.videoState === "uploaded" ? new Date(Math.min(Date.now() + 12 * 3600000, x.deleteAfter ? +new Date(x.deleteAfter) : Infinity)).toISOString() : x.deleteAfter } : x))); return { prev, hadVideo: r?.videoState === "uploaded" }; },
    onSuccess: (_d, _v, ctx) => { if (ctx?.hadVideo) toast("Visto. El vídeo se borrará en las próximas 12 horas."); },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos marcarlo como visto.", true); }, onSettled: () => qc.invalidateQueries({ queryKey: key }) });
}
export async function fetchReportVideoUrl(id: string): Promise<string> {
  const r = await fetch(`/api/video/play?report=${id}`); if (!r.ok) throw new Error("no_video"); return ((await r.json()) as { url: string }).url;
}

// ---- Nutrición (plantillas del coach que se clonan por cliente) ----
export type NutMeal = { id?: string; name: string; content: string; weekday: number | null };   // weekday: 1=lunes … 7=domingo; null = todos los días
export type NutPlan = { id: string; clientId: string | null; name: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; notes: string | null; createdAt: string; meals: NutMeal[] };
type NutRaw = { id: string; client_id: string | null; name: string; kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; notes: string | null; created_at: string; nutrition_meals: { id: string; position: number; name: string; content: string; weekday: number | null }[] };
const NUT_SELECT = "id,client_id,name,kcal,protein_g,carbs_g,fat_g,notes,created_at,nutrition_meals(id,position,name,content,weekday)";
const toNut = (p: NutRaw): NutPlan => ({ id: p.id, clientId: p.client_id, name: p.name, kcal: p.kcal, protein: p.protein_g, carbs: p.carbs_g, fat: p.fat_g, notes: p.notes, createdAt: p.created_at,
  meals: [...(p.nutrition_meals ?? [])].sort((a, b) => a.position - b.position).map((m) => ({ id: m.id, name: m.name, content: m.content, weekday: m.weekday })) });
export const useNutritionTemplates = () => useQuery({ queryKey: ["nutrition-templates"], staleTime: 60_000, queryFn: async (): Promise<NutPlan[]> => {
  const { data, error } = await db().from("nutrition_plans").select(NUT_SELECT).is("client_id", null).order("created_at", { ascending: false }); if (error) throw error; return (data as unknown as NutRaw[]).map(toNut);
} });
// Plan activo de un cliente (el cliente solo puede leer el suyo, y solo si su plan incluye nutrición: lo garantiza la base de datos).
export const useClientNutrition = (clientId: string) => useQuery({ queryKey: ["nutrition", clientId], staleTime: 60_000, enabled: !!clientId, queryFn: async (): Promise<NutPlan | null> => {
  const { data, error } = await db().from("nutrition_plans").select(NUT_SELECT).eq("client_id", clientId).eq("active", true).maybeSingle(); if (error) throw error; return data ? toNut(data as unknown as NutRaw) : null;
} });
export type NutInput = { id?: string; clientId?: string | null; name: string; kcal: string; protein: string; carbs: string; fat: string; notes: string; meals: NutMeal[] };
const num = (s: string) => (s.trim() === "" ? null : Math.round(Number(s)));
function useNutInvalidate() { const qc = useQueryClient(); return () => ["nutrition-templates", "nutrition"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export function useSaveNutrition() {
  const toast = useToast(), inv = useNutInvalidate();
  return useMutation({
    mutationFn: async (v: NutInput) => {
      const { error } = await db().rpc("save_nutrition", { p_id: v.id ?? null, p_client: v.clientId ?? null, p_name: v.name.trim(), p_kcal: num(v.kcal), p_protein: num(v.protein), p_carbs: num(v.carbs), p_fat: num(v.fat), p_notes: v.notes, p_meals: v.meals.filter((m) => m.name.trim() || m.content.trim()).map((m) => ({ name: m.name, content: m.content, weekday: m.weekday })) });
      if (error) throw error;
    },
    onSuccess: () => toast("Plan de nutrición guardado"), onError: () => toast("No pudimos guardar el plan. Revisa los valores (calorías 500–10000) e inténtalo de nuevo.", true), onSettled: inv });
}
export function useAssignNutrition() {
  const toast = useToast(), inv = useNutInvalidate();
  return useMutation({ mutationFn: async (v: { templateId: string; clientId: string }) => { const { error } = await db().rpc("assign_nutrition", { p_template: v.templateId, p_client: v.clientId }); if (error) throw error; },
    onSuccess: () => toast("Plan de nutrición asignado"), onError: () => toast("No pudimos asignar el plan. Inténtalo de nuevo.", true), onSettled: inv });
}
export function useDeleteNutrition() {
  const toast = useToast(), inv = useNutInvalidate();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().from("nutrition_plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => toast("Plan eliminado"), onError: () => toast("No pudimos eliminarlo. Inténtalo de nuevo.", true), onSettled: inv });
}

export function useCompleteOnboarding(profileId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async () => { const { error } = await db().rpc("complete_onboarding"); if (error) throw error; },
    onMutate: () => { qc.setQueryData<Me | null>(["me", profileId], (m) => (m ? { ...m, onboarded: true } : m)); } });   // se cierra al instante; si falla, volverá a mostrarse la próxima vez
}

export function useSetObjective(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({ mutationFn: async (text: string) => { const t = text.trim(); const { error } = await db().from("clients").update({ objective: t || null, objective_at: t ? new Date().toISOString() : null }).eq("id", clientId); if (error) throw error; },
    onSuccess: () => toast("Objetivo guardado"), onError: () => toast("No pudimos guardar el objetivo (máx. 500 caracteres).", true), onSettled: () => qc.invalidateQueries({ queryKey: KEYS.clients }) });
}


// ---- Checks de nutrición del día + actividad para el coach (migración 0025) ----
export type MealProgress = { done: number; total: number; complete: boolean };
export const useMealLogs = (clientId: string, date: string) => useQuery({ queryKey: ["meal-logs", clientId, date], enabled: !!clientId, staleTime: 30_000, queryFn: async (): Promise<string[]> => {
  const { data, error } = await db().from("meal_logs").select("meal_id").eq("client_id", clientId).eq("log_date", date); if (error) throw error; return ((data ?? []) as { meal_id: string }[]).map((r) => r.meal_id);
} });
// Avisa al coach (push) de lo que el cliente acaba de completar. Si falla o no hay push configurado, no pasa nada.
export const notifyActivity = (date: string) => { void fetch("/api/push/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) }).catch(() => {}); };
export function useLogMeal(clientId: string, date: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["meal-logs", clientId, date];
  return useMutation({
    mutationFn: async (v: { mealId: string; done: boolean }): Promise<MealProgress> => { const { data, error } = await db().rpc("log_meal", { p_meal: v.mealId, p_date: date, p_done: v.done }); if (error) throw error; return data as MealProgress; },
    onMutate: async (v) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<string[]>(key) ?? []; qc.setQueryData<string[]>(key, v.done ? (prev.includes(v.mealId) ? prev : prev.concat(v.mealId)) : prev.filter((x) => x !== v.mealId)); return { prev }; },
    onError: (_e, _v, ctx) => { if (ctx) qc.setQueryData(key, ctx.prev); toast("No pudimos guardar la comida. Revisa tu conexión e inténtalo de nuevo.", true); },
    onSuccess: (r, v) => { if (v.done && r.complete) { toast("¡Nutrición del día completada!"); notifyActivity(date); } },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
// Quién completó entrenamiento / nutrición hoy (eventos del día, para las listas del dashboard).
export const useTodayActivity = () => useQuery({ queryKey: ["activity-today"], staleTime: 20_000, refetchInterval: 60_000, queryFn: async () => {
  const { data, error } = await db().from("activity_events").select("client_id,kind,created_at").eq("event_date", localDate()); if (error) throw error;
  return ((data ?? []) as { client_id: string; kind: "training_done" | "nutrition_done" | "day_done"; created_at: string }[]).map((r) => ({ clientId: r.client_id, kind: r.kind, at: r.created_at }));
} });
// Clientes con plan de nutrición activo (para saber a quién le falta la nutrición de hoy).
export const useNutritionClients = () => useQuery({ queryKey: ["nutrition-clients"], staleTime: 60_000, queryFn: async (): Promise<string[]> => {
  const { data, error } = await db().from("nutrition_plans").select("client_id").eq("active", true).not("client_id", "is", null); if (error) throw error;
  return Array.from(new Set(((data ?? []) as { client_id: string }[]).map((r) => r.client_id)));
} });
export type ActivityKind = "training_done" | "nutrition_done" | "day_done";
export type Activity = { id: string; clientId: string; clientName: string; kind: ActivityKind; date: string; at: string; seen: boolean };
export const useActivityFeed = () => useQuery({ queryKey: ["activity"], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<Activity[]> => {
  const { data, error } = await db().rpc("activity_feed", { p_limit: 20 }); if (error) throw error;
  return ((data ?? []) as { id: string; client_id: string; client_name: string; kind: ActivityKind; event_date: string; created_at: string; seen: boolean }[]).map((r) => ({ id: r.id, clientId: r.client_id, clientName: r.client_name, kind: r.kind, date: r.event_date, at: r.created_at, seen: r.seen }));
} });
export const useUnseenActivity = (enabled = true) => useQuery({ queryKey: ["activity-unseen"], staleTime: 20_000, refetchInterval: 60_000, enabled, queryFn: async () => { const { data, error } = await db().rpc("unseen_activity"); if (error) throw error; return Number(data ?? 0); } });
export function useMarkActivitySeen() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async () => { const { error } = await db().rpc("mark_activity_seen"); if (error) throw error; }, onSettled: () => { qc.invalidateQueries({ queryKey: ["activity"] }); qc.invalidateQueries({ queryKey: ["activity-unseen"] }); } });
}
export function useSetPlanInfo(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { planId: string; level: PlanLevel | ""; reason: string; reviewOn: string; note: string }) => { const { error } = await db().rpc("set_plan_info", { p_plan: v.planId, p_level: v.level, p_reason: v.reason, p_review: v.reviewOn || null, p_note: v.note }); if (error) throw error; },
    onSuccess: () => toast("Datos del plan guardados"), onError: () => toast("No pudimos guardar los datos del plan. Inténtalo de nuevo.", true), onSettled: () => qc.invalidateQueries({ queryKey: ["plans-of", clientId] }) });
}

// ---- Avisos rápidos de Jeff (migraciones 0036 y 0037) ----
// El aviso se guarda primero en la base (send_nudge, desde el navegador): así queda aunque falle la notificación del teléfono,
// y el cliente lo ve en su pantalla Hoy. Después se pide la notificación al servidor.
export type { NudgeKind } from "@/lib/nudges";
export const useTodayNudges = () => useQuery({ queryKey: ["nudges"], staleTime: 30_000, refetchInterval: 60_000, queryFn: async (): Promise<string[]> => {
  const { data, error } = await db().from("nudges").select("client_id,kind").eq("day", bogotaDay()); if (error) throw error;
  return ((data ?? []) as { client_id: string; kind: string }[]).map((r) => `${r.client_id}:${r.kind}`);
} });
export function useNudge() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { clientId: string; kind: NudgeKind }) => {
      const { data, error } = await db().rpc("send_nudge", { p_client: v.clientId, p_kind: v.kind });
      if (error) throw new Error(/already_sent/.test(error.message) ? "already_sent" : "failed");
      // El aviso YA quedó guardado (el cliente lo ve en Hoy). La notificación del teléfono se espera máx. 7 s: si tarda, el botón no se queda quieto.
      const push = fetch("/api/push/nudge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nudgeId: data }) })
        .then(async (r) => (r.ok ? ((await r.json().catch(() => ({}))) as { sent?: number }).sent ?? 0 : 0)).catch(() => 0);
      return Promise.race([push, new Promise<number>((res) => setTimeout(() => res(-1), 7000))]);
    },
    onMutate: (v) => { qc.setQueryData<string[]>(["nudges"], (l) => [...(l ?? []), `${v.clientId}:${v.kind}`]); },
    onSuccess: (sent) => toast(sent > 0 ? "Aviso enviado: le llegó al teléfono y lo ve en su pantalla Hoy." : sent < 0 ? "Aviso guardado: lo ve en su pantalla Hoy. La notificación al teléfono sigue enviándose." : "Aviso guardado: lo verá en su pantalla Hoy (su teléfono no tiene avisos activos)."),
    onError: (e) => { if ((e as Error).message === "already_sent") { toast("Ya le avisaste esto hoy."); return; } toast("No pudimos guardar el aviso. Inténtalo de nuevo.", true); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["nudges"] }); },
  });
}
// Avisos de hoy para el propio cliente (pantalla Hoy).
export const useMyNudges = (clientId: string) => useQuery({ queryKey: ["my-nudges", clientId], enabled: !!clientId, staleTime: 60_000, refetchInterval: 120_000, queryFn: async (): Promise<NudgeKind[]> => {
  const { data, error } = await db().from("nudges").select("kind").eq("client_id", clientId).eq("day", bogotaDay()); if (error) throw error;
  return ((data ?? []) as { kind: NudgeKind }[]).map((r) => r.kind);
} });
// Vídeo del objetivo (0036): Jeff lo sube para un cliente (se registra como vídeo de ese cliente) y queda en clients.objective_video_id.
export function useObjectiveVideo(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), upload = useBackgroundUpload();
  const set = async (videoId: string | null) => { const { error } = await db().from("clients").update({ objective_video_id: videoId }).eq("id", clientId); if (error) throw error; void qc.invalidateQueries({ queryKey: KEYS.clients }); };
  return {
    upload: (file: File) => upload({ file, label: "Vídeo del objetivo", opts: { purpose: "message", clientId }, finish: async (vid) => { await set(vid); } }),
    remove: useMutation({ mutationFn: () => set(null), onSuccess: () => toast("Vídeo quitado"), onError: () => toast("No pudimos quitar el vídeo.", true) }),
  };
}

// ---- Plan mensual (0038): renovar 30 días más ----
export function useRenewPlan() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (clientId: string) => { const { data, error } = await db().rpc("renew_plan", { p_client: clientId }); if (error) throw error; return data as string; },
    onMutate: async (clientId) => { await qc.cancelQueries({ queryKey: KEYS.clients }); const today = bogotaDay(); qc.setQueryData<ClientRow[]>(KEYS.clients, (l) => l?.map((c) => (c.id === clientId ? { ...c, planSince: today } : c))); },
    onSuccess: () => toast("Plan renovado: cuenta 30 días desde hoy."),
    onError: () => toast("No pudimos renovar el plan. Inténtalo de nuevo.", true),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.clients }),
  });
}

// ---- Punto de partida obligatorio de la bienvenida (0038): peso y estatura ----
export function useSaveStartPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { weight: number; height: number }) => { const { error } = await db().rpc("save_start_point", { p_weight: v.weight, p_height: v.height }); if (error) throw error; },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["measures"] }); },
  });
}

// ---- Respuesta de Jeff a un entrenamiento (0038) ----
// Se muestra como aviso aparte en Hoy hasta que el cliente la marca como vista. No se responde.
export const hasFeedback = (l: WorkoutLog) => !!(l.coachComment || l.coachCommentAudio || l.coachCommentImage || l.coachCommentVideo);
export const feedbackUnseen = (l: WorkoutLog) => hasFeedback(l) && (!l.feedbackSeenAt || (!!l.coachAt && l.feedbackSeenAt < l.coachAt));
export function useMarkFeedbackSeen(clientId: string) {
  const qc = useQueryClient(), toast = useToast(), key = ["logs", clientId];
  return useMutation({
    mutationFn: async (logId: string) => { const { error } = await db().rpc("mark_feedback_seen", { p_log: logId }); if (error) throw error; },
    onMutate: async (logId) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<WorkoutLog[]>(key);
      qc.setQueryData<WorkoutLog[]>(key, (l) => l?.map((x) => (x.id === logId ? { ...x, feedbackSeenAt: new Date().toISOString() } : x))); return { prev }; },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast("No pudimos marcarlo como visto. Inténtalo de nuevo.", true); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// ---- Panel "Necesitan tu atención" (0041) ----
// La base devuelve los datos de cada cliente activo; las reglas (qué es urgente, qué falta configurar) viven en lib/attention.ts.
export type AttnData = { clientId: string; features: string[]; planSince: string | null; activatedAt: string | null; createdAt: string; trainingPlan: boolean; planDays: number; emptyDays: number; reviewOn: string | null; nutrition: boolean; lastWorkout: string | null; lastReport: string | null; lastMeal: string | null; lastMessage: string | null; lastCall: string | null; nextCall: string | null };
export const useCoachAttention = (enabled = true) => useQuery({ queryKey: ["coach-attention"], staleTime: 30_000, refetchInterval: 120_000, enabled, queryFn: async (): Promise<AttnData[]> => {
  const { data, error } = await db().rpc("coach_attention"); if (error) throw error;
  type Raw = { client_id: string; features: string[]; plan_since: string | null; activated_at: string | null; created_at: string; training_plan: boolean; plan_days: number; empty_days: number; review_on: string | null; nutrition: boolean; last_workout: string | null; last_report: string | null; last_meal: string | null; last_message: string | null; last_call: string | null; next_call: string | null };
  return ((data ?? []) as Raw[]).map((r) => ({ clientId: r.client_id, features: r.features ?? [], planSince: r.plan_since, activatedAt: r.activated_at, createdAt: r.created_at, trainingPlan: r.training_plan, planDays: r.plan_days, emptyDays: r.empty_days, reviewOn: r.review_on, nutrition: r.nutrition, lastWorkout: r.last_workout, lastReport: r.last_report, lastMeal: r.last_meal, lastMessage: r.last_message, lastCall: r.last_call, nextCall: r.next_call }));
} });

// ---- Sugerencias de peso para Jeff (29-oct): entrenamientos de los últimos 7 días donde hizo más o menos repeticiones de las pedidas ----
export type AdviceFeedRow = { logId: string; clientId: string; clientName: string; date: string; routine: string | null; effort: number | null; seen: boolean;
  sets: { itemId: string | null; reps: number | null; weight: number | null; warmup: boolean }[]; items: { id: string; name: string; reps: string; weight: number | null }[] };
export const useAdviceFeed = () => useQuery({ queryKey: ["advice-feed"], staleTime: 30_000, queryFn: async (): Promise<AdviceFeedRow[]> => {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const { data, error } = await db().from("workout_logs").select("id,client_id,log_date,effort,coach_seen_at,plan_days(name),clients(profiles(full_name)),set_logs(plan_item_id,reps,weight,kind,plan_items(id,reps,target_weight,exercises(name)))")
    .not("completed_at", "is", null).gte("log_date", localDate(since)).order("log_date", { ascending: false }).limit(80);
  if (error) throw error;
  type Raw = { id: string; client_id: string; log_date: string; effort: number | null; coach_seen_at: string | null; plan_days: { name: string } | null; clients: { profiles: { full_name: string } | null } | null;
    set_logs: { plan_item_id: string | null; reps: number | null; weight: number | null; kind: string; plan_items: { id: string; reps: string; target_weight: number | null; exercises: { name: string } | null } | null }[] };
  return (data as unknown as Raw[]).map((l) => {
    const items = new Map<string, { id: string; name: string; reps: string; weight: number | null }>();
    l.set_logs.forEach((s) => { if (s.plan_items) items.set(s.plan_items.id, { id: s.plan_items.id, name: s.plan_items.exercises?.name ?? "Ejercicio", reps: s.plan_items.reps, weight: s.plan_items.target_weight }); });
    return { logId: l.id, clientId: l.client_id, clientName: l.clients?.profiles?.full_name || "Cliente", date: l.log_date, routine: l.plan_days?.name ?? null, effort: l.effort, seen: !!l.coach_seen_at,
      sets: l.set_logs.map((s) => ({ itemId: s.plan_item_id, reps: s.reps, weight: s.weight, warmup: s.kind === "warmup" })), items: Array.from(items.values()) };
  });
} });
// Jeff aplica la sugerencia: cambia el peso de ese ejercicio en el plan del cliente (lo verá en su próxima rutina).
export function useApplyWeight() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { clientId: string; itemId: string; weight: number }) => { const { error } = await db().from("plan_items").update({ target_weight: v.weight }).eq("id", v.itemId); if (error) throw error; },
    onSuccess: (_d, v) => { toast(`Plan actualizado: ${String(v.weight).replace(".", ",")} kg`); void qc.invalidateQueries({ queryKey: ["advice-feed"] }); void qc.invalidateQueries({ queryKey: ["plans-of", v.clientId] }); },
    onError: () => toast("No pudimos cambiar el peso. Inténtalo de nuevo.", true),
  });
}
