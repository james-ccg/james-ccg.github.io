#!/usr/bin/env python3
"""Generates assets/badge.png (88x31) and assets/favicon.png (64x64).

Both carry Puck's head, taken from the same sprite the rest of the site uses,
so the mark and the mascot can never drift apart.

These were SVG while the mascot was hand-drawn vector pixels. Now that the
sprite is downsampled from real art, PNG is the honest format - and an 88x31
PNG is what the button-trading convention expects anyway.

    python tools/make_marks.py    (run make_puck.py first)
"""
import os

from PIL import Image, ImageDraw

BG = (20, 21, 28, 255)
BG_TOP = (27, 29, 40, 255)
AMBER = (255, 180, 84, 255)
AMBER_TOP = (255, 194, 112, 255)
TEXT = (242, 244, 250, 255)

# 4x7 face. A 3x5 predecessor was too coarse to hold a letterform at this size.
GLYPH_W, GLYPH_H, TRACK = 4, 7, 1
FONT = {
    'J': ["...X", "...X", "...X", "...X", "X..X", "X..X", ".XX."],
    'A': [".XX.", "X..X", "X..X", "XXXX", "X..X", "X..X", "X..X"],
    'M': ["X..X", "XXXX", "XXXX", "X..X", "X..X", "X..X", "X..X"],
    'E': ["XXXX", "X...", "X...", "XXX.", "X...", "X...", "XXXX"],
    'S': [".XXX", "X...", "X...", ".XX.", "...X", "...X", "XXX."],
}


def text_width(s, scale):
    return len(s) * (GLYPH_W + TRACK) * scale - TRACK * scale


def draw_text(d, s, x, y, scale, fill):
    cx = x
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for c, cell in enumerate(row):
                if cell == 'X':
                    d.rectangle(
                        [cx + c * scale, y + r * scale,
                         cx + (c + 1) * scale - 1, y + (r + 1) * scale - 1],
                        fill=fill,
                    )
        cx += (GLYPH_W + TRACK) * scale


def vgrad(size, top, bottom):
    w, h = size
    im = Image.new('RGBA', size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line(
            [(0, y), (w, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)),
        )
    return im


def head(mascot_dir, size):
    """Puck's head from the sprite, nearest-neighbour so it stays pixel art."""
    im = Image.open(os.path.join(mascot_dir, 'idle.png')).convert('RGBA')
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    scale = min(size / w, size / h)
    return im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.NEAREST)


def build_badge(mascot_dir):
    W, H, MARK = 88, 31, 31
    im = vgrad((W, H), BG_TOP, BG)
    im.paste(vgrad((MARK, H), AMBER_TOP, AMBER), (0, 0))

    puck = head(mascot_dir, MARK - 2)
    im.paste(puck, ((MARK - puck.width) // 2, (H - puck.height) // 2), puck)

    d = ImageDraw.Draw(im)
    d.line([(MARK, 0), (MARK, H)], fill=(20, 21, 28, 160))

    # Scale 2, not 3. A square 31px mark leaves 57px for the wordmark, and
    # JAMES at scale 3 measures 72 - it ran off the right edge with the S
    # sheared in half. The assert makes that a build failure, not a surprise.
    scale = 2
    w = text_width('JAMES', scale)
    assert w <= W - MARK - 4, f'wordmark {w}px does not fit {W - MARK}px'
    draw_text(d, 'JAMES', MARK + (W - MARK - w) // 2, (H - GLYPH_H * scale) // 2, scale, TEXT)

    # Bevel: light top-left, dark bottom-right.
    d.line([(0, 0), (W, 0)], fill=(255, 255, 255, 56))
    d.line([(0, 0), (0, H)], fill=(255, 255, 255, 33))
    d.line([(0, H - 1), (W, H - 1)], fill=(0, 0, 0, 140))
    d.line([(W - 1, 0), (W - 1, H)], fill=(0, 0, 0, 140))
    return im


def build_favicon(mascot_dir):
    """A tab icon needs its own square mark - the 88x31 badge was being
    squashed into a smear at 16px."""
    S = 64
    im = vgrad((S, S), BG_TOP, BG)
    plate = vgrad((S - 10, S - 10), AMBER_TOP, AMBER)
    im.paste(plate, (5, 5))
    puck = head(mascot_dir, S - 14)
    im.paste(puck, ((S - puck.width) // 2, (S - puck.height) // 2), puck)
    return im


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    mascot = os.path.join(root, 'assets', 'mascot')
    for name, im in (('badge', build_badge(mascot)), ('favicon', build_favicon(mascot))):
        path = os.path.join(root, 'assets', f'{name}.png')
        im.save(path, 'PNG', optimize=True)
        print(f'wrote assets/{name}.png  {os.path.getsize(path)} bytes')
        old = os.path.join(root, 'assets', f'{name}.svg')
        if os.path.exists(old):
            os.remove(old)
            print(f'removed stale assets/{name}.svg')


if __name__ == '__main__':
    main()
