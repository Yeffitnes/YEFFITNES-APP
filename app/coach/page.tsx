import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { setClientPlan } from "./actions";
const BADGE: Record<string, string> = { pending: "bg-amber-100 text-amber-800", active: "bg-emerald-100 text-emerald-800", paused: "bg-gray-200 text-gray-700" };
const LABEL: Record<string, string> = { pending: "Pendiente", active: "Activo", paused: "Pausado" };
export default async function Coach() {
  const { supabase, profile } = await requireUser();
  if (profile.role !== "coach") redirect("/inicio");
  const [{ data: clients, error }, { data: plans }] = await Promise.all([
    supabase.from("clients").select("id,status,plan_id,created_at,profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("plans").select("id,name").eq("active", true).order("name"),
  ]);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-semibold">Clientes</h1>
        <form action={signOut}><button className="text-sm text-dim underline">Salir</button></form></div>
      {error && <p role="alert" className="mt-4 text-sm text-accent">No pudimos cargar los clientes. Recarga la página.</p>}
      {!error && !clients?.length && <p className="mt-6 text-dim">Todavía no hay clientes. Cuando alguien se registre aparecerá aquí como pendiente.</p>}
      <ul className="mt-6 space-y-3">
        {clients?.map((c) => {
          const name = (c.profiles as unknown as { full_name: string } | null)?.full_name || "Sin nombre";
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{name}</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-0.5 font-mono text-[11px] ${BADGE[c.status]}`}>{LABEL[c.status]}</span></div>
              <form action={setClientPlan} className="flex items-center gap-2">
                <input type="hidden" name="clientId" value={c.id} />
                <select name="planId" defaultValue={c.plan_id ?? ""} className="input !w-auto !py-2">
                  <option value="">Sin plan (pendiente)</option>
                  {plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="btn-primary !px-4 !py-2 text-sm">Guardar</button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
