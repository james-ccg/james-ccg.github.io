#!/usr/bin/env python3
"""Regenerates assets/badge.svg and assets/favicon.svg.

The marks are pixel art, so they are laid out arithmetically rather than by
hand - hand-placing the rects is what pushed the first wordmark past 88px and
left the J reading as two disconnected blocks.

    python tools/make-marks.py
"""
import io
import os

# 3x5 pixel capitals. The J uses a full bottom bar and a left riser: a
# diagonal-only hook (X.X over .X.) is technically the classic form but reads
# as two floating blocks once the pixels are big.
FONT = {
    'J': ["..X", "..X", "..X", "X.X", "XXX"],
    'A': [".X.", "X.X", "XXX", "X.X", "X.X"],
    'M': ["X.X", "XXX", "X.X", "X.X", "X.X"],
    'E': ["XXX", "X..", "XXX", "X..", "XXX"],
    'S': [".XX", "X..", ".X.", "..X", "XX."],
    'C': [".XX", "X..", "X..", "X..", ".XX"],
    'G': [".XX", "X..", "X.X", "X.X", ".XX"],
    'X': ["X.X", "X.X", ".X.", "X.X", "X.X"],
    'D': ["XX.", "X.X", "X.X", "X.X", "XX."],
    '-': ["...", "...", "XXX", "...", "..."],
}
GLYPH_W, GLYPH_H, TRACK = 3, 5, 1

BG, AMBER, INK, TEXT = '#14151c', '#ffb454', '#14151c', '#dfe1ea'


def word(text, x, y, scale, fill):
    """Render text as merged horizontal runs; returns (svg, drawn_width)."""
    rects, cx = [], x
    for ch in text:
        rows = FONT[ch]
        for r, row in enumerate(rows):
            run = 0
            for c in range(GLYPH_W + 1):
                if c < GLYPH_W and row[c] == 'X':
                    run += 1
                elif run:
                    rects.append(
                        f'<rect x="{cx + (c - run) * scale}" y="{y + r * scale}"'
                        f' width="{run * scale}" height="{scale}"/>'
                    )
                    run = 0
        cx += (GLYPH_W + TRACK) * scale
    width = cx - x - TRACK * scale
    return f'<g fill="{fill}">' + ''.join(rects) + '</g>', width


def scanlines(x, w, y0, y1, step, h, fill, opacity):
    bars = ''.join(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>'
        for y in range(y0, y1, step)
    )
    return f'<g fill="{fill}" fill-opacity="{opacity}">{bars}</g>'


def build_badge():
    # JAMES on one line. Five glyphs is short enough to go up to scale 3 -
    # 57px drawn - which is why the mark block trims to 24px; the assert keeps
    # that honest if the name or the scale ever changes.
    mark_w, text_x, scale = 24, 27, 3
    mark, _ = word('J', 6, 8, 3, INK)
    name, w_name = word('JAMES', text_x, 8, scale, TEXT)
    assert text_x + w_name <= 86, f'wordmark overflows 88px: {text_x + w_name}'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="88" height="31" viewBox="0 0 88 31" shape-rendering="crispEdges" role="img" aria-label="James">
	<rect width="88" height="31" fill="{BG}"/>
	<rect x="0" y="0" width="{mark_w}" height="31" fill="{AMBER}"/>
	{mark}
	{scanlines(0, mark_w, 1, 31, 4, 1, INK, 0.12)}
	{name}
	<rect x="0" y="0" width="88" height="1" fill="#fff" fill-opacity="0.2"/>
	<rect x="0" y="0" width="1" height="31" fill="#fff" fill-opacity="0.12"/>
	<rect x="0" y="30" width="88" height="1" fill="#000" fill-opacity="0.5"/>
	<rect x="87" y="0" width="1" height="31" fill="#000" fill-opacity="0.5"/>
</svg>
'''


def build_favicon():
    """A tab icon has to be its own square mark - the 88x31 badge was being
    squashed into a smear at 16px."""
    mark, _ = word('J', 20, 14, 8, INK)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges" role="img" aria-label="james-ccg">
	<rect width="64" height="64" rx="8" fill="{BG}"/>
	<rect x="6" y="6" width="52" height="52" rx="4" fill="{AMBER}"/>
	{mark}
	{scanlines(6, 52, 8, 58, 6, 2, INK, 0.10)}
</svg>
'''


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    for name, svg in (('badge', build_badge()), ('favicon', build_favicon())):
        path = os.path.join(root, 'assets', f'{name}.svg')
        io.open(path, 'w', encoding='utf-8', newline='\n').write(svg)
        print(f'wrote assets/{name}.svg')


if __name__ == '__main__':
    main()
