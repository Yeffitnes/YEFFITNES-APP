import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { FeatureGate } from "@/components/FeatureGate";
export default async function Inicio() {
  const { supabase, profile } = await requireUser();
  if (profile.role === "coach") redirect("/coach");
  const { data: client } = await supabase.from("clients").select("status, plans(features)").eq("profile_id", profile.id).single();
  if (!client || client.status !== "active") redirect("/pendiente");
  const features = (client.plans as unknown as { features: string[] } | null)?.features ?? [];
  const name = profile.full_name;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="font-display text-2xl font-semibold">Hola, {name}</h1>
      <FeatureGate features={features} feature="training" name={name}><div className="rounded-2xl border border-line bg-white p-5">Tu rutina de hoy aparecerá aquí. (Fase 3)</div></FeatureGate>
      <FeatureGate features={features} feature="nutrition" name={name}><div className="rounded-2xl border border-line bg-white p-5">Tu plan de nutrición aparecerá aquí.</div></FeatureGate>
      <FeatureGate features={features} feature="education_full" name={name}><div className="rounded-2xl border border-line bg-white p-5">Biblioteca completa.</div></FeatureGate>
      <form action={signOut}><button className="text-sm text-dim underline">Salir</button></form>
    </main>
  );
}
