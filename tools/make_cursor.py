#!/usr/bin/env python3
"""Regenerates the cursor in assets/mascot.js - a pointing hand, tinted.

Smooth vector, not pixel art. Three pixel-grid attempts all came out looking
like a blocky sticker: a 16-square grid scaled to ~20 CSS pixels lands
between resolutions, so it is neither crisp pixel art nor a clean shape, and
no amount of redrawing the fingers fixed that.

The shape is the conventional pointing-hand pointer - index finger up, folded
fingers, thumb at the side, palm below. That silhouette is decades old and
reads as "clickable" without being learned, which is the whole job of a
cursor. Drawn here rather than lifted from a cursor theme: Bibata and the
other popular open-source sets are GPL-3.0, and vendoring their artwork into a
personal site would carry the licence along for no gain, since the shape
itself is a convention nobody owns.

The colour is Subaru's Invisible Providence - the Authority of Sloth, drawn in
the anime as a dark violet shadow-hand.

The outline is built by drawing the same shapes twice: once grown, in the dark
colour, then again at true size in violet. Overlaps inside each pass are
invisible because each pass is a single flat colour, which is what avoids the
seams a per-shape stroke would leave between the fingers.

    python tools/make_cursor.py
"""
import io
import os
import urllib.parse

# viewBox units. Rendered at CURSOR_PX; the ratio is what keeps the edges
# smooth instead of landing between pixels.
VIEW = 24
CURSOR_PX = 22
GROW = 1.6

EDGE = '#1d1030'
BODY = '#8b4fc9'
LIT = '#b07ae8'

# Rounded rectangles, in draw order: index finger, two folded fingers, thumb,
# palm. x, y, w, h, r
SHAPES = [
    (8.3, 2.2, 3.9, 12.0, 1.95),    # index finger - kept left of the
                                    # knuckles, so the hand reads as
                                    # pointing rather than gesturing
    (12.6, 8.2, 3.5, 6.5, 1.75),    # folded middle
    (15.2, 9.4, 3.4, 5.5, 1.70),    # folded ring
    (5.0, 13.0, 3.3, 5.6, 1.65),    # thumb
    (6.4, 11.6, 12.0, 10.4, 3.6),   # palm
]


def rects(grow, fill):
    out = []
    for x, y, w, h, r in SHAPES:
        out.append(
            f"<rect x='{x - grow:.2f}' y='{y - grow:.2f}' "
            f"width='{w + grow * 2:.2f}' height='{h + grow * 2:.2f}' "
            f"rx='{r + grow:.2f}'/>"
        )
    return f"<g fill='{fill}'>" + ''.join(out) + '</g>'


def svg():
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{CURSOR_PX}' "
        f"height='{CURSOR_PX}' viewBox='0 0 {VIEW} {VIEW}'>"
        + rects(GROW, EDGE)
        + rects(0, BODY)
        # A highlight down the finger, so it reads as a lit form rather than a
        # flat silhouette.
        + f"<rect x='9.1' y='3.2' width='1.4' height='9' rx='0.7' fill='{LIT}'/>"
        + '</svg>'
    )


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    art = svg()
    enc = urllib.parse.quote(art, safe='')
    path = os.path.join(root, 'assets', 'mascot.js')
    s = io.open(path, encoding='utf-8').read()
    i = s.index('\tvar CURSOR = "url(')
    j = s.index('\n', i)
    # Hotspot on the fingertip, which is where a pointing hand points.
    s = s[:i] + f'\tvar CURSOR = "url(\\"data:image/svg+xml,{enc}\\") 9 2, auto";' + s[j:]
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched assets/mascot.js')

    preview = os.environ.get('CURSOR_PREVIEW')
    if preview:
        io.open(preview, 'w', encoding='utf-8').write(art)
        print('preview ->', preview)


if __name__ == '__main__':
    main()
