#!/usr/bin/env python3
"""Regenerates the pixel cursor in assets/mascot.js - Puck's paw.

Drawn on a 16 grid rather than 12: at 12 the toe beans had no room to sit
apart from the main pad, so the outline pass welded them into one blob. A paw
print only reads as a paw if the gaps survive.

The four toes sit in an arc - the outer pair lower than the inner pair, the
way a real paw print lands - over a rounded main pad.

    python tools/make_paw.py
"""
import io
import os
import urllib.parse

N = 16

# '.' empty, 'F' fur, 'P' pad. The outline is derived, not drawn.
ART = [
    "................",
    ".....PPP.PPP....",
    ".PPP.PPP.PPP.PPP",
    ".PPP.PPP.PPP.PPP",
    ".PPP.PPP.PPP.PPP",
    ".PPP.........PPP",
    "................",
    "....PPPPPPPP....",
    "..PPPPPPPPPPPP..",
    ".PPPPPPPPPPPPPP.",
    ".PPPPPPPPPPPPPP.",
    ".PPPPPPPPPPPPPP.",
    "..PPPPPPPPPPPP..",
    "...PPPPPPPPPP...",
    ".....PPPPPP.....",
    "................",
]

COLORS = {'P': '#f6a8bd', 'o': '#232838'}


def build():
    g = [list(r) for r in ART]
    assert all(len(r) == N for r in g) and len(g) == N

    def filled(x, y):
        return 0 <= x < N and 0 <= y < N and g[y][x] != '.'

    # 4-neighbour outline. An 8-neighbour pass bridges the diagonal gaps
    # between the toes and fills the whole bounding box with a dark plate.
    edge = [
        (x, y)
        for y in range(N)
        for x in range(N)
        if g[y][x] == '.'
        and any(filled(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    ]
    for x, y in edge:
        g[y][x] = 'o'
    return g


def runs(g, ch):
    out = []
    for y in range(N):
        x = 0
        while x < N:
            if g[y][x] == ch:
                r = 1
                while x + r < N and g[y][x + r] == ch:
                    r += 1
                out.append(f"<rect x='{x}' y='{y}' width='{r}' height='1'/>")
                x += r
            else:
                x += 1
    return ''.join(out)


def svg():
    g = build()
    return (
        "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' "
        f"viewBox='0 0 {N} {N}' shape-rendering='crispEdges'>"
        f"<g fill='{COLORS['o']}'>{runs(g, 'o')}</g>"
        f"<g fill='{COLORS['P']}'>{runs(g, 'P')}</g></svg>"
    )


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    art = svg()
    enc = urllib.parse.quote(art, safe='')

    path = os.path.join(root, 'assets', 'mascot.js')
    s = io.open(path, encoding='utf-8').read()
    i = s.index('\tvar CURSOR = "url(')
    j = s.index('\n', i)
    # Hotspot on the upper-left toe, so what you click is where it points.
    s = s[:i] + f'\tvar CURSOR = "url(\\"data:image/svg+xml,{enc}\\") 4 2, auto";' + s[j:]
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched assets/mascot.js')

    preview = os.environ.get('PAW_PREVIEW')
    if preview:
        io.open(preview, 'w', encoding='utf-8').write(art)
        print('preview ->', preview)


if __name__ == '__main__':
    main()
