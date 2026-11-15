// Reduce la foto en el teléfono antes de subirla: sube más rápido y ocupa mucho menos en la base (~150-250 KB en vez de varios MB).
// Se decodifica ya reducida (createImageBitmap con resize) y respeta la orientación de la cámara.
export async function compressImage(file: File, max = 1400, quality = 0.8): Promise<Blob> {
  // 30-oct: Safari ignora el "reducir al decodificar" (resizeWidth): la foto salía del tamaño original (~4-5 MB) y Supabase la
  // rechazaba (máx. 5 MB). Ahora SIEMPRE se dibuja ya reducida en el lienzo, venga como venga la imagen decodificada.
  let src: ImageBitmap | HTMLImageElement, w: number, h: number;
  try { const b = await createImageBitmap(file, { imageOrientation: "from-image" }); src = b; w = b.width; h = b.height; }
  catch {
    try { const b = await createImageBitmap(file); src = b; w = b.width; h = b.height; }
    catch {   // último intento: el propio navegador como <img> (algunos formatos solo los abre así)
      const url = URL.createObjectURL(file);
      try { const img = new Image(); img.decoding = "async"; img.src = url; await img.decode(); src = img; w = img.naturalWidth; h = img.naturalHeight; }
      finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    }
  }
  const k = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext("2d")!; g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, c.width, c.height);
  if ("close" in src) src.close();
  const enc = (q: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar la imagen"))), "image/jpeg", q));
  let out = await enc(quality);
  if (out.size > 4_000_000) out = await enc(0.6);   // seguro extra bajo el límite de 5 MB
  return out;
}
