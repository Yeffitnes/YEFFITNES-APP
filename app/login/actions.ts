"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function signIn(_: string | null, form: FormData) {
  const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
  if (error) return "Correo o contraseña incorrectos.";
  redirect("/inicio");
}
export async function signUp(_: string | null, form: FormData) {
  const { error } = await createClient().auth.signUp({
    email: String(form.get("email")), password: String(form.get("password")),
    options: { data: { full_name: String(form.get("name")) } },
  });
  if (error) return "No pudimos crear tu cuenta. Revisa los datos e inténtalo de nuevo.";
  redirect("/inicio");
}
export async function signOut() { await createClient().auth.signOut(); redirect("/login"); }
