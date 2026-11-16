"use client";
// 15-nov (pedido de Jeff en la demo): Editar y Eliminar visibles en cada rutina y programa, también en el celular.
// Antes: en el celular "Editar" de las rutinas estaba oculto y "Archivar" solo aparecía al fondo de la ventana de edición.
// Eliminar = archivar (active=false): sale del catálogo y no se puede asignar más, pero los clientes que ya la tienen no pierden su plan
// (al asignar, la rutina se copia a su plan). Se puede recuperar desde Supabase si hiciera falta.
import { useState } from "react";

export function CatalogActions({ what, name, onEdit, onDelete, busy }: { what: "rutina" | "programa"; name: string; onEdit: () => void; onDelete: () => void; busy?: boolean }) {
  const [ask, setAsk] = useState(false);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (ask) return (
    <div className="cat-confirm" onClick={stop} role="group" aria-label={`Eliminar ${what}`}>
      <p>¿Eliminar {what === "rutina" ? "la rutina" : "el programa"} “{name}”? Sale de tu catálogo. Los clientes que ya {what === "rutina" ? "la" : "lo"} tienen no pierden su plan.</p>
      <div className="cat-acts">
        <button type="button" className="cat-act" onClick={() => setAsk(false)}>Cancelar</button>
        <button type="button" className="cat-act del strong" disabled={busy} onClick={onDelete}>{busy ? "Eliminando…" : "Sí, eliminar"}</button>
      </div>
    </div>);
  return (
    <div className="cat-acts" onClick={stop}>
      <button type="button" className="cat-act" onClick={onEdit}>Editar</button>
      <button type="button" className="cat-act del" onClick={() => setAsk(true)}>Eliminar</button>
    </div>);
}
