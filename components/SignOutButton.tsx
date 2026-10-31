"use client";
import { useState } from "react";
import { db } from "@/lib/supabase/browser";
// Cerrar sesión rápido (pedido de Cristian, 28-oct): antes pasaba por el servidor de la app (lento si estaba dormido).
// Ahora se cierra desde el teléfono: avisa a Supabase (máx. 1,2 s de espera), borra la sesión guardada y va a la entrada.
export function SignOutButton({ className, style, label = "Cerrar sesión", role }: { className?: string; style?: React.CSSProperties; label?: string; role?: string }) {
  const [busy, setBusy] = useState(false);
  const out = async () => {
    if (busy) return; setBusy(true);
    await Promise.race([db().auth.signOut({ scope: "local" }).catch(() => {}), new Promise((r) => setTimeout(r, 1200))]);
    try { document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n.startsWith("sb-")).forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/`; }); } catch { /* nada */ }
    try { localStorage.removeItem("yf-push-sync"); } catch { /* nada */ }
    try { await caches.delete("yf-pages-v1"); } catch { /* nada */ }   // las pantallas guardadas para usar sin señal (sw.js) son de esta cuenta
    window.location.replace("/login");
  };
  return <button type="button" className={className} style={style} role={role} disabled={busy} onClick={() => void out()}>{busy ? "Saliendo…" : label}</button>;
}
