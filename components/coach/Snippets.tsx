"use client";
// Respuestas guardadas (pedido de Cristian, 30-oct, noche): las frases que Jeff repite, a un toque. Se usan al revisar entrenos y
// en Mensajes. Solo las ve Jeff (migración 0043). Un toque la agrega al texto; "Guardar esta" guarda lo que está escrito.
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceId } from "@/components/Providers";
import { useAddSnippet, useDeleteSnippet, useSnippets } from "@/lib/extras";

export function Snippets({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  const q = useSnippets(), add = useAddSnippet(useWorkspaceId()), del = useDeleteSnippet(), [edit, setEdit] = useState(false);
  if (q.data === null || q.isError) return null;   // 0043 sin correr
  const list = q.data ?? [], cur = text.trim(), saved = list.some((s) => s.body.trim() === cur);
  const pick = (b: string) => onPick(text.trim() ? `${text.replace(/\s+$/, "")} ${b}` : b);
  if (!list.length && !cur) return <p className="snip-row" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Escribe una respuesta que uses seguido y toca “Guardar esta”: la tendrás a un toque.</p>;
  return (
    <div className="snip-row" aria-label="Respuestas guardadas">
      {list.map((s) => edit
        ? <button key={s.id} type="button" className="snip del" title="Borrar esta respuesta" onClick={() => del.mutate(s.id)}><Icon name="close" size={11} /><span>{s.body}</span></button>
        : <button key={s.id} type="button" className="snip" title={s.body} onClick={() => pick(s.body)}><span>{s.body}</span></button>)}
      {cur && !saved && !edit && list.length < 40 && <button type="button" className="snip-tool" disabled={add.isPending} onClick={() => add.mutate(cur)}>Guardar esta</button>}
      {!!list.length && <button type="button" className="snip-tool" onClick={() => setEdit(!edit)}>{edit ? "Listo" : "Editar"}</button>}
    </div>
  );
}
