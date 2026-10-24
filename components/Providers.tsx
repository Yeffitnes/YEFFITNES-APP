"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchClients, fetchExercises, fetchPlans, fetchRoutines, KEYS } from "@/lib/queries";
const Toast = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(Toast);
const Ws = createContext<string>("");
const Prof = createContext<{ profileId: string; name: string }>({ profileId: "", name: "" });
export const useProfile = () => useContext(Prof);
export const useWorkspaceId = () => useContext(Ws);
export function Providers({ workspaceId, profileId = "", name = "", prefetch = true, children }: { workspaceId: string; profileId?: string; name?: string; prefetch?: boolean; children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } }));
  const [toast, setToast] = useState<{ msg: string; err: boolean } | null>(null);
  const show = useCallback((msg: string, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(null), 3200); }, []);
  // Al entrar al panel se precargan los datos principales: después, cada pantalla abre al instante.
  useEffect(() => { if (!prefetch) return; void Promise.all([
    qc.prefetchQuery({ queryKey: KEYS.clients, queryFn: fetchClients }), qc.prefetchQuery({ queryKey: KEYS.plans, queryFn: fetchPlans }),
    qc.prefetchQuery({ queryKey: KEYS.exercises, queryFn: fetchExercises }), qc.prefetchQuery({ queryKey: KEYS.routines, queryFn: fetchRoutines })]); }, [qc, prefetch]);
  return (
    <QueryClientProvider client={qc}><Ws.Provider value={workspaceId}><Prof.Provider value={{ profileId, name }}><Toast.Provider value={show}>
      {children}{toast && <div role="status" className={`toast${toast.err ? " err" : ""}`}>{toast.msg}</div>}
    </Toast.Provider></Prof.Provider></Ws.Provider></QueryClientProvider>
  );
}
