import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type Role = "coach" | "client";
export async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name, workspace_id").eq("id", user.id).single();
  if (!profile) redirect("/login");
  return { supabase, user, profile };
}
