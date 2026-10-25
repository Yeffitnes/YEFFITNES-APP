"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useActivityFeed, useMarkActivitySeen, type ActivityKind } from "@/lib/queries";
import { ago } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
const TXT: Record<ActivityKind, string> = { training_done: "completó su entrenamiento de hoy", nutrition_done: "completó su nutrición de hoy", day_done: "completó su día: entrenamiento y nutrición" };
// "Tiempo real": lo que tus clientes completan, para que Jeff lo vea sin abrir ficha por ficha.
export function ActivityCard() {
  const feed = useActivityFeed(), mark = useMarkActivitySeen(), unseen = (feed.data ?? []).filter((a) => !a.seen).length;
  useEffect(() => { if (!unseen) return; const t = setTimeout(() => mark.mutate(), 4000); return () => clearTimeout(t); }, [unseen]);   // eslint-disable-line react-hooks/exhaustive-deps
  const list = (feed.data ?? []).slice(0, 8);
  return (
    <div className="card">
      <div className="card-tag"><span className="live-dot" aria-hidden />Tiempo real</div>
      <div className="card-title" style={{ fontSize: 15 }}>Tus clientes al día</div>
      {feed.isPending && <div className="sk" style={{ height: 44, marginTop: 10 }} />}
      {feed.isError && <p className="empty-note" role="alert">No pudimos cargar la actividad.</p>}
      {feed.data && !list.length && <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8 }}>Cuando un cliente complete su entrenamiento o su nutrición del día, lo verás aquí al instante.</p>}
      <div style={{ marginTop: 8 }}>{list.map((a) => (
        <Link key={a.id} href={`/coach/clientes/${a.clientId}`} className="activity-row">
          <div className={`activity-icon${a.kind === "day_done" ? " strong" : ""}`}><Icon name="check" size={14} stroke={2.2} /></div>
          <div><div className="activity-text"><b>{a.clientName}</b> {TXT[a.kind]}{!a.seen && <span className="new-dot" aria-label="nuevo" />}</div><div className="activity-time">{ago(a.at)}</div></div>
        </Link>))}</div>
    </div>
  );
}
