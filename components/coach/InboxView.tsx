"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients } from "@/lib/queries";
import { useThreads } from "@/lib/messages";
import { ThreadView } from "@/components/ui/ThreadView";
import { ago, gradient, initials } from "@/lib/format";
import "@/app/messages.css";

function Inbox() {
  const router = useRouter(), sp = useSearchParams(), sel = sp.get("c");
  const threads = useThreads(), clients = useClients(), [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = threads.data ?? [], have = new Set(t.map((x) => x.clientId));
    const extra = (clients.data ?? []).filter((c) => !have.has(c.id)).map((c) => ({ clientId: c.id, name: c.name, status: c.status, lastSender: "coach" as const, lastBody: null, lastKind: "text" as const, lastAt: "", unread: 0 }));
    const k = q.trim().toLowerCase();
    return [...t, ...extra].filter((x) => !k || x.name.toLowerCase().includes(k));
  }, [threads.data, clients.data, q]);
  const current = list.find((x) => x.clientId === sel) ?? (clients.data ?? []).filter((c) => c.id === sel).map((c) => ({ clientId: c.id, name: c.name }))[0];
  const select = (id: string | null) => router.replace(id ? `/coach/mensajes?c=${id}` : "/coach/mensajes", { scroll: false });
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Mensajes</div><h1>Bandeja de mensajes</h1><p className="greeting-sub">Escríbeles cuando quieras: texto, foto, vídeo propio o de YouTube. Les llega un aviso a su teléfono.</p></div></div>
      <div className={`inbox-layout${current ? " open" : ""}`}>
        <div className="inbox-side">
          <div className="search-box" style={{ maxWidth: "none", marginBottom: 10 }}><input type="search" placeholder="Buscar cliente…" aria-label="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} style={{ fontSize: 16 }} /></div>
          {(threads.isPending || clients.isPending) && <div className="sk" style={{ height: 66, marginBottom: 8 }} />}
          {threads.isError && <p role="alert" style={{ fontSize: 14 }}>No pudimos cargar la bandeja. <button className="filter-chip" onClick={() => threads.refetch()}>Reintentar</button></p>}
          {list.map((t, i) => (
            <button key={t.clientId} className={`inbox-row${t.clientId === sel ? " active" : ""}`} onClick={() => select(t.clientId)}>
              <span className="side-avatar" style={{ background: gradient(i), color: "#fff", flex: "none" }}>{initials(t.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="inbox-name">{t.name}</span>
                <span className="inbox-last" style={{ display: "block" }}>{t.lastAt ? `${t.lastSender === "coach" ? "Tú: " : ""}${t.lastBody ?? (t.lastKind === "video" ? "Vídeo" : "Foto")}` : "Sin mensajes"}</span>
              </span>
              <span style={{ textAlign: "right", flex: "none" }}>{t.unread > 0 && <span className="inbox-badge">{t.unread}</span>}{t.lastAt && <span style={{ display: "block", fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>{ago(t.lastAt)}</span>}</span>
            </button>
          ))}
          {!list.length && !threads.isPending && !clients.isPending && <p style={{ fontSize: 14, color: "var(--text-dim)" }}>No hay clientes que coincidan.</p>}
        </div>
        <div className="inbox-main">
          {current
            ? <><button className="filter-chip inbox-back" onClick={() => select(null)}>‹ Bandeja</button><div style={{ fontWeight: 700, marginBottom: 8 }}>{current.name}</div><ThreadView key={current.clientId} clientId={current.clientId} otherName={current.name} coach /></>
            : <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Elige un cliente para ver o escribir sus mensajes.</p></div>}
        </div>
      </div>
    </>
  );
}
export function InboxView() { return <Suspense fallback={<div className="sk" style={{ height: 300 }} />}><Inbox /></Suspense>; }
