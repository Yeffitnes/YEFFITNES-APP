"use client";
import { useEffect } from "react";
export function Modal({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 680 } : undefined}>
        <button className="modal-close-x" aria-label="Cerrar" onClick={onClose}><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" /></svg></button>
        <div className="modal-title">{title}</div>{sub && <div className="modal-sub">{sub}</div>}{children}
      </div>
    </div>
  );
}
export const Skeleton = ({ rows = 4 }: { rows?: number }) => <div aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="sk" style={{ height: 68, marginBottom: 10 }} />)}</div>;
