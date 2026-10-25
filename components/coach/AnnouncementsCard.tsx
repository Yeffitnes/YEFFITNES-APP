"use client";
import { useState } from "react";
import { useCoachAnnouncements, useDeleteAnnouncement, useSaveAnnouncement } from "@/lib/queries";
import { useWorkspaceId } from "@/components/Providers";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
const fmt = (iso: string) => new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
export function AnnouncementsCard() {
  const { data, isPending, isError, refetch } = useCoachAnnouncements(), del = useDeleteAnnouncement(), [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-tag">Para todos tus clientes</div><div className="card-title" style={{ fontSize: 15 }}>Anuncios</div></div><button className="card-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setOpen(true)}>+ Nuevo</button></div>
      {isPending && <div className="sk" style={{ height: 50, marginTop: 8 }} />}
      {isError && <p role="alert" style={{ fontSize: 13.5, marginTop: 8 }}>No pudimos cargar los anuncios. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p>}
      {data && !data.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8 }}>Publica un aviso (horarios, feriados, novedades) y aparecerá en “Hoy” de todos tus clientes.</p>}
      <div style={{ marginTop: 6 }}>{data?.map((a) => (
        <div key={a.id} className="note-item">
          <div className="note-date">{a.pinned ? <><Icon name="pin" size={12} /> Fijado · </> : ""}{fmt(a.createdAt)}{a.expiresOn ? (a.expiresOn < today ? " · vencido" : ` · hasta ${fmt(a.expiresOn + "T00:00:00")}`) : ""} · <button style={{ background: "none", border: 0, color: "var(--text-faint)", textDecoration: "underline", cursor: "pointer", font: "inherit" }} onClick={() => del.mutate(a.id)}>Quitar</button></div>
          <div className="note-text">{a.title && <b>{a.title} — </b>}{a.body}</div></div>))}</div>
      {open && <AnnouncementForm onClose={() => setOpen(false)} />}
    </div>
  );
}
function AnnouncementForm({ onClose }: { onClose: () => void }) {
  const ws = useWorkspaceId(), save = useSaveAnnouncement(ws), [v, setV] = useState({ title: "", body: "", pinned: false, expiresOn: "" }), [err, setErr] = useState("");
  const submit = () => { if (v.body.trim().length < 3) return setErr("Escribe el mensaje del anuncio."); save.mutate(v, { onSuccess: onClose }); };
  return (
    <Modal title="Nuevo anuncio" sub="Lo verán en “Hoy” los clientes activos cuyo plan incluya anuncios." onClose={onClose}>
      <div className="modal-field"><label htmlFor="at">Título (opcional)</label><input id="at" value={v.title} maxLength={120} onChange={(e) => { setV({ ...v, title: e.target.value }); setErr(""); }} placeholder="Ej. Horario del puente" /></div>
      <div className="modal-field"><label htmlFor="ab">Mensaje</label><textarea id="ab" value={v.body} maxLength={1000} onChange={(e) => { setV({ ...v, body: e.target.value }); setErr(""); }} placeholder="Escribe el anuncio..." /></div>
      <div className="modal-field"><label htmlFor="ae">Se oculta después de (opcional)</label><input id="ae" type="date" value={v.expiresOn} onChange={(e) => setV({ ...v, expiresOn: e.target.value })} /></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, margin: "6px 0 2px" }}><input type="checkbox" checked={v.pinned} onChange={(e) => setV({ ...v, pinned: e.target.checked })} />Fijarlo arriba</label>
      {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Publicando…" : "Publicar"}</button></div>
    </Modal>
  );
}
