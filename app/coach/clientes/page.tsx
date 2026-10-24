import { requireUser } from "@/lib/session";
import { ago } from "@/lib/format";
import { ClientsList, type ClientRow } from "@/components/coach/ClientsList";
export default async function Clientes() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("clients").select("id,status,created_at,plans(name),profiles!inner(full_name,role)").eq("profiles.role", "client").order("created_at", { ascending: false });
  const rows: ClientRow[] = (data ?? []).map((c) => ({ id: c.id, name: (c.profiles as unknown as { full_name: string }).full_name || "Sin nombre", plan: (c.plans as unknown as { name: string } | null)?.name ?? null, status: c.status as ClientRow["status"], ago: ago(c.created_at) }));
  const pend = rows.filter((r) => r.status === "pending").length;
  return (
    <div>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Clientes</div><h1>{rows.length} {rows.length === 1 ? "cliente" : "clientes"}</h1>
        <p className="greeting-sub">{pend ? `${pend} pendiente${pend > 1 ? "s" : ""} de activar` : "Todos al día"}</p></div></div>
      {error ? <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>No pudimos cargar los clientes. Recarga la página.</p> : <ClientsList rows={rows} />}
    </div>
  );
}
