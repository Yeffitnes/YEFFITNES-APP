"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
export async function setClientPlan(form: FormData) {
  const { supabase, profile } = await requireUser();
  if (profile.role !== "coach") return; // además, RLS lo impide en la base de datos
  const id = String(form.get("clientId")), planId = String(form.get("planId") || "");
  await supabase.from("clients").update(planId ? { plan_id: planId, status: "active" } : { plan_id: null, status: "pending" }).eq("id", id);
  revalidatePath("/coach");
}
