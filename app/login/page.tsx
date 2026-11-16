"use client";
// 15-nov: login rehecho con la marca Yeffitness (pedido de Cristian): fondo oscuro con brillo rojo suave, emblema, qué hay adentro
// (en computador) y un formulario con pestañas Entrar / Crear cuenta, etiquetas y "Mostrar" contraseña. Misma lógica de antes.
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp } from "./actions";
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full py-3.5 text-[15px]" disabled={pending}>{pending ? "Un momento…" : label}</button>;
}
const FIELD = "w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-neon focus:bg-white/[0.09]";
const POINTS = ["Tu rutina del día, serie por serie", "Tu reporte y la respuesta de Yeff", "Cómo avanzas, semana a semana"];
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in"), [show, setShow] = useState(false);
  const [err, act] = useFormState(mode === "in" ? signIn : signUp, null);
  const tab = (m: "in" | "up", t: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${mode === m ? "bg-white text-ink" : "text-white/60 hover:text-white"}`}>{t}</button>);
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute -left-48 -top-56 h-[620px] w-[620px] rounded-full" style={{ background: "radial-gradient(circle, rgba(247,37,75,.30), rgba(247,37,75,0) 65%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-64 -right-48 h-[620px] w-[620px] rounded-full" style={{ background: "radial-gradient(circle, rgba(205,177,112,.16), rgba(205,177,112,0) 65%)" }} />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-5xl items-center gap-10 px-6 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <section className="text-center md:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblema.webp" alt="" width={120} height={108} className="mx-auto h-[72px] w-auto md:mx-0 md:h-[108px]" style={{ filter: "drop-shadow(0 18px 40px rgba(247,37,75,.28))" }} />
          <p className="mt-5 font-display text-[40px] font-bold leading-none tracking-[-0.02em] md:text-[56px]">Yeffitness</p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-pearl">Portal privado de clientes</p>
          <h1 className="mx-auto mt-6 hidden max-w-md font-display text-2xl font-semibold leading-snug text-white/90 md:mx-0 md:block">Tu entrenamiento, tu nutrición y tu progreso, con Yeff.</h1>
          <ul className="mt-6 hidden space-y-3 md:block">{POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[15px] text-white/70"><span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon shadow-[0_0_10px_rgba(247,37,75,.9)]" />{p}</li>))}</ul>
        </section>
        <form action={act} className="mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur md:p-8">
          <div role="tablist" aria-label="Entrar o crear cuenta" className="flex gap-1 rounded-xl bg-white/[0.06] p-1">{tab("in", "Entrar")}{tab("up", "Crear cuenta")}</div>
          <h2 className="mt-6 font-display text-2xl font-semibold">{mode === "in" ? "Bienvenido de vuelta" : "Empieza con Yeff"}</h2>
          <p className="mt-1 text-sm text-white/55">{mode === "in" ? "Entra con el correo de tu cuenta." : "Crea tu cuenta y Yeff activará tu plan."}</p>
          <div className="mt-6 space-y-4">
            {mode === "up" && <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/60">Tu nombre</span><input name="name" required autoComplete="name" className={FIELD} placeholder="Nombre y apellido" /></label>}
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/60">Correo</span><input name="email" type="email" required autoComplete="email" inputMode="email" className={FIELD} placeholder="tu@correo.com" /></label>
            <div><div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white/60"><label htmlFor="lg-pass">Contraseña</label>
              <button type="button" onClick={() => setShow(!show)} aria-controls="lg-pass" className="font-bold text-white/60 underline-offset-2 hover:text-white hover:underline">{show ? "Ocultar" : "Mostrar"}</button></div>
              <input id="lg-pass" name="password" type={show ? "text" : "password"} required minLength={8} className={FIELD} placeholder={mode === "in" ? "Tu contraseña" : "Mínimo 8 caracteres"} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
          </div>
          {err && <p role="alert" className={`mt-4 rounded-xl px-3 py-2.5 text-sm ${err.startsWith("Te enviamos") ? "bg-white/[0.06] text-white/85" : "bg-neon/10 text-rose"}`}>{err}</p>}
          <div className="mt-6"><Submit label={mode === "in" ? "Entrar" : "Crear mi cuenta"} /></div>
          <p className="mt-5 text-center text-xs text-white/40">{mode === "in" ? "¿Aún no tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="font-bold text-white/75 underline-offset-2 hover:underline">{mode === "in" ? "Créala aquí" : "Entra"}</button></p>
        </form>
      </div>
    </main>
  );
}
