"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";

export type Plan = { id: string; name: string };
export type ClientRow = { id: string; name: string; planId: string | null; plan: string | null; status: "pending" | "active" | "paused"; createdAt: string };
export type Ex = { id: string; name: string; category: string; muscle: string | null; equipment: string | null; difficulty: number; instructions: string | null; videoRef: string | null; used: number };
export type RoutineItem = { exerciseId: string; name: string; hasVideo: boolean; sets: number; reps: string; rest: number | null };
export type Routine = { id: string; name: string; category: string | null; minutes: number | null; items: RoutineItem[] };

type ClientRaw = { id: string; status: string; plan_id: string | null; created_at: string; plans: unknown; profiles: unknown };
type ExRaw = { id: string; name: string; category: string; muscle_group: string | null; equipment: string | null; difficulty: number; instructions: string | null; video_ref: string | null; template_items: unknown };
type RoutineRaw = { id: string; name: string; category: string | null; est_minutes: number | null; template_items: unknown };
export const fetchPlans = async (): Promise<Plan[]> => {
  const { data, error } = await db().from("plans").select("id,name").eq("active", true).order("name");
  if (error) throw error; return data;
};
export const fetchClients = async (): Promise<ClientRow[]> => {
  const { data, error } = await db().from("clients").select("id,status,plan_id,created_at,plans(name),profiles!inner(full_name,role)").eq("profiles.role", "client").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ClientRaw[]).map((c) => ({ id: c.id, name: (c.profiles as unknown as { full_name: string }).full_name || "Sin nombre", planId: c.plan_id, plan: (c.plans as unknown as { name: string } | null)?.name ?? null, status: c.status as ClientRow["status"], createdAt: c.created_at }));
};
export const fetchExercises = async (): Promise<Ex[]> => {
  const { data, error } = await db().from("exercises").select("id,name,category,muscle_group,equipment,difficulty,instructions,video_ref,template_items(count)").eq("active", true).order("name");
  if (error) throw error;
  return (data as unknown as ExRaw[]).map((e) => ({ id: e.id, name: e.name, category: e.category, muscle: e.muscle_group, equipment: e.equipment, difficulty: e.difficulty, instructions: e.instructions, videoRef: e.video_ref, used: (e.template_items as unknown as { count: number }[])?.[0]?.count ?? 0 }));
};
export const fetchRoutines = async (): Promise<Routine[]> => {
  const { data, error } = await db().from("routine_templates").select("id,name,category,est_minutes,template_items(position,exercise_id,sets,reps,rest_seconds,exercises(name,video_ref))").eq("active", true).order("created_at", { ascending: false });
  if (error) throw error;
  type It = { position: number; exercise_id: string; sets: number; reps: string; rest_seconds: number | null; exercises: { name: string; video_ref: string | null } | null };
  return (data as unknown as RoutineRaw[]).map((r) => ({ id: r.id, name: r.name, category: r.category, minutes: r.est_minutes,
    items: ((r.template_items as unknown as It[]) ?? []).sort((a, b) => a.position - b.position).map((i) => ({ exerciseId: i.exercise_id, name: i.exercises?.name ?? "—", hasVideo: !!i.exercises?.video_ref, sets: i.sets, reps: i.reps, rest: i.rest_seconds })) }));
};

export const KEYS = { plans: ["plans"], clients: ["clients"], exercises: ["exercises"], routines: ["routines"] } as const;
export const useClients = () => useQuery({ queryKey: KEYS.clients, queryFn: fetchClients, staleTime: 30_000 });
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

