#!/usr/bin/env python3
"""Regenerates assets/badge.svg and assets/favicon.svg.

The marks are pixel art laid out arithmetically rather than by hand - placing
rects by eye is what produced a wordmark that ran past 88px and a J that read
as two floating blocks.

The face is 4x7. An earlier 3x5 was too coarse to look like anything but
programmer art: at 88x31 the letters have room for real proportions, and
that difference is most of what separates a good web button from a bad one.

    python tools/make-marks.py
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_puck  # noqa: E402  - the badge reuses the mascot's own pixels

GLYPH_W, GLYPH_H, TRACK = 4, 7, 1

FONT = {
    'J': ["...X", "...X", "...X", "...X", "X..X", "X..X", ".XX."],
    'A': [".XX.", "X..X", "X..X", "XXXX", "X..X", "X..X", "X..X"],
    'M': ["X..X", "XXXX", "XXXX", "X..X", "X..X", "X..X", "X..X"],
    'E': ["XXXX", "X...", "X...", "XXX.", "X...", "X...", "XXXX"],
    'S': [".XXX", "X...", "X...", ".XX.", "...X", "...X", "XXX."],
}

BG_TOP, BG_BOT = '#1b1d28', '#101119'
AMBER_TOP, AMBER_BOT = '#ffc270', '#f0a23d'
INK, TEXT = '#14151c', '#f2f4fa'


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
    return f'<g fill="{fill}">' + ''.join(rects) + '</g>', cx - x - TRACK * scale


DEFS = f'''<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="{BG_TOP}"/><stop offset="1" stop-color="{BG_BOT}"/>
		</linearGradient>
		<linearGradient id="am" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="{AMBER_TOP}"/><stop offset="1" stop-color="{AMBER_BOT}"/>
		</linearGradient>
	</defs>'''


def puck_head(dx, dy, crop=(2, 1, 30, 24)):
    """Puck's head lifted straight out of the 32x32 mascot at 1:1.

    Rescaling pixel art by a non-integer factor destroys it, so the badge
    borrows the sprite's actual pixels and crops rather than resizing."""
    g = make_puck.build('idle')
    x0, y0, x1, y1 = crop
    rects = []
    for y in range(y0, y1):
        x = x0
        while x < x1:
            ch, run = g[y][x], 1
            while x + run < x1 and g[y][x + run] == ch:
                run += 1
            if ch in make_puck.C:
                rects.append(
                    f'<rect x="{dx + x - x0}" y="{dy + y - y0}" width="{run}"'
                    f' height="1" fill="{make_puck.C[ch]}"/>'
                )
            x += run
    return '<g>' + ''.join(rects) + '</g>'


def build_badge():
    """88x31 with a square 31x31 mark block, so the logo is a square."""
    mark_w, scale = 31, 2
    mark = puck_head(1, 4)
    # Wordmark centred in the remaining 57px.
    probe, w = word('JAMES', 0, 0, scale, TEXT)
    text_x = mark_w + (88 - mark_w - w) // 2
    name, _ = word('JAMES', text_x, (31 - GLYPH_H * scale) // 2, scale, TEXT)
    assert text_x + w <= 87, f'wordmark overflows 88px: {text_x + w}'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="88" height="31" viewBox="0 0 88 31" shape-rendering="crispEdges" role="img" aria-label="James">
	{DEFS}
	<rect width="88" height="31" fill="url(#bg)"/>
	<rect x="0" y="0" width="{mark_w}" height="31" fill="url(#am)"/>
	{mark}
	<rect x="{mark_w}" y="0" width="1" height="31" fill="{INK}" fill-opacity="0.55"/>
	{name}
	<rect x="0" y="0" width="88" height="1" fill="#fff" fill-opacity="0.22"/>
	<rect x="0" y="0" width="1" height="31" fill="#fff" fill-opacity="0.13"/>
	<rect x="0" y="30" width="88" height="1" fill="#000" fill-opacity="0.55"/>
	<rect x="87" y="0" width="1" height="31" fill="#000" fill-opacity="0.55"/>
</svg>
'''


def build_favicon():
    """A tab icon needs its own square mark - the 88x31 badge was being
    squashed into a smear at 16px. Drawn on the 32-grid and scaled by exactly
    2, which is the one resize that keeps pixel art intact."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32" shape-rendering="crispEdges" role="img" aria-label="James">
	{DEFS}
	<rect width="32" height="32" rx="5" fill="url(#bg)"/>
	<rect x="2" y="2" width="28" height="28" rx="3" fill="url(#am)"/>
	{puck_head(3, 4, (3, 1, 29, 25))}
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
