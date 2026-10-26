"use client";
import { useState } from "react";
import { useVideoPick } from "@/components/ui/useVideoPick";
export default function T() {
  const [info, setInfo] = useState(""), [err, setErr] = useState("");
  const { pick, trimmer } = useVideoPick({ maxSeconds: 30, maxMB: 200, onFile: (f) => setInfo(`${f.name} ${f.size}`), onError: setErr });
  return <div style={{ padding: 20 }}><div style={{ overflow: "hidden", transform: "translateZ(0)", height: 90, border: "1px solid #ccc", borderRadius: 14 }}><input id="f" type="file" accept="video/*" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />{trimmer}</div><p id="info">{info}</p><p id="err">{err}</p></div>;
}
