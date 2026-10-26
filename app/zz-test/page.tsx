"use client";
import { useState } from "react";
import { useAudioRecorder } from "@/components/ui/useAudioRecorder";
export default function T() {
  const [info, setInfo] = useState(""), [err, setErr] = useState("");
  const r = useAudioRecorder((b, s) => setInfo(`${b.type} ${b.size} ${s}`), setErr);
  return <div style={{ padding: 20 }}><button id="s" onClick={() => void r.start()}>start</button><button id="e" onClick={() => r.stop()}>stop</button><p id="rec">{String(r.recording)} {r.secs}</p><p id="info">{info}</p><p id="err">{err}</p></div>;
}
