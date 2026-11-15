"use client";
// El cliente abre el resumen de la semana que le envió Jeff (13-nov, 0053). Al abrirlo queda como visto (Jeff lo ve en la ficha).
import { useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { useSeeWeek, useSentWeek, useSentWeeks, type SentWeek } from "@/lib/weeksum";
import { WeekReport } from "@/components/WeekReport";
import { QuickRow } from "./QuickRow";
import { Icon } from "@/components/ui/Icon";

export function WeekReportPage({ id }: { id: string }) {
  const { profileId, name } = useProfile(), me = useMe(profileId), s = useSentWeek(id), see = useSeeWeek();
  // Al abrirlo queda visto y su mensaje, leído.
  useEffect(() => { if (s.data && !s.data.seenAt && !see.isPending && !see.isSuccess) see.mutate(s.data.id); }, [s.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = (name || "").split(" ")[0];
  return (
    <>
      <div className="topbar"><div className="greeting"><Link href="/inicio/progreso" className="tech-link" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 8 }}><Icon name="back" size={12} /> Progreso</Link>
        <div className="greeting-eyebrow">Resumen de tu semana</div><h1>{s.data ? `Semana ${s.data.n}` : "Tu semana"}</h1>
        <p className="greeting-sub">Lo que lograste, comparado con la semana anterior. Te lo envió Jeff.</p></div></div>
      {s.isPending || me.isPending ? <div className="sk" style={{ height: 320 }} />
        : s.isError ? <div className="card"><p role="alert" className="empty-note">No pudimos abrir tu resumen. Revisa tu conexión. <button type="button" className="tech-link" onClick={() => s.refetch()}>Reintentar</button></p></div>
        : !s.data || !me.data ? <div className="card"><p className="empty-note">Este resumen ya no está disponible. Tus resúmenes están en Progreso.</p></div>
        : <div className="card"><WeekReport clientId={me.data.id} first={first} n={s.data.n} from={s.data.from} note={s.data.note} mode="client" /></div>}
    </>
  );
}
/** En Hoy: el último resumen que aún no abre. */
export function NewWeekSummary({ cid }: { cid: string }) {
  const l = useSentWeeks(cid), s = l.data?.find((x) => !x.seenAt);
  if (!s) return null;
  return (
    <QuickRow icon="chart" tone="todo" title={`Jeff te envió el resumen de tu semana ${s.n}`} sub="Lo que lograste y cómo vas frente a la anterior" defaultOpen>
      {s.note && <p style={{ fontSize: 14, lineHeight: 1.55, margin: "8px 0 0" }}>“{s.note.length > 160 ? `${s.note.slice(0, 157)}…` : s.note}”</p>}
      <Link href={`/inicio/resumen/${s.id}`} className="report-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, textDecoration: "none" }}>Ver mi resumen <Icon name="arrow" size={14} /></Link>
    </QuickRow>
  );
}
/** En Progreso: todos los resúmenes que le ha enviado Jeff. */
export function SentWeeksList({ cid }: { cid: string }) {
  const l = useSentWeeks(cid);
  if (!l.data?.length) return null;
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-tag">Resúmenes de Jeff</div>
      {l.data.map((s: SentWeek) => <Link key={s.id} href={`/inicio/resumen/${s.id}`} className="wr-list-row"><span><b>Semana {s.n}</b><small>{new Date(`${s.from}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" })} al {new Date(`${s.to}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" })}{s.seenAt ? "" : " · nuevo"}</small></span><Icon name="arrow" size={13} /></Link>)}
    </div>
  );
}
