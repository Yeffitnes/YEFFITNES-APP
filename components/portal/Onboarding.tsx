"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCompleteOnboarding, useFirstCall, useGiveConsent, useMe, useSaveMeasure } from "@/lib/queries";
import { useProfile, useWorkspaceId } from "@/components/Providers";
import { Guide, type GuideDir, type GuidePose } from "./Guide";

// Bienvenida interactiva, solo la primera vez y solo con plan activo (va después de activar las notificaciones; ver FirstRun).
// El personaje recorre los paneles REALES de la app (los ilumina en el menú) y al final pide punto de partida, permiso de fotos y la llamada.
// La primera llamada es OBLIGATORIA (decisión de Cristian, 27-oct): no hay "más tarde"; "Saltar" lleva directo a ese paso.
// Textos = PROPUESTA (el contenido final y el diseño del personaje los define Jeff).
// topic: lo que hace el personaje después de señalar el panel (va con lo que el panel es).
type Spot = { kind: "spot"; href: string; title: string; text: string; topic: GuidePose };
type Step = { kind: "hello" } | Spot | { kind: "measures" } | { kind: "consent" } | { kind: "call" };
const TOUR: Spot[] = [
  { kind: "spot", href: "/inicio", title: "Hoy", text: "Lo primero que ves al abrir: tu rutina del día, tus series y tu reporte diario. Si no sabes qué hacer, empieza aquí.", topic: "workout" },
  { kind: "spot", href: "/inicio/plan", title: "Mi plan", text: "Tu semana completa de entrenamiento y tu nutrición, con vídeos de técnica de cada ejercicio.", topic: "flex" },
  { kind: "spot", href: "/inicio/agenda", title: "Agenda", text: "Aquí reservas tus llamadas conmigo en los horarios que publico.", topic: "wave" },
  { kind: "spot", href: "/inicio/progreso", title: "Progreso", text: "Tu peso, tus medidas y tus fotos. Así vemos juntos cómo cambias semana a semana.", topic: "squat" },
  { kind: "spot", href: "/inicio/material", title: "Material", text: "Vídeos y guías que preparo para ti: técnica, consejos y el vídeo de la semana.", topic: "point" },
  { kind: "spot", href: "/inicio/mensajes", title: "Mensajes", text: "Para lo importante: hasta 3 mensajes al día, una foto y un vídeo. Yo te respondo con calma.", topic: "wave" },
];
// Busca el enlace visible en el menú (abajo en el celular, a la izquierda en el computador, o el botón de mensajes de arriba).
function findTarget(href: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`.bottom-nav a[href="${href}"], .side-nav a[href="${href}"], .act-btn[href="${href}"], a.act-btn[href="${href}"]`));
  return all.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null;
}

