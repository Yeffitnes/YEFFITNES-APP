"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompleteOnboarding, useMe, useSaveMeasure } from "@/lib/queries";
import { useProfile, useWorkspaceId } from "@/components/Providers";
// Bienvenida de un minuto, solo la primera vez. Textos = PROPUESTA (el contenido y el personaje guía los define Jeff).
export function Onboarding() {
  const { profileId, name } = useProfile(), ws = useWorkspaceId(), me = useMe(profileId), done = useCompleteOnboarding(profileId), save = useSaveMeasure(me.data?.id ?? "", ws), router = useRouter();
  const [step, setStep] = useState(0), [w, setW] = useState(""), [waist, setWaist] = useState(""), [err, setErr] = useState("");
  if (!me.data || me.data.status !== "active" || me.data.onboarded) return null;
  const first = name.split(" ")[0] || "";
  const finish = (go?: string) => { done.mutate(); if (go) router.push(go); };
  const saveMeasures = () => {
    const wt = w.trim() === "" ? null : Number(w.replace(",", ".")), ws2 = waist.trim() === "" ? null : Number(waist.replace(",", "."));
    if ((wt != null && !(wt >= 20 && wt <= 400)) || (ws2 != null && !(ws2 >= 30 && ws2 <= 300))) return setErr("Revisa los números: peso entre 20 y 400 kg, cintura entre 30 y 300 cm.");
    if (wt == null && ws2 == null) return setStep(2);
    save.mutate({ ...(wt != null ? { weight: wt } : {}), ...(ws2 != null ? { waist: ws2 } : {}) }, { onSuccess: () => setStep(2) });
  };
  return (
    <div className="modal-backdrop open" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className="fv-avatar" style={{ width: 38, height: 38, fontSize: 15 }}>J</span>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Paso {step + 1} de 3 · <button style={{ background: "none", border: 0, color: "var(--text-dim)", textDecoration: "underline", cursor: "pointer", font: "inherit" }} onClick={() => finish()}>Saltar</button></div>
        </div>
        {step === 0 && <>
          <div className="modal-title">¡Bienvenido{first ? `, ${first}` : ""}!</div>
          <div className="modal-sub">Soy Jeff, tu coach. Así funciona todo en un minuto:</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
            <div>🏋️ <b>Hoy</b>: tu rutina del día. Registra tus series y cómo te sentiste.</div>
            <div>🎥 <b>Reporte diario</b>: un vídeo corto y un comentario cuando termines.</div>
            <div>📈 <b>Progreso</b>: tus medidas y fotos para ver tu cambio.</div>
            <div>📅 <b>Agenda</b>: reserva tu llamada conmigo.</div>
          </div>
          <div className="modal-actions"><button className="modal-btn primary" onClick={() => setStep(1)}>Empezar</button></div></>}
        {step === 1 && <>
          <div className="modal-title">Tu punto de partida</div>
          <div className="modal-sub">Así podremos ver tu avance. Puedes omitirlo y hacerlo después en Progreso.</div>
          <div className="modal-field"><label htmlFor="ow">Peso (kg)</label><input id="ow" inputMode="decimal" value={w} onChange={(e) => { setW(e.target.value); setErr(""); }} placeholder="Ej. 68.5" /></div>
          <div className="modal-field"><label htmlFor="oc">Cintura (cm, opcional)</label><input id="oc" inputMode="decimal" value={waist} onChange={(e) => { setWaist(e.target.value); setErr(""); }} placeholder="Ej. 78" /></div>
          {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13 }}>{err}</p>}
          <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setStep(2)}>Omitir</button><button className="modal-btn primary" disabled={save.isPending} onClick={saveMeasures}>{save.isPending ? "Guardando…" : "Guardar y seguir"}</button></div></>}
        {step === 2 && <>
          <div className="modal-title">Agenda tu llamada conmigo</div>
          <div className="modal-sub">Hablamos por llamada para conocernos y ajustar tu plan. Elige un horario disponible.</div>
          <div className="modal-actions"><button className="modal-btn ghost" onClick={() => finish()}>Más tarde</button><button className="modal-btn primary" onClick={() => finish("/inicio/agenda")}>Ver horarios</button></div></>}
      </div>
    </div>
  );
}
