"use client";
import { useEffect, useState } from "react";
import { useClientNutrition, useMaterialList, useMe, useMyAnnouncements, useMyBookings } from "@/lib/queries";
import { useThread } from "@/lib/messages";
import { useProfile } from "@/components/Providers";
// Precarga en segundo plano (sin dibujar nada) lo que cada pestaña va a necesitar: al tocarla, ya está lista.
// Espera un momento para no competir con lo que Hoy necesita primero.
export function Warmup() {
  const { profileId } = useProfile(), me = useMe(profileId).data, [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 1500); return () => clearTimeout(t); }, []);
  const f = me?.features ?? [], cid = on ? me?.id ?? "" : "";
  useMyBookings(cid); useMaterialList(); useMyAnnouncements(on && f.includes("announcements")); useClientNutrition(on && f.includes("nutrition") ? cid : ""); useThread(undefined, on);
  return null;
}