export function Onboarding() {
  const { profileId, name } = useProfile(), ws = useWorkspaceId(), me = useMe(profileId), done = useCompleteOnboarding(profileId), router = useRouter();
  const save = useSaveMeasure(me.data?.id ?? "", ws), consent = useGiveConsent(profileId), call = useFirstCall(me.data?.status === "active" ? me.data.id : "");
  const [i, setI] = useState(0), [w, setW] = useState(""), [waist, setWaist] = useState(""), [err, setErr] = useState("");
  const hasProgress = !!me.data?.features.includes("progress");
  const steps: Step[] = [{ kind: "hello" }, ...TOUR, ...(hasProgress ? [{ kind: "measures" } as Step, { kind: "consent" } as Step] : []), { kind: "call" }];
  const step = steps[Math.min(i, steps.length - 1)];
  const next = () => { setErr(""); setI((x) => Math.min(x + 1, steps.length - 1)); };
  const back = () => { setErr(""); setI((x) => Math.max(x - 1, 0)); };
  const finish = (go?: string) => { done.mutate(); if (go) router.push(go); };
  if (!me.data || me.data.status !== "active" || me.data.onboarded) return null;
  const first = name.split(" ")[0] || "";
  const saveMeasures = () => {
    const wt = w.trim() === "" ? null : Number(w.replace(",", ".")), ws2 = waist.trim() === "" ? null : Number(waist.replace(",", "."));
    if ((wt != null && !(wt >= 20 && wt <= 400)) || (ws2 != null && !(ws2 >= 30 && ws2 <= 300))) return setErr("Revisa los números: peso entre 20 y 400 kg, cintura entre 30 y 300 cm.");
    if (wt == null && ws2 == null) return next();
    save.mutate({ ...(wt != null ? { weight: wt } : {}), ...(ws2 != null ? { waist: ws2 } : {}) }, { onSuccess: next, onError: () => setErr("No pudimos guardarlo. Puedes seguir y hacerlo después en Progreso.") });
  };
  const dots = <div className="tour-dots" aria-label={`Paso ${i + 1} de ${steps.length}`}>{steps.map((_, k) => <i key={k} className={k === i ? "on" : k < i ? "done" : ""} />)}</div>;
  const toCall = () => { setErr(""); setI(steps.length - 1); };
  const skip = step.kind === "call" ? null : <button type="button" className="tour-skip" onClick={toCall}>Saltar</button>;
  // Cada paso con su gesto: saluda al entrar, saca músculo en el punto de partida, celebra al agendar.
  const pose: GuidePose = step.kind === "hello" ? "wave" : step.kind === "call" ? "cheer" : step.kind === "measures" ? "flex" : "idle";
  const booked = !!call.data?.any;

  if (step.kind === "spot") return <SpotStep key={step.href} step={step} dots={dots} skip={skip} onNext={next} onBack={back} />;
  return createPortal(
    <div className="modal-backdrop open tour-center" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <div className="modal-box tour-box">
        <div className="tour-top"><span key={i} className="gd-pop"><Guide size={step.kind === "hello" || step.kind === "call" ? 92 : 70} pose={pose} /></span>{skip}</div>
        <div key={`t${i}`}>
        {step.kind === "hello" && <>
          <div className="modal-title say">¡Hola{first ? `, ${first}` : ""}! Soy Jeff.</div>
          <div className="modal-sub say say-2">Tu plan ya está activo. Así vamos a trabajar:</div>
          <ol className="ob-steps say say-3">
            <li><b>1</b><span>Agendas tu <b>primera llamada</b> conmigo para conocernos.</span></li>
            <li><b>2</b><span>Con lo que hablemos, <b>armo tu rutina y tu nutrición</b> especialmente para ti.</span></li>
            <li><b>3</b><span>Entrenas, registras tus series y me envías tu <b>reporte</b>. Yo reviso y ajusto.</span></li>
          </ol>
          <div className="modal-actions">{dots}<button className="modal-btn primary" onClick={next}>Ver la app</button></div></>}
        {step.kind === "measures" && <>
          <div className="modal-title say">Tu punto de partida</div>
          <div className="modal-sub say say-2">Con esto vemos tu avance desde el primer día. Si no lo tienes a mano, lo haces después en Progreso.</div>
          <div className="modal-field"><label htmlFor="ow">Peso (kg)</label><input id="ow" inputMode="decimal" value={w} onChange={(e) => { setW(e.target.value); setErr(""); }} placeholder="Ej. 68.5" /></div>
          <div className="modal-field"><label htmlFor="oc">Cintura (cm, opcional)</label><input id="oc" inputMode="decimal" value={waist} onChange={(e) => { setWaist(e.target.value); setErr(""); }} placeholder="Ej. 78" /></div>
          {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13 }}>{err}</p>}
          <div className="modal-actions">{dots}<button className="modal-btn ghost" onClick={next}>Omitir</button><button className="modal-btn primary" disabled={save.isPending} onClick={saveMeasures}>{save.isPending ? "Guardando…" : "Guardar y seguir"}</button></div></>}
        {step.kind === "consent" && <>
          <div className="modal-title say">Fotos de progreso</div>
          <div className="modal-sub say say-2">Para ver tu cambio puedes subir fotos tuyas. Son privadas: solo las vemos tú y yo, nunca se publican y las puedes borrar cuando quieras.</div>
          <p className="tour-note">¿Aceptas guardar tus fotos de progreso en la app con estas condiciones?</p>
          {err && <p role="alert" style={{ color: "var(--accent)", fontSize: 13 }}>{err}</p>}
          <div className="modal-actions">{dots}<button className="modal-btn ghost" onClick={next}>Ahora no</button><button className="modal-btn primary" disabled={consent.isPending} onClick={() => consent.mutate(undefined, { onSuccess: next, onError: () => setErr("No pudimos guardarlo. Puedes aceptarlo después en Progreso.") })}>{consent.isPending ? "Guardando…" : "Acepto"}</button></div></>}
        {step.kind === "call" && <>
          <div className="modal-title say">{booked ? "¡Ya tienes tu llamada!" : "Primer paso: tu llamada conmigo"}</div>
          <div className="modal-sub say say-2">{booked ? "Nos vemos en la llamada. Después armo tu rutina y tu nutrición, y te aviso cuando estén listas." : "Todo empieza aquí: en la llamada nos conocemos y después armo tu rutina y tu nutrición. Elige el horario que te sirva."}</div>
          <div className="modal-actions">{dots}{booked
            ? <button className="modal-btn primary" onClick={() => finish()}>Listo</button>
            : <button className="modal-btn primary" onClick={() => finish("/inicio/agenda")}>Elegir mi horario</button>}</div></>}
        </div>
      </div>
    </div>, document.body);
}

