"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClients } from "@/lib/queries";
import { gradient, initials } from "@/lib/format";
// Buscador rápido de clientes (atajo ⌘K / Ctrl+K), disponible en todo el panel.
export function QuickSearch() {
  const clients = useClients(), router = useRouter(), [q, setQ] = useState(""), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const res = useMemo(() => { const k = q.trim().toLowerCase(); return k ? (clients.data ?? []).filter((c) => c.name.toLowerCase().includes(k)).slice(0, 6) : []; }, [q, clients.data]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); } };
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", key); document.addEventListener("mousedown", away);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("mousedown", away); };
  }, []);
  const go = (id: string) => { setQ(""); setOpen(false); input.current?.blur(); router.push(`/coach/clientes/${id}`); };
  return (
    <div className="qs" ref={box}>
      <svg viewBox="0 0 20 20" aria-hidden><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" /></svg>
      <input ref={input} type="search" aria-label="Buscar cliente" placeholder="Buscar cliente…" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && res[0]) go(res[0].id); if (e.key === "Escape") { setOpen(false); input.current?.blur(); } }} />
      <kbd className="qs-kbd">⌘K</kbd>
      {open && q.trim() && <div className="qs-pop">{res.length ? res.map((c, i) => <button key={c.id} className="qs-item" onClick={() => go(c.id)}><span className="side-avatar" style={{ background: gradient(i), color: "#fff", width: 28, height: 28, fontSize: 11 }}>{initials(c.name)}</span>{c.name}<span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>{c.plan ?? (c.status === "pending" ? "Sin plan" : "")}</span></button>) : <p className="act-empty" style={{ margin: 8 }}>Ningún cliente coincide.</p>}</div>}
    </div>
  );
}
