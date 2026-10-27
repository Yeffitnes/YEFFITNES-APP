"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { UploadError, uploadVideo } from "@/lib/upload-video";

// Subidas en segundo plano: viven en la raíz de la app, no en la pantalla donde empezaron.
// El coach puede cambiar de sección mientras sube; la pantalla se mantiene encendida y se avisa si intenta cerrar.
type Job = { id: number; label: string; pct: number; state: "up" | "done" | "err"; msg?: string };
type Enqueue = (j: { file: File; label: string; opts?: { purpose?: "report" | "message"; clientId?: string }; finish: (videoId: string, qc: QueryClient) => Promise<void> }) => void;
const Ctx = createContext<Enqueue>(() => {});
export const useBackgroundUpload = () => useContext(Ctx);

const ERR: Record<string, string> = { too_many: "Subiste muchos vídeos hoy. Inténtalo mañana.", not_configured: "Los vídeos privados aún no están activados.", video_service_unavailable: "El servicio de vídeo no responde. Inténtalo en un rato.", upload_failed: "Se cortó la subida. Revisa la conexión e inténtalo de nuevo." };

export function UploadProvider({ toast, children }: { toast: (m: string, err?: boolean) => void; children: React.ReactNode }) {
  const qc = useQueryClient(), [jobs, setJobs] = useState<Job[]>([]), seq = useRef(0), lock = useRef<{ release: () => Promise<void> } | null>(null);
  const patch = (id: number, p: Partial<Job>) => setJobs((l) => l.map((j) => (j.id === id ? { ...j, ...p } : j)));
  const active = jobs.some((j) => j.state === "up");

  const enqueue = useCallback<Enqueue>(({ file, label, opts, finish }) => {
    const id = ++seq.current; setJobs((l) => [...l, { id, label, pct: 0, state: "up" }]);
    void (async () => {
      try {
        const vid = await uploadVideo(file, (pct) => patch(id, { pct }), opts);
        await finish(vid, qc); patch(id, { pct: 100, state: "done" }); toast(`${label}: listo`);
        setTimeout(() => setJobs((l) => l.filter((j) => j.id !== id)), 4000);
      } catch (e) { patch(id, { state: "err", msg: e instanceof UploadError ? ERR[e.code] ?? ERR.upload_failed : "No pudimos guardar el vídeo. Inténtalo de nuevo." }); }
    })();
  }, [qc, toast]);

  // Mientras sube: pantalla encendida (si no, el teléfono se bloquea y pausa la subida) y aviso al cerrar la pestaña.
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    const getLock = async () => { try { if (!lock.current && "wakeLock" in navigator) lock.current = await (navigator as unknown as { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch { /* sin soporte: se sigue igual */ } };
    const vis = () => { if (document.visibilityState === "visible") { lock.current = null; void getLock(); } };
    void getLock(); document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("visibilitychange", vis); void lock.current?.release().catch(() => {}); lock.current = null; };
  }, [active]);

  return (
    <Ctx.Provider value={enqueue}>
      {children}
      {jobs.length > 0 && <div className="upl-stack" role="status" aria-live="polite">{jobs.map((j) => (
        <div key={j.id} className={`upl-chip${j.state === "err" ? " err" : ""}`}>
          <div className="upl-row"><b>{j.label}</b><span>{j.state === "up" ? `${j.pct}%` : j.state === "done" ? "Listo" : "Error"}</span></div>
          {j.state === "up" && <><div className="upl-bar"><i style={{ width: `${j.pct}%` }} /></div><small>Puedes seguir usando la app. No la cierres hasta que termine.</small></>}
          {j.state === "err" && <><small>{j.msg}</small><button className="ghost-btn" style={{ height: 28, fontSize: 11.5, marginTop: 6 }} onClick={() => setJobs((l) => l.filter((x) => x.id !== j.id))}>Cerrar</button></>}
        </div>))}</div>}
    </Ctx.Provider>
  );
}
