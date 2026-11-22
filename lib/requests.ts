"use client";
// Solicitudes de clientes (22-nov, pedido de Cristian): lo que un cliente le pide a Yeff sale como prioritario en el panel y en la
// campana, además de la notificación al teléfono (que puede no llegar).
//  - Acceso: cliente nuevo sin plan (status 'pending'); si tocó "Solicitar acceso", con la hora (clients.access_requested_at, 0034).
//  - Funciones: cliente activo que pide algo que su plan no incluye, p. ej. Nutrición (feature_requests, 0058).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase/browser";
import { useToast } from "@/components/Providers";
import { missingTable } from "@/lib/fetchers";
import { FEATURE_NAMES } from "@/lib/features";
import type { ClientRow } from "@/lib/queries";

export type FeatureReq = { id: string; clientId: string; feature: string; createdAt: string };
type Raw = { id: string; client_id: string; feature: string; created_at: string };
const gone = (e: { code?: string; message?: string }) => e.code === "PGRST205" || missingTable(e);   // base sin la 0058
async function load(clientId?: string): Promise<FeatureReq[]> {
  let q = db().from("feature_requests").select("id,client_id,feature,created_at").is("handled_at", null).order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) { if (gone(error)) return []; throw error; }
  return ((data ?? []) as Raw[]).map((r) => ({ id: r.id, clientId: r.client_id, feature: r.feature, createdAt: r.created_at }));
}
export const useFeatureRequests = (enabled = true) => useQuery({ queryKey: ["feature-requests"], queryFn: () => load(), staleTime: 15_000, refetchInterval: 45_000, enabled });
export const useMyFeatureRequests = (clientId: string) => useQuery({ queryKey: ["my-feature-requests", clientId], queryFn: () => load(clientId), staleTime: 60_000, enabled: !!clientId });

export function useRequestFeature(clientId: string) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (feature: string) => { const r = await fetch("/api/access/feature", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feature }) }); if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "failed"); },
    onSuccess: (_d, feature) => {
      qc.setQueryData<FeatureReq[]>(["my-feature-requests", clientId], (l) => [{ id: `tmp-${feature}`, clientId, feature, createdAt: new Date().toISOString() }, ...(l ?? []).filter((x) => x.feature !== feature)]);
      void qc.invalidateQueries({ queryKey: ["my-feature-requests", clientId] }); toast("Listo. Se lo pedimos a Yeff.");
    },
    onError: (e) => toast((e as Error).message === "already_included" ? "Tu plan ya lo incluye. Recarga la app." : (e as Error).message === "not_ready" ? "Esta opción se activa en unos días." : "No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo.", true),
  });
}
export function useResolveFeatureRequest() {
  const qc = useQueryClient(), toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await db().rpc("resolve_feature_request", { p_id: id }); if (error) throw error; },
    onMutate: (id) => { qc.setQueryData<FeatureReq[]>(["feature-requests"], (l) => (l ?? []).filter((x) => x.id !== id)); },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["feature-requests"] }),
    onError: () => toast("No pudimos marcarla como lista. Inténtalo de nuevo.", true),
  });
}

// Una lista para el panel: primero quien pidió algo (lo más reciente arriba), después los nuevos que aún no lo piden.
export type ClientReq = { key: string; kind: "access" | "feature"; clientId: string; name: string; at: string; asked: boolean; text: string; reqId?: string; feature?: string };
export function clientRequests(clients: ClientRow[], reqs: FeatureReq[]): ClientReq[] {
  const names = new Map(clients.map((c) => [c.id, c.name]));
  const access: ClientReq[] = clients.filter((c) => c.status === "pending").map((c) => ({
    key: `acc-${c.id}`, kind: "access", clientId: c.id, name: c.name, at: c.accessRequestedAt ?? c.createdAt, asked: !!c.accessRequestedAt,
    text: c.accessRequestedAt ? "Pidió acceso: espera que le actives un plan" : "Cliente nuevo: creó su cuenta y espera plan",
  }));
  const feats: ClientReq[] = reqs.filter((r) => names.has(r.clientId)).map((r) => ({
    key: `fr-${r.id}`, kind: "feature", clientId: r.clientId, name: names.get(r.clientId)!, at: r.createdAt, asked: true, reqId: r.id, feature: r.feature,
    text: `Pidió ${FEATURE_NAMES[r.feature] ?? r.feature}`,
  }));
  return [...access, ...feats].sort((a, b) => Number(b.asked) - Number(a.asked) || +new Date(b.at) - +new Date(a.at));
}
