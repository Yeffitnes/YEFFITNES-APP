"use client";
import { useState } from "react";
import Link from "next/link";
import { gradient, initials } from "@/lib/format";
export type ClientRow = { id: string; name: string; plan: string | null; status: "pending" | "active" | "paused"; ago: string };
const ST = { pending: ["Pendiente", "review"], active: ["Activo", "ok"], paused: ["Pausado", "review"] } as const;
const FILTERS: [string, string][] = [["all", "Todos"], ["pending", "Pendientes"], ["active", "Activos"], ["paused", "Pausados"]];
export function ClientsList({ rows }: { rows: ClientRow[] }) {
  const [f, setF] = useState("all"), [q, setQ] = useState("");
  const list = rows.filter((r) => (f === "all" || r.status === f) && r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="filter-row">
        <div className="search-box"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><line x1="13.2" y1="13.2" x2="17" y2="17" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." aria-label="Buscar cliente" /></div>
        {FILTERS.map(([k, t]) => <button key={k} onClick={() => setF(k)} className={`filter-chip${f === k ? " active" : ""}`}>{t}</button>)}
      </div>
      {!rows.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Todavía no hay clientes. Cuando alguien se registre aparecerá aquí como pendiente.</p></div>}
      {!!rows.length && !list.length && <div className="card"><p style={{ fontSize: 14, color: "var(--text-dim)" }}>Ningún cliente coincide con ese filtro.</p></div>}
      {!!list.length && <div className="card">{list.map((c, i) => (
        <Link key={c.id} href={`/coach/clientes/${c.id}`} className="client-row">
          <div className="client-avatar" style={{ background: gradient(i) }}>{initials(c.name)}</div>
          <div className="client-info"><div className="client-name">{c.name}</div><div className="client-plan">{c.plan ? `Plan ${c.plan}` : "Sin plan asignado"}</div></div>
          <div className="client-activity">{c.ago}</div>
          <div className={`client-status ${ST[c.status][1]}`}>{ST[c.status][0]}</div>
        </Link>))}</div>}
    </>
  );
}
