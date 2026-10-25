"use client";
import { useState } from "react";
import { useAddNote, useDeleteNote, useNotes } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Skeleton } from "@/components/ui/Modal";
export function NotesTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const ws = useWorkspaceId(), { data, isPending, isError, refetch } = useNotes(clientId), add = useAddNote(clientId, ws), del = useDeleteNote(clientId), [t, setT] = useState("");
  const first = clientName.split(" ")[0] || "el cliente";
  const send = () => { if (!t.trim() || add.isPending) return; add.mutate(t, { onSuccess: () => setT("") }); };
  return (
    <div>
      <div className="private-warning"><svg viewBox="0 0 20 20"><rect x="4" y="8.5" width="12" height="8" rx="2" /><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" /></svg>Estas notas nunca son visibles para {first}. Solo tú las ves.</div>
      <div className="card">
        {isPending && <Skeleton rows={2} />}
        {isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar las notas. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
        {data && !data.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Aún no hay notas de {first}. Apunta lesiones, preferencias o cosas que recordar.</p>}
        {data?.map((n) => <div key={n.id} className="note-item"><div className="note-date">{new Date(n.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })} · <button style={{ background: "none", border: 0, color: "var(--text-faint)", textDecoration: "underline", cursor: "pointer", font: "inherit" }} onClick={() => del.mutate(n.id)}>Borrar</button></div><div className="note-text" style={{ whiteSpace: "pre-wrap" }}>{n.body}</div></div>)}
        <textarea className="note-textarea" aria-label="Nueva nota privada" maxLength={2000} placeholder="Escribir una nota privada..." value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && send()} />
        <div style={{ marginTop: 10 }}><button className="primary-btn" disabled={!t.trim() || add.isPending} onClick={send}>{add.isPending ? "Guardando…" : "Guardar nota"}</button></div>
      </div>
    </div>
  );
}
