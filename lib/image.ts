// Reduce la foto en el teléfono antes de subirla: sube más rápido y ocupa mucho menos en la base (~150-250 KB en vez de varios MB).
// Se decodifica ya reducida (createImageBitmap con resize) y respeta la orientación de la cámara.
export async function compressImage(file: File, max = 1400, quality = 0.8): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    const probe = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, max / Math.max(probe.width, probe.height));
    if (k < 1) { const w = Math.round(probe.width * k), h = Math.round(probe.height * k); probe.close(); bmp = await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: w, resizeHeight: h, resizeQuality: "high" }); } else bmp = probe;
  } catch { bmp = await createImageBitmap(file); }
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0); bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar la imagen"))), "image/jpeg", quality));
}
