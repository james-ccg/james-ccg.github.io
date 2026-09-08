#!/usr/bin/env python3
"""Regenerates the cursor pack in assets/mascot.js.

A pack, not a pointer: every cursor role the site actually uses, drawn in one
style so the set reads as a whole. Default, pointer, text, move, grab,
crosshair, wait, not-allowed and the two resize arrows.

All of it in Subaru's Invisible Providence violet - the Authority of Sloth,
drawn in the anime as a dark violet shadow-hand.

Two techniques carry the whole file:

- Outlines use paint-order='stroke', which puts the stroke behind the fill.
  Stroked the normal way an outline eats half the shape and everything reads
  heavy, which is what made earlier hand attempts look like blobs.
- The hand is built from rounded rectangles drawn twice - grown and dark,
  then true size and violet - because a per-shape stroke leaves visible seams
  where the fingers overlap the palm.

Hotspots are in rendered CSS pixels, not viewBox units. Everything renders at
SIZE, and the viewBox is 24, so a hotspot at the centre of the art is
SIZE / 2 rounded down.

    python tools/make_cursor.py
"""
import io
import os
import urllib.parse

SIZE = 22
VIEW = 24
MID = SIZE // 2

EDGE = '#150a24'
BODY = '#8b4fc9'
LIT = '#c79bf0'

# Shapes that are a single outlined path. name -> (path, hotspot)
PATHS = {
    'default': (
        'M3.5 2.2 L3.5 19.6 L8.0 15.4 L10.9 21.8 L13.9 20.4 L11.1 14.2 L16.9 14.0 Z',
        (3, 2),
    ),
    'text': (
        'M8.5 3 H15.5 V5 H13 V19 H15.5 V21 H8.5 V19 H11 V5 H8.5 Z',
        (MID, MID),
    ),
    'move': (
        'M12 1.4 L15.6 6 H13.1 V11 H18.1 V8.5 L22.6 12 L18.1 15.5 V13 H13.1 V18 '
        'H15.6 L12 22.6 L8.4 18 H10.9 V13 H5.9 V15.5 L1.4 12 L5.9 8.5 V11 H10.9 V6 H8.4 Z',
        (MID, MID),
    ),
    'ns-resize': (
        'M12 1.4 L16 6.5 H13.4 V17.5 H16 L12 22.6 L8 17.5 H10.6 V6.5 H8 Z',
        (MID, MID),
    ),
    'ew-resize': (
        'M1.4 12 L6.5 8 V10.6 H17.5 V8 L22.6 12 L17.5 16 V13.4 H6.5 V16 Z',
        (MID, MID),
    ),
    'crosshair': (
        'M11 2 H13 V11 H22 V13 H13 V22 H11 V13 H2 V11 H11 Z',
        (MID, MID),
    ),
    'wait': (
        'M5.5 2.5 H18.5 V5 L13.4 12 L18.5 19 V21.5 H5.5 V19 L10.6 12 L5.5 5 Z',
        (MID, MID),
    ),
    'not-allowed': (
        'M12 2.6 A9.4 9.4 0 1 1 11.99 2.6 Z '
        'M12 5.8 A6.2 6.2 0 1 0 12.01 5.8 Z '
        'M6.6 16.6 L16.6 6.6 L18.2 8.2 L8.2 18.2 Z',
        (MID, MID),
    ),
}

# The hand, and its open-palm sibling for grab: x, y, w, h, r
HAND_SHAPES = [
    (8.3, 2.2, 3.9, 12.0, 1.95),    # index finger
    (12.6, 8.2, 3.5, 6.5, 1.75),    # folded middle
    (15.2, 9.4, 3.4, 5.5, 1.70),    # folded ring
    (5.0, 13.0, 3.3, 5.6, 1.65),    # thumb
    (6.4, 11.6, 12.0, 10.4, 3.6),   # palm
]

GRAB_SHAPES = [
    (7.4, 4.0, 3.2, 9.0, 1.60),
    (10.8, 2.8, 3.2, 10.2, 1.60),
    (14.2, 4.0, 3.2, 9.0, 1.60),
    (4.6, 9.0, 3.0, 6.0, 1.50),
    (5.6, 10.4, 13.0, 10.6, 3.8),
]


def wrap(inner):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{SIZE}' height='{SIZE}' "
            f"viewBox='0 0 {VIEW} {VIEW}'>{inner}</svg>")


def outlined(path, rule=''):
    """One path, stroked behind its own fill so the outline never eats it."""
    fr = f" fill-rule='{rule}'" if rule else ''
    return wrap(
        f"<path d='{path}' fill='{BODY}'{fr} stroke='{EDGE}' stroke-width='2.6' "
        "stroke-linejoin='round' paint-order='stroke'/>"
    )


def hand(shapes, lit=None):
    def rects(grow, fill):
        out = []
        for x, y, w, h, r in shapes:
            out.append(
                f"<rect x='{x - grow:.2f}' y='{y - grow:.2f}' "
                f"width='{w + grow * 2:.2f}' height='{h + grow * 2:.2f}' "
                f"rx='{r + grow:.2f}'/>"
            )
        return f"<g fill='{fill}'>" + ''.join(out) + '</g>'

    inner = rects(1.6, EDGE) + rects(0, BODY)
    if lit:
        inner += f"<rect x='{lit[0]}' y='{lit[1]}' width='1.4' height='{lit[2]}' rx='0.7' fill='{LIT}'/>"
    return wrap(inner)


def build():
    """role -> (svg, hotspot x, hotspot y)."""
    pack = {}
    for name, (path, (hx, hy)) in PATHS.items():
        rule = 'evenodd' if name == 'not-allowed' else ''
        pack[name] = (outlined(path, rule), hx, hy)
    # A lit edge down the leading side, so these read as lit forms rather than
    # flat silhouettes.
    pack['default'] = (
        pack['default'][0].replace(
            '</svg>',
            f"<path d='M5.1 5.0 L5.1 15.6' stroke='{LIT}' stroke-width='1.3' "
            "stroke-linecap='round' fill='none'/></svg>"),
        3, 2,
    )
    pack['pointer'] = (hand(HAND_SHAPES, (9.1, 3.2, 9)), 9, 2)
    pack['grab'] = (hand(GRAB_SHAPES), MID, 6)
    return pack


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    entries = []
    for name, (svg, hx, hy) in sorted(build().items()):
        enc = urllib.parse.quote(svg, safe='')
        key = f"'{name}'" if '-' in name else name
        entries.append(f'\t\t{key}: \'url("data:image/svg+xml,{enc}") {hx} {hy}, auto\'')
    block = '\tvar CURSORS = {\n' + ',\n'.join(entries) + ',\n\t};'

    path = os.path.join(root, 'assets', 'mascot.js')
    s = io.open(path, encoding='utf-8').read()
    start = s.index('\tvar CURSORS = {')
    end = s.index('\n\t};', start) + len('\n\t};')
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s[:start] + block + s[end:])
    print('patched assets/mascot.js with', len(entries), 'cursors')

    out_dir = os.environ.get('CURSOR_PREVIEW_DIR')
    if out_dir:
        for name, (svg, _, _) in build().items():
            io.open(os.path.join(out_dir, f'cur-{name}.svg'), 'w', encoding='utf-8').write(svg)
        print('previews ->', out_dir)


if __name__ == '__main__':
    main()
