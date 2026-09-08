#!/usr/bin/env python3
"""Regenerates the cursor in assets/mascot.js - a pointing hand, tinted.

The shape is the conventional pointing-hand pointer: index finger up, three
fingers folded, thumb at the side, fist below. That silhouette is decades old
and universally read as "clickable", which is the whole job of a cursor - my
earlier attempts invented a clawed shape and it read as a purple blob.

Drawn here rather than lifted from a cursor theme. Bibata and the other
popular open-source sets are GPL-3.0, and vendoring their artwork into a
personal site would carry the licence with it for no gain, since the shape
itself is a convention nobody owns.

The colour is Subaru's Invisible Providence - the Authority of Sloth, drawn in
the anime as a dark violet shadow-hand.

The Unseen Hand: the Authority of Sloth, drawn in the anime as a dark violet
shadow-hand. Fingers are deliberately long. A first pass gave them four rows
and they merged straight into the palm, so the whole thing read as a purple
blob with three notches rather than a hand.

    python tools/make_cursor.py
"""
import io
import os
import urllib.parse

N = 16

ART = [
    ".....XX.........",
    ".....XX.........",
    ".....XX.........",
    ".....XX.........",
    ".....XX.........",
    ".....XX.XX......",
    ".....XXXXXX.X...",
    ".....XXXXXXXX...",
    "..XX.XXXXXXXX...",
    "..XXXXXXXXXXX...",
    "...XXXXXXXXXX...",
    "...XXXXXXXXXX...",
    "...XXXXXXXXXX...",
    "...XXXXXXXXXX...",
    "....XXXXXXXX....",
    ".....XXXXXX.....",
]

GLOW, EDGE = '#d9b8ff', '#150a24'
# The hand darkens toward the wrist.
SHADES = [(6, '#b07ae8'), (10, '#8b4fc9'), (N, '#5a2f8a')]


def build():
    g = [list(r) for r in ART]
    assert len(g) == N and all(len(r) == N for r in g)

    def solid(x, y):
        return 0 <= x < N and 0 <= y < N and g[y][x] == 'X'

    nbr = ((1, 0), (-1, 0), (0, 1), (0, -1))
    # Two rings - dark, then violet. One outline vanishes against whichever
    # background happens to match it, and this cursor has to work on the light
    # theme and the dark one.
    dark = {(x, y) for y in range(N) for x in range(N)
            if g[y][x] == '.' and any(solid(x + dx, y + dy) for dx, dy in nbr)}
    glow = {(x, y) for y in range(N) for x in range(N)
            if g[y][x] == '.' and (x, y) not in dark
            and any((x + dx, y + dy) in dark for dx, dy in nbr)}
    return g, dark, glow


def runs(pred, fill):
    out = []
    for y in range(N):
        x = 0
        while x < N:
            if pred(x, y):
                r = 1
                while x + r < N and pred(x + r, y):
                    r += 1
                out.append(f"<rect x='{x}' y='{y}' width='{r}' height='1' fill='{fill}'/>")
                x += r
            else:
                x += 1
    return ''.join(out)


def svg():
    g, dark, glow = build()
    parts = [runs(lambda x, y: (x, y) in glow, GLOW),
             runs(lambda x, y: (x, y) in dark, EDGE)]
    for y in range(N):
        fill = next(c for limit, c in SHADES if y < limit)
        parts.append(runs(lambda x, yy=y: g[yy][x] == 'X' and yy == y, fill))
    return ("<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' "
            f"viewBox='0 0 {N} {N}' shape-rendering='crispEdges'>"
            + ''.join(parts) + '</svg>')


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    art = svg()
    enc = urllib.parse.quote(art, safe='')
    p = os.path.join(root, 'assets', 'mascot.js')
    s = io.open(p, encoding='utf-8').read()
    i = s.index('\tvar CURSOR = "url(')
    j = s.index('\n', i)
    # Hotspot on the top-left fingertip, which is where a pointing hand points.
    s = s[:i] + f'\tvar CURSOR = "url(\\"data:image/svg+xml,{enc}\\") 5 0, auto";' + s[j:]
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched assets/mascot.js')
    preview = os.environ.get('CURSOR_PREVIEW')
    if preview:
        io.open(preview, 'w', encoding='utf-8').write(art)
        print('preview ->', preview)


if __name__ == '__main__':
    main()
