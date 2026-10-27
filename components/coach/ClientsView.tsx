"use client";
import { useState } from "react";
import Link from "next/link";
import { useClients } from "@/lib/queries";
import { ago, gradient, initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/Modal";
const ST = { pending: ["Pendiente", "review"], active: ["Activo", "ok"], paused: ["Pausado", "review"] } as const;
const FILTERS: [string, string][] = [["all", "Todos"], ["pending", "Pendientes"], ["active", "Activos"], ["paused", "Pausados"]];
export function ClientsView() {
  const { data, isPending, isError, refetch } = useClients();
  const [f, setF] = useState("all"), [q, setQ] = useState("");
  const rows = data ?? [], pend = rows.filter((r) => r.status === "pending").length;
  // Quien pidió acceso va primero: Jeff lo activa y le asigna el plan desde su ficha.
  const asked = (r: (typeof rows)[number]) => (r.status === "pending" && r.accessRequestedAt ? +new Date(r.accessRequestedAt) : 0);
  const list = rows.filter((r) => (f === "all" || r.status === f) && r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => asked(b) - asked(a));
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Clientes</div><h1>{data ? `${rows.length} ${rows.length === 1 ? "cliente" : "clientes"}` : "Clientes"}</h1>
        <p className="greeting-sub">{!data ? "Cargando…" : pend ? `${pend} pendiente${pend > 1 ? "s" : ""} de activar` : "Todos al día"}</p></div></div>
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." aria-label="Buscar cliente" /></div>
        {FILTERS.map(([k, t]) => <button key={k} onClick={() => setF(k)} className={`filter-chip${f === k ? " active" : ""}`}>{t}</button>)}
      </div>
      {isPending && <Skeleton />}
      {isError && <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar los clientes. <button className="filter-chip" onClick={() => refetch()}>Reintentar</button></p></div>}
      {data && !rows.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Todavía no hay clientes. Cuando alguien se registre aparecerá aquí como pendiente.</p></div>}
      {data && !!rows.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún cliente coincide con ese filtro.</p></div>}
      {!!list.length && <div className="card">{list.map((c, i) => (
        <Link key={c.id} href={`/coach/clientes/${c.id}`} className="client-row">
          <div className="client-avatar" style={{ background: gradient(i) }}>{initials(c.name)}</div>
          <div className="client-info"><div className="client-name">{c.name}</div><div className="client-plan">{c.plan ? `Plan ${c.plan}` : c.status === "pending" && c.accessRequestedAt ? `Pidió acceso · ${ago(c.accessRequestedAt).toLowerCase()} · asígnale un plan` : "Sin plan asignado"}</div></div>
          <div className="client-activity">{ago(c.createdAt)}</div>
          <div className={`client-status ${ST[c.status][1]}`}>{ST[c.status][0]}</div>
        </Link>))}</div>}
    </div>
  );
}
