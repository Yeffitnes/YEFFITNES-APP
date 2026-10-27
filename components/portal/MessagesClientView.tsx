"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/lib/queries";
import { useProfile } from "@/components/Providers";
import { ThreadView } from "@/components/ui/ThreadView";
function Inner() {
  const { profileId } = useProfile(), me = useMe(profileId), pre = (useSearchParams().get("m") ?? "").slice(0, 300);
  return (
    <>
      <div className="topbar"><div className="greeting"><div className="greeting-eyebrow">Mensajes</div><h1>Escríbele a tu coach</h1><p className="greeting-sub">Deja tu duda o cómo te sientes, con una foto o un vídeo corto si lo necesitas. Tu coach lo lee y te responde con calma: no es un chat. Los mensajes se borran solos un día después de leerse.</p></div></div>
      <ThreadView ownClientId={me.data?.id} otherName="Tu coach" initialText={pre} textOnly={me.data?.status === "pending"} />
    </>
  );
}
export function MessagesClientView() { return <Suspense fallback={<div className="sk" style={{ height: 300 }} />}><Inner /></Suspense>; }
