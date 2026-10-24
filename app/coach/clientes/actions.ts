"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
export async function setClientPlan(form: FormData) {
  const { supabase, profile } = await requireUser();
  if (profile.role !== "coach") redirect("/inicio"); // además lo impide RLS
  const id = String(form.get("clientId")), planId = String(form.get("planId") || "");
  const { error } = await supabase.from("clients").update(planId ? { plan_id: planId, status: "active" } : { plan_id: null, status: "pending" }).eq("id", id);
  if (error) redirect(`/coach/clientes/${id}?error=1`);
  revalidatePath("/coach/clientes");
  redirect(`/coach/clientes/${id}?ok=1`);
}
