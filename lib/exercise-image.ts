"use client";
import { db } from "@/lib/supabase/browser";
// Jeff sube la imagen de un ejercicio propio: se recorta al centro y se reduce a 360×360 en el navegador antes de subir
// (unos 20-40 KB), así casi no ocupa espacio en Supabase. Devuelve el valor para exercises.image ("storage:<espacio>/<archivo>").
const SIZE = 360;
async function toSquare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), c = document.createElement("canvas"); c.width = c.height = SIZE;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, SIZE, SIZE); bmp.close?.();
  const webp = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.8));
  if (webp && webp.type === "image/webp") return webp;
  const jpg = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82)); if (!jpg) throw new Error("encode"); return jpg;
}
export async function uploadExerciseImage(workspaceId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const blob = await toSquare(file), ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from("exercise-images").upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return `storage:${path}`;
}
