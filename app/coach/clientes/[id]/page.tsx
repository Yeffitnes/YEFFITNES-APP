import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/coach/SubmitButton";
import { requireUser } from "@/lib/session";
import { initials } from "@/lib/format";
import { setClientPlan } from "../actions";
export default async function Ficha({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const { supabase } = await requireUser();
  const [{ data: c }, { data: plans }] = await Promise.all([
    supabase.from("clients").select("id,status,plan_id,created_at,profiles(full_name)").eq("id", params.id).maybeSingle(),
    supabase.from("plans").select("id,name").eq("active", true).order("name"),
  ]);
  if (!c) notFound();
  const name = (c.profiles as unknown as { full_name: string } | null)?.full_name || "Sin nombre";
  const since = new Date(c.created_at).toLocaleDateString("es", { month: "long", year: "numeric" });
  return (
    <div>
      <Link href="/coach/clientes" className="back-link">← Volver a clientes</Link>
      <div className="ficha-header"><div className="ficha-avatar">{initials(name)}</div>
        <div><div className="ficha-name">{name}</div><div className="ficha-meta">Registrado en {since} · {c.status === "pending" ? "Pendiente de activar" : c.status === "active" ? "Activo" : "Pausado"}</div></div></div>
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-tag">Plan y acceso</div>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0 14px" }}>Al asignar un plan, el cliente queda activo y ve solo lo que ese plan incluye. Sin plan, todo aparece bloqueado.</p>
        <form action={setClientPlan} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input type="hidden" name="clientId" value={c.id} />
          <select name="planId" defaultValue={c.plan_id ?? ""} style={{ height: 38, borderRadius: 11, border: "1px solid var(--line)", padding: "0 12px", fontSize: 13, flex: 1 }}>
            <option value="">Sin plan (pendiente)</option>{plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <SubmitButton>Guardar</SubmitButton>
        </form>
        {searchParams.ok && <p style={{ color: "var(--accent)", fontSize: 13, marginTop: 10 }}>Cambios guardados.</p>}
        {searchParams.error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>No pudimos guardar. Inténtalo de nuevo.</p>}
      </div>
    </div>
  );
}
