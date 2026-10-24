import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ago, gradient, initials } from "@/lib/format";
const ST: Record<string, [string, string]> = { pending: ["Pendiente", "review"], active: ["Activo", "ok"], paused: ["Pausado", "review"] };
export default async function Clientes({ searchParams }: { searchParams: { f?: string; q?: string } }) {
  const { supabase } = await requireUser();
  let q = supabase.from("clients").select("id,status,created_at,plans(name),profiles!inner(full_name,role)").eq("profiles.role", "client").order("created_at", { ascending: false });
  if (searchParams.f && ST[searchParams.f]) q = q.eq("status", searchParams.f);
  const { data, error } = await q;
  const term = (searchParams.q ?? "").toLowerCase();
  const rows = (data ?? []).filter((c) => !term || (c.profiles as unknown as { full_name: string }).full_name.toLowerCase().includes(term));
  const pend = (data ?? []).filter((c) => c.status === "pending").length;
  const chip = (f: string | undefined, t: string) => <Link key={t} href={f ? `?f=${f}` : "?"} className={`filter-chip${searchParams.f === f ? " active" : ""}`}>{t}</Link>;
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Clientes</div><h1>{rows.length} {rows.length === 1 ? "cliente" : "clientes"}</h1>
        <p className="greeting-sub">{pend ? `${pend} pendiente${pend > 1 ? "s" : ""} de activar` : "Todos al día"}</p></div></div>
      <form className="filter-row"><div className="search-box"><input name="q" defaultValue={searchParams.q} placeholder="Buscar cliente..." />{searchParams.f && <input type="hidden" name="f" value={searchParams.f} />}</div>
        {chip(undefined, "Todos")}{chip("pending", "Pendientes")}{chip("active", "Activos")}{chip("paused", "Pausados")}</form>
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>No pudimos cargar los clientes. Recarga la página.</p>}
      {!error && !rows.length && <div className="card"><p style={{ color: "var(--text-dim)", fontSize: 14 }}>Todavía no hay clientes. Cuando alguien se registre aparecerá aquí como pendiente.</p></div>}
      {!!rows.length && <div className="card">{rows.map((c, i) => {
        const name = (c.profiles as unknown as { full_name: string }).full_name || "Sin nombre";
        const plan = (c.plans as unknown as { name: string } | null)?.name;
        const [label, cls] = ST[c.status];
        return (
          <Link key={c.id} href={`/coach/clientes/${c.id}`} className="client-row">
            <div className="client-avatar" style={{ background: gradient(i) }}>{initials(name)}</div>
            <div className="client-info"><div className="client-name">{name}</div><div className="client-plan">{plan ? `Plan ${plan}` : "Sin plan asignado"}</div></div>
            <div className="client-activity">{ago(c.created_at)}</div>
            <div className={`client-status ${cls}`}>{label}</div>
          </Link>);
      })}</div>}
    </div>
  );
}
