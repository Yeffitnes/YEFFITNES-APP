import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type Role = "coach" | "client";
const getSupabase = cache(() => createClient());
// Una sola verificación de sesión y un solo perfil por petición (layout y página lo comparten).
const getSession = cache(async () => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getClaims(); // verifica el token localmente, sin viaje de red
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name, workspace_id").eq("id", uid).maybeSingle();
  return { supabase, uid, profile };
});
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.profile) redirect("/sin-perfil");
  return { supabase: s.supabase, user: { id: s.uid }, profile: s.profile };
}
