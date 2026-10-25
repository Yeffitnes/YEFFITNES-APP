"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function signIn(_: string | null, form: FormData) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
  if (error || !data.user) return "Correo o contraseña incorrectos.";
  // Directo a su panel (evita un salto extra por /inicio → /coach).
  const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(p?.role === "coach" ? "/coach" : "/inicio");
}
export async function signUp(_: string | null, form: FormData) {
  const { data, error } = await createClient().auth.signUp({
    email: String(form.get("email")), password: String(form.get("password")),
    options: { data: { full_name: String(form.get("name")) } },
  });
  if (error) return "No pudimos crear tu cuenta. Revisa los datos e inténtalo de nuevo.";
  // Con confirmación de correo activada no hay sesión todavía: avisar en vez de rebotar al login sin explicación.
  if (!data.session) return "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra.";
  redirect("/inicio");
}
export async function signOut() { await createClient().auth.signOut(); redirect("/login"); }
