"use client";
import { useRef, useState } from "react";
import { useConsent, useGiveConsent, useMeasures, useDeletePhoto, usePhotos, useSaveMeasure, useUploadPhoto, type Measure, type MeasureInput } from "@/lib/queries";
import { useProfile, useToast, useWorkspaceId } from "@/components/Providers";
import { Modal, Skeleton } from "@/components/ui/Modal";
import { compressImage } from "@/lib/image";
import { RecordsCard, WeekSummary } from "@/components/WeekSummary";
type K = keyof MeasureInput;
const M: { id: string; label: string; k: K; unit: string; color: string }[] = [
  { id: "peso", label: "Peso", k: "weight", unit: "kg", color: "var(--neon)" }, { id: "cintura", label: "Cintura", k: "waist", unit: "cm", color: "var(--garnet)" },
  { id: "caderas", label: "Caderas", k: "hip", unit: "cm", color: "var(--pearl)" }, { id: "pecho", label: "Pecho", k: "chest", unit: "cm", color: "var(--rose)" },
  { id: "brazo", label: "Brazo", k: "arm", unit: "cm", color: "var(--ok)" }, { id: "pierna", label: "Pierna", k: "thigh", unit: "cm", color: "var(--amber)" },
];
const day = (d: string, y = false) => new Date(d + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short", ...(y ? { year: "numeric" } : {}) });
const fmt = (n: number) => n.toFixed(1);
export function ProgressPanels({ clientId, mode }: { clientId: string; mode: "client" | "coach" }) {
  const ms = useMeasures(clientId), photos = usePhotos(clientId);
  const [on, setOn] = useState<string[]>(["peso", "cintura"]), [modal, setModal] = useState(false);
  if (ms.isPending) return <Skeleton rows={3} />;
  if (ms.isError) return <div className="card"><p role="alert" style={{ fontSize: 14 }}>No pudimos cargar el progreso. <button className="filter-chip" onClick={() => ms.refetch()}>Reintentar</button></p></div>;
  const list = ms.data, mine = mode === "client";
  const extra = <>{mine && <WeekSummary clientId={clientId} first="" mode="client" />}<div style={{ marginBottom: 18 }}><RecordsCard clientId={clientId} mode={mode} /></div></>;
  const series = (k: K) => list.filter((m) => m[k] != null).map((m) => ({ d: m.date, v: m[k] as number }));
  const dates = list.slice(-6).map((m) => m.date), W = 600, H = 200;
  const pt = (k: K) => { const s = series(k).filter((p) => dates.includes(p.d)); if (!s.length) return [] as { x: number; y: number }[];
    const vs = s.map((p) => p.v), lo = Math.min(...vs), hi = Math.max(...vs);
    return s.map((p) => ({ x: dates.length > 1 ? (dates.indexOf(p.d) / (dates.length - 1)) * W : W / 2, y: hi === lo ? H / 2 : 175 - ((p.v - lo) / (hi - lo)) * 150 })); };
  return (
    <>
      {extra}
      {!list.length ? <div className="card"><div className="card-tag">Mediciones</div><p style={{ fontSize: 14, color: "var(--text-dim)", margin: "8px 0 12px", lineHeight: 1.6 }}>{mine ? "Aún no tienes mediciones. Registra tu peso y tus medidas para empezar a ver tu evolución." : "El cliente aún no ha registrado mediciones."}</p>{mine && <button className="add-btn" onClick={() => setModal(true)}>Registrar medición</button>}</div> : (
        <>
          <div className="metric-summary">{M.filter((m) => series(m.k).length).map((m) => { const s = series(m.k), last = s[s.length - 1].v, d = s.length > 1 ? last - s[s.length - 2].v : null;
            return <div key={m.id} className="metric-summary-card"><div className="metric-summary-dot" style={{ background: m.color }} /><div className="metric-summary-name">{m.label}</div><div className="metric-summary-val">{fmt(last)}{d != null && d !== 0 && <span className={`metric-summary-delta ${d < 0 ? "down" : "up"}`}>{d < 0 ? "−" : "+"}{fmt(Math.abs(d))}</span>}</div></div>; })}</div>
          <div className="progress-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card">
                <div className="chart-toolbar"><div><div className="card-tag">Tendencia</div><div className="card-title">Evolución por métrica</div><div className="card-meta">Últimas {dates.length} mediciones · activa o desactiva cada línea</div></div>
                  {mine && <button className="add-btn" onClick={() => setModal(true)}>Registrar medición</button>}</div>
                <div className="chip-row">{M.filter((m) => series(m.k).length).map((m) => <button key={m.id} className={`metric-chip${on.includes(m.id) ? " active" : " off"}`} aria-pressed={on.includes(m.id)} onClick={() => setOn(on.includes(m.id) ? on.filter((x) => x !== m.id) : [...on, m.id])}><span className="dot" style={{ background: m.color }} />{m.label}</button>)}</div>
                <div className="chart-svg-wrap"><svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Gráfica de evolución">
                  {M.filter((m) => on.includes(m.id)).map((m) => { const p = pt(m.k); return <g key={m.id} className="metric-series"><polyline points={p.map((q) => `${q.x},${q.y}`).join(" ")} stroke={m.color} fill="none" strokeWidth={2.4} vectorEffect="non-scaling-stroke" />{p.map((q, i) => <line key={i} x1={q.x} y1={q.y} x2={q.x + 0.01} y2={q.y} stroke={m.color} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}</g>; })}</svg>
                  <div className="chart-x-axis">{dates.map((d) => <span key={d}>{day(d)}</span>)}</div></div>
              </div>
              <div className="card"><div className="card-tag">Historial</div><div className="card-title" style={{ fontSize: 16 }}>Mediciones registradas</div>
                <div style={{ marginTop: 6 }}>{[...list].reverse().map((m: Measure) => <div key={m.id} className="history-row"><div className="history-date">{day(m.date)}</div><div className="history-body"><div className="history-vals">{M.filter((x) => m[x.k] != null).map((x) => <span key={x.id} style={{ marginRight: 12 }}><span>{x.label}</span> {fmt(m[x.k] as number)} {x.unit}</span>)}</div></div><div className={`history-source ${m.by}`}>{m.by === "coach" ? "Coach" : mine ? "Tú" : "Cliente"}</div></div>)}</div></div>
            </div>
            <Photos clientId={clientId} mine={mine} photos={photos} />
          </div>
        </>)}
      {!list.length && <div style={{ marginTop: 18 }}><Photos clientId={clientId} mine={mine} photos={photos} /></div>}
      {modal && <MeasureModal clientId={clientId} onClose={() => setModal(false)} />}
    </>
  );
}
function MeasureModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const save = useSaveMeasure(clientId, useWorkspaceId()), [v, setV] = useState<Record<string, string>>({}), [err, setErr] = useState("");
  const submit = () => {
    const out: MeasureInput = {};
    for (const m of M) { const raw = (v[m.id] ?? "").replace(",", "."); if (raw === "") continue; const n = Number(raw); if (!(n > 0)) return setErr(`Revisa el valor de ${m.label.toLowerCase()}.`); out[m.k] = n; }
    if (!Object.keys(out).length) return setErr("Escribe al menos un valor.");
    setErr(""); save.mutate(out, { onSuccess: onClose });
  };
  return (
    <Modal title="Registrar medición" sub="Se guardará con la etiqueta “Tú”. Si ya registraste hoy, se actualiza." onClose={onClose}>
      <div className="modal-row2">{M.map((m) => <div key={m.id} className="modal-field"><label htmlFor={`mm-${m.id}`}>{m.label} ({m.unit})</label><input id={`mm-${m.id}`} inputMode="decimal" value={v[m.id] ?? ""} onChange={(e) => setV({ ...v, [m.id]: e.target.value })} placeholder="—" /></div>)}</div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div className="modal-actions"><button className="modal-btn ghost" onClick={onClose}>Cancelar</button><button className="modal-btn primary" disabled={save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</button></div>
    </Modal>
  );
}
function Photos({ clientId, mine, photos }: { clientId: string; mine: boolean; photos: ReturnType<typeof usePhotos> }) {
  const { profileId } = useProfile(), ws = useWorkspaceId(), consent = useConsent(mine ? profileId : ""), give = useGiveConsent(profileId), up = useUploadPhoto(clientId, ws), del = useDeletePhoto(clientId), toast = useToast(), [rm, setRm] = useState<{ id: string; path: string; date: string } | null>(null);
  const [a, setA] = useState<string>(""), [b, setB] = useState<string>(""), [ask, setAsk] = useState(false), file = useRef<HTMLInputElement>(null);
  const ph = photos.data ?? [], before = ph.find((p) => p.id === (a || ph[0]?.id)), after = ph.find((p) => p.id === (b || ph[ph.length - 1]?.id));
  const [prep, setPrep] = useState(false), [view, setView] = useState<"pair" | "slide">("pair"), [cut, setCut] = useState(50);
  const pick = async (f?: File) => { if (!f) return; setPrep(true); try { up.mutate(await compressImage(f)); } catch { toast("No pudimos procesar esa imagen. Prueba con otra foto.", true); } finally { setPrep(false); } if (file.current) file.current.value = ""; };
  const frame = (p?: typeof ph[number]) => <div className="photo-frame">{p?.url ? <img src={p.url} alt={`Foto del ${day(p.date)}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Sin foto</span>}{p && <div className="photo-frame-tag">{day(p.date)}</div>}</div>;
  return (
    <div className="card">
      <div className="card-tag">Fotos de progreso</div><div className="card-title" style={{ fontSize: 16 }}>Antes / Después</div><div className="card-meta">Compara dos fechas cualquiera</div>
      {photos.isPending ? <div className="sk" style={{ height: 180, marginTop: 14 }} /> : photos.isError ? <p role="alert" style={{ fontSize: 13.5, marginTop: 10 }}>No pudimos cargar las fotos. <button className="filter-chip" onClick={() => photos.refetch()}>Reintentar</button></p>
        : !ph.length ? <p style={{ fontSize: 13.5, color: "var(--text-dim)", margin: "12px 0", lineHeight: 1.6 }}>{mine ? "Aún no has subido fotos. Sube la primera para poder comparar tu cambio más adelante." : "El cliente aún no ha subido fotos."}</p> : (
          <>
            {ph.length > 1 && <div className="ex-view ph-view" role="group" aria-label="Forma de comparar"><button type="button" aria-pressed={view === "pair"} className={view === "pair" ? "on" : ""} onClick={() => setView("pair")}>A la par</button><button type="button" aria-pressed={view === "slide"} className={view === "slide" ? "on" : ""} onClick={() => setView("slide")}>Deslizar</button></div>}
            <div className="photo-compare">
              <div className="photo-slot"><div className="photo-slot-label">Antes</div><select aria-label="Foto de antes" value={before?.id} onChange={(e) => setA(e.target.value)}>{ph.map((p) => <option key={p.id} value={p.id}>{day(p.date, true)}</option>)}</select>{view === "pair" && frame(before)}</div>
              <div className="photo-slot"><div className="photo-slot-label">Después</div><select aria-label="Foto de después" value={after?.id} onChange={(e) => setB(e.target.value)}>{ph.map((p) => <option key={p.id} value={p.id}>{day(p.date, true)}</option>)}</select>{view === "pair" && frame(after)}</div>
            </div>
            {/* Antes y después en el mismo cuadro: se arrastra la línea para ver uno u otro (30-oct, noche). */}
            {view === "slide" && <div className="ph-slide">
              <div className="photo-frame">{after?.url && <img src={after.url} alt={`Después: ${day(after.date)}`} />}
                {before?.url && <img src={before.url} alt={`Antes: ${day(before.date)}`} style={{ clipPath: `inset(0 ${100 - cut}% 0 0)` }} />}
                <i className="ph-line" style={{ left: `${cut}%` }} aria-hidden />
                {before && <div className="photo-frame-tag">Antes · {day(before.date)}</div>}{after && <div className="photo-frame-tag" style={{ left: "auto", right: 9 }}>Después · {day(after.date)}</div>}</div>
              <input type="range" min={0} max={100} value={cut} onChange={(e) => setCut(Number(e.target.value))} aria-label="Deslizar entre antes y después" className="ph-range" />
            </div>}
            {mine && after && <button className="filter-chip" style={{ marginTop: 10 }} onClick={() => setRm(after)}>Eliminar la foto “Después” ({day(after.date)})</button>}
            <div className="photo-gallery">{ph.map((p) => <button key={p.id} className={`photo-thumb${after?.id === p.id ? " selected" : ""}`} onClick={() => setB(p.id)} aria-label={`Usar foto del ${day(p.date)}`}>{p.url && <img src={p.url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}<div className="photo-thumb-date">{day(p.date)}</div></button>)}</div>
          </>)}
      {mine && <><input ref={file} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button className="upload-btn" disabled={up.isPending || prep || consent.isPending} onClick={() => (consent.data ? file.current?.click() : setAsk(true))}>{prep ? "Preparando…" : up.isPending ? "Subiendo…" : "Subir foto de hoy"}</button></>}
      <div className="photo-privacy-note">Solo {mine ? "tú y tu coach" : "el cliente y tú"} pueden ver estas fotos.</div>
      {rm && <Modal title="¿Eliminar esta foto?" sub={`Foto del ${day(rm.date, true)}. Se borra para siempre y tu coach ya no podrá verla.`} onClose={() => setRm(null)}>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setRm(null)}>Conservar</button><button className="modal-btn danger" disabled={del.isPending} onClick={() => { del.mutate({ id: rm.id, path: rm.path }); setRm(null); setB(""); }}>Sí, eliminar</button></div></Modal>}
      {ask && <Modal title="Antes de subir tu primera foto" sub="Tus fotos son privadas: solo tú y tu coach las ven, y puedes borrarlas cuando quieras." onClose={() => setAsk(false)}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 14 }}>Al continuar, aceptas que tu coach vea tus fotos de progreso para dar seguimiento a tu proceso.</p>
        <div className="modal-actions"><button className="modal-btn ghost" onClick={() => setAsk(false)}>Ahora no</button><button className="modal-btn primary" disabled={give.isPending} onClick={() => give.mutate(undefined, { onSuccess: () => { setAsk(false); setTimeout(() => file.current?.click(), 50); } })}>Acepto y continuar</button></div></Modal>}
    </div>
  );
}
