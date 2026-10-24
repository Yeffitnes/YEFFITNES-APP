"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children, className = "primary-btn", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();
  return <button className={className} style={style} disabled={pending}>{pending ? "Guardando…" : children}</button>;
}
