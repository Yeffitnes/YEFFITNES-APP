"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UploadProvider } from "@/lib/upload-manager";
import { fetchActivePlanClients, fetchClients, fetchExercises, fetchMeasures, fetchPlans, fetchRecentLogs, fetchRoutines, fetchTrainingPlans, fetchLogs, KEYS, type Me } from "@/lib/queries";
const Toast = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(Toast);
const Ws = createContext<string>("");
const Prof = createContext<{ profileId: string; name: string }>({ profileId: "", name: "" });
export const useProfile = () => useContext(Prof);
export const useWorkspaceId = () => useContext(Ws);
export function Providers({ workspaceId, profileId = "", name = "", prefetch = true, me, children }: { workspaceId: string; profileId?: string; name?: string; prefetch?: boolean; me?: Me | null; children: React.ReactNode }) {
  const [qc] = useState(() => {
    const c = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 30_000, gcTime: 10 * 60_000 } } });
    if (me) c.setQueryData(["me", profileId], me); // el servidor ya lo leyó: la primera pantalla no espera ese viaje
    return c;
  });
  const [toast, setToast] = useState<{ msg: string; err: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((msg: string, err = false) => { setToast({ msg, err }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3200); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Al entrar al panel se precargan los datos principales: después, cada pantalla abre al instante.
  useEffect(() => { if (!prefetch) return; void Promise.all([
    qc.prefetchQuery({ queryKey: KEYS.clients, queryFn: fetchClients }), qc.prefetchQuery({ queryKey: KEYS.plans, queryFn: fetchPlans }),
    qc.prefetchQuery({ queryKey: KEYS.exercises, queryFn: fetchExercises }), qc.prefetchQuery({ queryKey: KEYS.routines, queryFn: fetchRoutines }),
    qc.prefetchQuery({ queryKey: ["recent-logs"], queryFn: fetchRecentLogs }), qc.prefetchQuery({ queryKey: ["active-plan-clients"], queryFn: fetchActivePlanClients })]); }, [qc, prefetch]);
  // Portal: se precargan el resto de pestañas mientras el cliente mira "Hoy".
  useEffect(() => { if (!me?.id) return; const id = me.id;
    void qc.prefetchQuery({ queryKey: ["plans-of", id], queryFn: () => fetchTrainingPlans(id) });
    void qc.prefetchQuery({ queryKey: ["logs", id], queryFn: () => fetchLogs(id) });
    void qc.prefetchQuery({ queryKey: ["measures", id], queryFn: () => fetchMeasures(id) }); }, [qc, me?.id]);
  return (
    <QueryClientProvider client={qc}><Ws.Provider value={workspaceId}><Prof.Provider value={{ profileId, name }}><Toast.Provider value={show}><UploadProvider toast={show}>
      {children}</UploadProvider>{toast && <div role="status" className={`toast${toast.err ? " err" : ""}`}>{toast.msg}</div>}
    </Toast.Provider></Prof.Provider></Ws.Provider></QueryClientProvider>
  );
}
