#!/usr/bin/env python3
"""Porta el CSS de un mockup a una hoja de estilos de la app SIN duplicar reglas (idempotente).
Uso: python3 design/port_css.py <mockup sin .html> <hoja destino>
Ej.: python3 design/port_css.py coach-agenda app/coach/coach.css
Reemplaza las fuentes del mockup por las variables de next/font y omite las reglas :root ya definidas."""
import re, sys, pathlib
def blocks(css):
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        d, k = 1, j + 1
        while k < n and d:
            d += (css[k] == '{') - (css[k] == '}'); k += 1
        out.append(css[i:k].strip()); i = k
    return out
norm = lambda s: re.sub(r'\s+', '', s)
mock, dest = sys.argv[1], pathlib.Path(sys.argv[2])
h = pathlib.Path(__file__).with_name('mockups').joinpath(mock + '.html').read_text(encoding='utf8')
css = re.sub(r'/\*.*?\*/', '', h[h.index('<style>') + 7:h.index('</style>')], flags=re.S)
for a, b in (("'Manrope'", 'var(--font-body)'), ("'Instrument Sans'", 'var(--font-display)'), ("'IBM Plex Mono'", 'var(--font-mono)')): css = css.replace(a, b)
have = norm(dest.read_text(encoding='utf8'))
new = [b for b in blocks(css) if norm(b) not in have and not b.startswith(':root')]
if new:
    with dest.open('a', encoding='utf8') as f: f.write(f'\n/* {mock} */\n' + '\n'.join(new) + '\n')
print(f'{mock} -> {dest}: {len(new)} reglas nuevas')