// Paso que ilumina un panel real del menú y pone al personaje al lado, con su explicación.
function SpotStep({ step, dots, skip, onNext, onBack }: { step: Spot; dots: React.ReactNode; skip: React.ReactNode; onNext: () => void; onBack: () => void }) {
  const [r, setR] = useState<DOMRect | null>(null);
  // Primero señala el panel en el menú; un momento después hace el gesto del tema (mancuerna en Hoy, músculo en Mi plan, sentadilla en Progreso…).
  const [act, setAct] = useState<GuidePose>("point");
  useEffect(() => { setAct("point"); if (step.topic === "point") return; const t = setTimeout(() => setAct(step.topic), 1800); return () => clearTimeout(t); }, [step]);
  const measure = useCallback(() => { const el = findTarget(step.href); setR(el ? el.getBoundingClientRect() : null); }, [step.href]);
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true); const t = setTimeout(measure, 300);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); clearTimeout(t); }; }, [measure]);
  const vw = typeof window !== "undefined" ? window.innerWidth : 400, vh = typeof window !== "undefined" ? window.innerHeight : 800, pad = 6;
  // Dónde va la burbuja: encima si el panel está abajo (celular), a la derecha si está en el menú lateral, debajo si está arriba.
  const W = Math.min(340, vw - 32);
  let pos: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: W }, dir: GuideDir = "down";
  if (r) {
    if (r.top > vh * 0.6) { pos = { left: Math.min(Math.max(16, r.left + r.width / 2 - W / 2), vw - W - 16), bottom: vh - r.top + 18, width: W }; dir = "down"; }
    else if (r.right < vw * 0.4) { pos = { left: r.right + 18, top: Math.min(Math.max(16, r.top + r.height / 2 - 90), vh - 300), width: W }; dir = "left"; }
    else { pos = { left: Math.min(Math.max(16, r.left + r.width / 2 - W / 2), vw - W - 16), top: r.bottom + 18, width: W }; dir = "up"; }
  }
  return createPortal(
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label={`Recorrido: ${step.title}`}>
      {r ? <div className="tour-ring" style={{ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 }} /> : <div className="tour-dim" />}
      <div className="tour-bubble" style={pos}>
        <div className="tour-bubble-head"><span className="gd-pop tour-guide"><Guide size={58} pose={act} dir={dir} /></span><div className="say"><div className="tour-bubble-eyebrow">Panel</div><div className="tour-bubble-title">{step.title}</div></div>{skip}</div>
        <p className="tour-bubble-text say say-2">{step.text}</p>
        <div className="tour-bubble-actions">{dots}<button type="button" className="modal-btn ghost" onClick={onBack}>Atrás</button><button type="button" className="modal-btn primary" onClick={onNext}>Siguiente</button></div>
      </div>
    </div>, document.body);
}
