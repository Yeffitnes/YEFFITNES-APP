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
