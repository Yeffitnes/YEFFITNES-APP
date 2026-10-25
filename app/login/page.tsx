"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp } from "./actions";
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full" disabled={pending}>{pending ? "Un momento…" : label}</button>;
}
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, act] = useFormState(mode === "in" ? signIn : signUp, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <form action={act} className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <img src="/brand/logo.svg" alt="YEFFITNES TRAINING" className="mx-auto h-8" />
        <h1 className="text-center font-display text-2xl font-semibold text-white">{mode === "in" ? "Entra a tu espacio" : "Crea tu cuenta"}</h1>
        {mode === "up" && <input name="name" required placeholder="Tu nombre" className="input" />}
        <input name="email" type="email" required placeholder="Correo" className="input" autoComplete="email" />
        <input name="password" type="password" required minLength={8} placeholder="Contraseña (mínimo 8)" className="input" autoComplete={mode === "in" ? "current-password" : "new-password"} />
        {err && <p role="alert" className={`text-sm ${err.startsWith("Te enviamos") ? "text-white/80" : "text-rose"}`}>{err}</p>}
        <Submit label={mode === "in" ? "Entrar" : "Registrarme"} />
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-white/60">
          {mode === "in" ? "¿Aún no tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
        </button>
      </form>
    </main>
  );
}
