#!/usr/bin/env python3
"""Recorta una cuadrícula de imágenes de ejercicios (la que genera Gemini/ChatGPT) en imágenes de 360x360 WebP para public/ex/.
Uso:  python3 tools/crop_grid.py CUADRICULA.png 72-remo-pendlay,84-remo-al-menton,-,...   (un nombre por celda, de izquierda a
derecha y de arriba a abajo; "-" = saltar esa celda). Las celdas se detectan por las líneas negras entre ellas (brillo < 12).
Celdas no cuadradas: se RELLENAN con el color del borde (no se recortan): recortarlas cortaba cabezas y discos (31-oct).
Después: revisar una hoja de contactos y escribir la migración que pone `image = 'preset:<nombre>'` (solo donde image is null)."""
import sys
import numpy as np
from PIL import Image

def cells(path):
    a = np.asarray(Image.open(path).convert("L")).astype(float); H, W = a.shape
    def gut(axis, n):
        m = a.mean(axis=axis); low = m < 12; runs = []; i = 0
        while i < n:
            if low[i]:
                j = i
                while j < n and low[j]: j += 1
                runs.append((i, j)); i = j
            else: i += 1
        runs = [r for r in runs if r[0] > 5 and r[1] < n - 5]
        e = [0] + [x for r in runs for x in r] + [n]
        return [(e[k], e[k + 1]) for k in range(0, len(e), 2)]
    return [(x0, y0, x1, y1) for (y0, y1) in gut(1, H) for (x0, x1) in gut(0, W)]

def crop(path, names, out="public/ex"):
    full = Image.open(path).convert("RGB")
    for (x0, y0, x1, y1), name in zip(cells(path), names):
        if name == "-": continue
        x0 += 4; y0 += 4; x1 -= 4; y1 -= 4; w, h = x1 - x0, y1 - y0
        if max(w, h) / min(w, h) < 1.05:
            s = min(w, h); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            im = full.crop((cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s))
        else:
            cell = full.crop((x0, y0, x1, y1)); s = max(w, h); arr = np.asarray(cell)
            edge = np.concatenate([arr[:3].reshape(-1, 3), arr[-3:].reshape(-1, 3)]) if w > h else np.concatenate([arr[:, :3].reshape(-1, 3), arr[:, -3:].reshape(-1, 3)])
            im = Image.new("RGB", (s, s), tuple(int(v) for v in edge.mean(0))); im.paste(cell, ((s - w) // 2, (s - h) // 2))
        im.resize((360, 360), Image.LANCZOS).save(f"{out}/{name}.webp", "WEBP", quality=80, method=6); print("ok", name)

if __name__ == "__main__":
    crop(sys.argv[1], sys.argv[2].split(","))