export type ExerciseInput = { id?: string; name: string; category: string; muscle: string; equipment: string; difficulty: number; instructions: string; videoRef: string | null };
export function useSaveExercise(workspaceId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (x: ExerciseInput) => {
      const row = { name: x.name, category: x.category, muscle_group: x.muscle || null, equipment: x.equipment || null, difficulty: x.difficulty, instructions: x.instructions || null, video_provider: x.videoRef ? "youtube" : null, video_ref: x.videoRef };
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
export type RoutineInput = { id?: string; name: string; category: string; minutes: number | null; items: { exercise_id: string; sets: number; reps: string; rest_seconds: number | null }[] };
export function useSaveRoutine() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (r: RoutineInput) => {
      const { error } = await db().rpc("save_routine", { p_id: r.id ?? null, p_name: r.name, p_category: r.category || null, p_minutes: r.minutes, p_items: r.items });
      if (error) throw error;
    },
    onSuccess: () => { toast("Rutina guardada"); qc.invalidateQueries({ queryKey: KEYS.routines }); qc.invalidateQueries({ queryKey: KEYS.exercises }); },
    onError: () => toast("No pudimos guardar la rutina. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}

// ---- Entrenamiento por días ----
export type PlanItem = { id: string; position: number; sets: number; reps: string; rest: number | null; weight: number | null; name: string; muscle: string | null; equipment: string | null; videoRef: string | null; instructions: string | null };
export type PlanDay = { id: string; weekday: number; name: string; minutes: number | null; category: string | null; items: PlanItem[] };
export type TrainingPlan = { id: string; name: string; status: "active" | "finished"; startsOn: string; endsOn: string | null; days: PlanDay[] };
type PlanRaw = { id: string; name: string; status: "active" | "finished"; starts_on: string; ends_on: string | null; plan_days: { id: string; weekday: number; name: string; est_minutes: number | null; category: string | null; plan_items: { id: string; position: number; sets: number; reps: string; rest_seconds: number | null; target_weight: number | null; exercises: { name: string; muscle_group: string | null; equipment: string | null; video_ref: string | null; instructions: string | null } | null }[] }[] };
export const fetchTrainingPlans = async (clientId: string): Promise<TrainingPlan[]> => {
  const { data, error } = await db().from("training_plans").select("id,name,status,starts_on,ends_on,plan_days(id,weekday,name,est_minutes,category,plan_items(id,position,sets,reps,rest_seconds,target_weight,exercises(name,muscle_group,equipment,video_ref,instructions)))").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PlanRaw[]).map((p) => ({ id: p.id, name: p.name, status: p.status, startsOn: p.starts_on, endsOn: p.ends_on,
    days: p.plan_days.map((d) => ({ id: d.id, weekday: d.weekday, name: d.name, minutes: d.est_minutes, category: d.category, items: d.plan_items.sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, position: i.position, sets: i.sets, reps: i.reps, rest: i.rest_seconds, weight: i.target_weight, name: i.exercises?.name ?? "—", muscle: i.exercises?.muscle_group ?? null, equipment: i.exercises?.equipment ?? null, videoRef: i.exercises?.video_ref ?? null, instructions: i.exercises?.instructions ?? null })) })) }));
};
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
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (dayId: string) => { const { error } = await db().from("plan_days").delete().eq("id", dayId); if (error) throw error; },
    onSuccess: () => { toast("Día liberado"); qc.invalidateQueries({ queryKey: ["plans-of", clientId] }); },
    onError: () => toast("No pudimos quitar la rutina. Inténtalo de nuevo.", true),
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
export type Me = { id: string; status: string; planName: string | null; features: string[] };
export const fetchMe = async (profileId: string): Promise<Me | null> => {
  const { data, error } = await db().from("clients").select("id,status,plans(name,features)").eq("profile_id", profileId).maybeSingle();
  if (error) throw error; if (!data) return null;
  const p = (data as unknown as { plans: { name: string; features: string[] } | null }).plans;
  return { id: data.id, status: data.status, planName: p?.name ?? null, features: p?.features ?? [] };
};
export const useMe = (profileId: string) => useQuery({ queryKey: ["me", profileId], staleTime: 60_000, queryFn: () => fetchMe(profileId) });
export type SetLog = { itemId: string | null; setNumber: number; reps: number | null; weight: number | null };
export type WorkoutLog = { id: string; date: string; effort: number | null; note: string | null; completed: boolean; coachComment: string | null; sets: SetLog[] };
type LogRaw = { id: string; log_date: string; effort: number | null; note: string | null; completed_at: string | null; coach_comment: string | null; set_logs: { plan_item_id: string | null; set_number: number; reps: number | null; weight: number | null }[] };
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fetchLogs = async (clientId: string): Promise<WorkoutLog[]> => {
  const since = new Date(); since.setDate(since.getDate() - 90);
  const { data, error } = await db().from("workout_logs").select("id,log_date,effort,note,completed_at,coach_comment,set_logs(plan_item_id,set_number,reps,weight)").eq("client_id", clientId).gte("log_date", localDate(since)).order("log_date", { ascending: false });
  if (error) throw error;
  return (data as unknown as LogRaw[]).map((l) => ({ id: l.id, date: l.log_date, effort: l.effort, note: l.note, completed: !!l.completed_at, coachComment: l.coach_comment, sets: l.set_logs.map((s) => ({ itemId: s.plan_item_id, setNumber: s.set_number, reps: s.reps, weight: s.weight })) }));
};
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
        const base = has ? l : [{ id: "tmp", date: v.date, effort: null, note: null, completed: false, coachComment: null, sets: [] }, ...l];
        return base.map((x) => (x.date === v.date ? { ...x, sets: [...x.sets.filter((y) => !(y.itemId === v.itemId && y.setNumber === v.setNumber)), s] } : x));
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast("No pudimos guardar la serie. Revisa tu conexión e inténtalo de nuevo.", true); },
    // Sin releer todo tras cada serie (más rápido). Solo se vuelve a leer si falló o si el registro aún es provisional.
    onSuccess: () => { if (qc.getQueryData<WorkoutLog[]>(key)?.some((l) => l.id === "tmp")) qc.invalidateQueries({ queryKey: key }); },
  });
}
export function useFinish(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { date: string; effort: number; note: string }) => { const { error } = await db().rpc("finish_workout", { p_date: v.date, p_effort: v.effort, p_note: v.note }); if (error) throw error; },
    onSuccess: () => { toast("¡Entrenamiento guardado! Buen trabajo."); qc.invalidateQueries({ queryKey: ["logs", clientId] }); },
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
export type ClientLog = { id: string; date: string; routine: string | null; effort: number | null; note: string | null; completed: boolean; seen: boolean; comment: string | null; sets: { exercise: string; n: number; reps: number | null; weight: number | null }[] };
type ClientLogRaw = { id: string; log_date: string; effort: number | null; note: string | null; completed_at: string | null; coach_seen_at: string | null; coach_comment: string | null; plan_days: { name: string } | null; set_logs: { exercise_name: string; set_number: number; reps: number | null; weight: number | null }[] };
export const useClientLogs = (clientId: string) => useQuery({ queryKey: ["client-logs", clientId], staleTime: 30_000, queryFn: async (): Promise<ClientLog[]> => {
  const { data, error } = await db().from("workout_logs").select("id,log_date,effort,note,completed_at,coach_seen_at,coach_comment,plan_days(name),set_logs(exercise_name,set_number,reps,weight)").eq("client_id", clientId).order("log_date", { ascending: false }).limit(15);
  if (error) throw error;
  return (data as unknown as ClientLogRaw[]).map((l) => ({ id: l.id, date: l.log_date, routine: l.plan_days?.name ?? null, effort: l.effort, note: l.note, completed: !!l.completed_at, seen: !!l.coach_seen_at, comment: l.coach_comment, sets: l.set_logs.map((x) => ({ exercise: x.exercise_name, n: x.set_number, reps: x.reps, weight: x.weight })) }));
} });
export function useReviewWorkout(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (v: { id: string; comment: string }) => { const { error } = await db().rpc("review_workout", { p_log: v.id, p_comment: v.comment }); if (error) throw error; },
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
    onSuccess: () => { toast("Foto guardada"); qc.invalidateQueries({ queryKey: ["photos", clientId] }); },
    onError: () => toast("No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.", true),
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
  already_has_booking: "Ya tienes una sesión reservada. Cancélala (hasta 24 h antes) si quieres cambiarla.", too_late: "Faltan menos de 24 horas: escribe a tu coach para cambiarla.",
  not_active: "Tu cuenta aún no está activa.", has_booking: "Ese hueco tiene una reserva: primero cancela la reserva.",
};
export const agendaError = (e: unknown) => { const m = (e as { message?: string })?.message ?? ""; const k = Object.keys(AG_ERR).find((x) => m.includes(x)); return k ? AG_ERR[k] : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo."; };
export function weekBounds(offset: number) {
  const t = new Date(); t.setHours(0, 0, 0, 0); const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7) + offset * 7);
  const next = new Date(mon); next.setDate(mon.getDate() + 7); return { from: mon, to: next };
}
export type Slot = { id: string; startsAt: string; duration: number; kind: string; taken: boolean; mine: boolean };
export const useOpenSlots = (offset: number) => useQuery({ queryKey: ["open-slots", offset], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<Slot[]> => {
  const { from, to } = weekBounds(offset);
  const { data, error } = await db().rpc("list_open_slots", { p_from: from.toISOString(), p_to: to.toISOString() }); if (error) throw error;
  return (data as { id: string; starts_at: string; duration_min: number; kind: string; taken: boolean; mine: boolean }[]).map((s) => ({ id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, taken: s.taken, mine: s.mine }));
} });
export type MyBooking = { id: string; startsAt: string; duration: number; kind: string };
export const useMyBookings = (clientId: string) => useQuery({ queryKey: ["my-bookings", clientId], staleTime: 20_000, enabled: !!clientId, queryFn: async (): Promise<MyBooking[]> => {
  const { data, error } = await db().from("bookings").select("id,availability_slots(starts_at,duration_min,kind)").eq("client_id", clientId).eq("status", "confirmed"); if (error) throw error;
  return (data as unknown as { id: string; availability_slots: { starts_at: string; duration_min: number; kind: string } | null }[])
    .filter((b) => b.availability_slots && new Date(b.availability_slots.starts_at) > new Date()).map((b) => ({ id: b.id, startsAt: b.availability_slots!.starts_at, duration: b.availability_slots!.duration_min, kind: b.availability_slots!.kind }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
} });
function useAgendaInvalidate() { const qc = useQueryClient(); return () => ["open-slots", "my-bookings", "coach-slots"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export function useBookSlot() {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (slotId: string) => { const { error } = await db().rpc("book_slot", { p_slot: slotId }); if (error) throw error; },
    onSuccess: () => toast("¡Sesión reservada!"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}
export function useCancelBooking() {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (id: string) => { const { error } = await db().rpc("cancel_booking", { p_booking: id }); if (error) throw error; },
    onSuccess: () => toast("Sesión cancelada"), onError: (e) => toast(agendaError(e), true), onSettled: inv });
}
export type CoachSlot = { id: string; startsAt: string; duration: number; kind: string; booking: { id: string; clientName: string; by: string } | null };
export const useCoachSlots = (offset: number) => useQuery({ queryKey: ["coach-slots", offset], staleTime: 20_000, refetchInterval: 60_000, queryFn: async (): Promise<CoachSlot[]> => {
  const { from, to } = weekBounds(offset);
  const { data, error } = await db().from("availability_slots").select("id,starts_at,duration_min,kind,bookings(id,status,booked_by,clients(profiles(full_name)))").eq("status", "open").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at"); if (error) throw error;
  type Raw = { id: string; starts_at: string; duration_min: number; kind: string; bookings: { id: string; status: string; booked_by: string; clients: { profiles: { full_name: string } | null } | null }[] };
  return (data as unknown as Raw[]).map((s) => { const b = s.bookings.find((x) => x.status === "confirmed");
    return { id: s.id, startsAt: s.starts_at, duration: s.duration_min, kind: s.kind, booking: b ? { id: b.id, clientName: b.clients?.profiles?.full_name || "Cliente", by: b.booked_by } : null }; });
} });
export function usePublishSlots(workspaceId: string) {
  const toast = useToast(), inv = useAgendaInvalidate();
  return useMutation({ mutationFn: async (v: { starts: string[]; duration: number; kind: string }) => {
      const { error } = await db().from("availability_slots").upsert(v.starts.map((s) => ({ workspace_id: workspaceId, starts_at: s, duration_min: v.duration, kind: v.kind })), { onConflict: "workspace_id,starts_at", ignoreDuplicates: true }); if (error) throw error; },
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
