#!/usr/bin/env python3
"""Regenerates the cursor set in assets/mascot.js.

Three looks, all in Subaru's Invisible Providence violet - the Authority of
Sloth, drawn in the anime as a dark violet shadow-hand.

Why a set rather than one shape: a pointer has to stay legible at about twenty
pixels, and how well a given silhouette survives that is a matter of taste as
much as geometry. The arrow is the safe one - narrow, one unmistakable tip,
readable at any size. The hand is friendlier but a much busier silhouette. The
pixel arrow suits the retro theme. So the choice is the visitor's.

Two techniques here are worth keeping:

- Outlines use paint-order='stroke', which puts the stroke behind the fill.
  Stroked the normal way the outline eats half the shape and everything reads
  heavy - that is what made earlier attempts look like blobs.
- The hand is built from rounded rectangles drawn twice, grown-and-dark then
  true-size-and-violet, because a per-shape stroke leaves visible seams where
  the fingers overlap the palm.

    python tools/make_cursor.py
"""
import io
import os
import urllib.parse

EDGE = '#150a24'
BODY = '#8b4fc9'
LIT = '#c79bf0'

ARROW_PATH = ('M3.5 2.2 L3.5 19.6 L8.0 15.4 L10.9 21.8 L13.9 20.4 '
              'L11.1 14.2 L16.9 14.0 Z')

# index finger, two folded fingers, thumb, palm: x, y, w, h, r
HAND_SHAPES = [
    (8.3, 2.2, 3.9, 12.0, 1.95),
    (12.6, 8.2, 3.5, 6.5, 1.75),
    (15.2, 9.4, 3.4, 5.5, 1.70),
    (5.0, 13.0, 3.3, 5.6, 1.65),
    (6.4, 11.6, 12.0, 10.4, 3.6),
]

# Narrow on purpose: at twelve wide the diagonal ran so far out that the shape
# read as a solid wedge rather than an arrow.
PIXEL_ARROW = [
    "X.......",
    "XX......",
    "XXX.....",
    "XXXX....",
    "XXXXX...",
    "XXXXXX..",
    "XXXXXXX.",
    "XXXXXXXX",
    "XXXXX...",
    "XX.XX...",
    "X...XX..",
    ".....XX.",
]


def wrap(inner, px, view):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{px}' height='{px}' "
            f"viewBox='0 0 {view} {view}'>{inner}</svg>")


def arrow_svg():
    inner = (
        f"<path d='{ARROW_PATH}' fill='{BODY}' stroke='{EDGE}' stroke-width='2.6' "
        "stroke-linejoin='round' paint-order='stroke'/>"
        f"<path d='M5.1 5.0 L5.1 15.6' stroke='{LIT}' stroke-width='1.3' "
        "stroke-linecap='round' fill='none'/>"
    )
    return wrap(inner, 22, 24)


def hand_svg():
    def rects(grow, fill):
        out = []
        for x, y, w, h, r in HAND_SHAPES:
            out.append(
                f"<rect x='{x - grow:.2f}' y='{y - grow:.2f}' "
                f"width='{w + grow * 2:.2f}' height='{h + grow * 2:.2f}' "
                f"rx='{r + grow:.2f}'/>"
            )
        return f"<g fill='{fill}'>" + ''.join(out) + '</g>'

    inner = (rects(1.6, EDGE) + rects(0, BODY)
             + f"<rect x='9.1' y='3.2' width='1.4' height='9' rx='0.7' fill='{LIT}'/>")
    return wrap(inner, 22, 24)


def pixel_svg():
    w, h = len(PIXEL_ARROW[0]), len(PIXEL_ARROW)

    def solid(x, y):
        return 0 <= x < w and 0 <= y < h and PIXEL_ARROW[y][x] == 'X'

    nbr = ((1, 0), (-1, 0), (0, 1), (0, -1))
    edge = {(x, y) for y in range(h) for x in range(w)
            if PIXEL_ARROW[y][x] == '.'
            and any(solid(x + dx, y + dy) for dx, dy in nbr)}

    def runs(pred):
        out = []
        for y in range(h):
            x = 0
            while x < w:
                if pred(x, y):
                    r = 1
                    while x + r < w and pred(x + r, y):
                        r += 1
                    out.append(f"<rect x='{x}' y='{y}' width='{r}' height='1'/>")
                    x += r
                else:
                    x += 1
        return ''.join(out)

    inner = (f"<g fill='{EDGE}'>{runs(lambda x, y: (x, y) in edge)}</g>"
             f"<g fill='{BODY}'>{runs(lambda x, y: PIXEL_ARROW[y][x] == 'X')}</g>")
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w * 2}' height='{h * 2}' "
            f"viewBox='0 0 {w} {h}' shape-rendering='crispEdges'>{inner}</svg>")


def build():
    """name -> (svg, hotspot x, hotspot y), hotspots in rendered CSS pixels."""
    return {
        'arrow': (arrow_svg(), 3, 2),
        'hand': (hand_svg(), 9, 2),
        'pixel': (pixel_svg(), 1, 1),
    }


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    entries = []
    for name, (svg, hx, hy) in build().items():
        enc = urllib.parse.quote(svg, safe='')
        entries.append(f'\t\t{name}: \'url("data:image/svg+xml,{enc}") {hx} {hy}, auto\'')
    block = '\tvar CURSORS = {\n' + ',\n'.join(entries) + ',\n\t};'

    path = os.path.join(root, 'assets', 'mascot.js')
    s = io.open(path, encoding='utf-8').read()
    start = s.index('\tvar CURSORS = {')
    end = s.index('\n\t};', start) + len('\n\t};')
    s = s[:start] + block + s[end:]
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched assets/mascot.js with', len(entries), 'cursors')

    out_dir = os.environ.get('CURSOR_PREVIEW_DIR')
    if out_dir:
        for name, (svg, _, _) in build().items():
            io.open(os.path.join(out_dir, f'cur-{name}.svg'), 'w', encoding='utf-8').write(svg)
        print('previews ->', out_dir)


if __name__ == '__main__':
    main()
