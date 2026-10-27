"use client";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import { initials } from "@/lib/format";
// Perfil en celular: el círculo con las iniciales abre un menú pequeño con "Cerrar sesión".
export function ProfileMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }, esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="pm" ref={box}>
      <button type="button" className="pm-btn" aria-label="Mi perfil" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{initials(name)}</button>
      {open && <div className="pm-menu" role="menu">
        <div className="pm-who"><b>{name || role}</b><span>{role}</span></div>
        <form action={signOut}><button className="pm-out" role="menuitem">Cerrar sesión</button></form>
      </div>}
    </div>
  );
}
