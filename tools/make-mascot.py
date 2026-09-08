#!/usr/bin/env python3
"""Generates the site mascot: assets/mascot/*.svg

An original character, drawn here as a pixel grid rather than traced from
anything - the site is public, so a recognisable anime character would be
someone else's art on someone else's terms.

"Byte" is a small amber ghost-cat: a rounded body, two ear tufts, big dark
eyes and a scarf in the site accent. Four poses share one palette so the
sprite can idle, blink, wave and sleep.

    python tools/make-mascot.py
"""
import io
import os

# palette keys used in the grids below
P = {
    'k': '#14151c',   # outline / eyes
    'a': '#ffb454',   # body (site accent)
    'd': '#d98c2b',   # body shade
    'w': '#ffffff',   # eye glint
    's': '#7ee2b8',   # scarf
    'p': '#ff9db0',   # cheek
}

# 16x16 grids. '.' is transparent. The body is kept inside columns 2-13 so
# columns 0-1 and 14-15 stay free for a raised paw - a full-width body left
# the wave pose with nowhere to put an arm, and every pose looked the same.
IDLE = [
    ".....kk..kk.....",
    "....kaakkaak....",
    "...kaaaaaaaak...",
    "..kaaaaaaaaaak..",
    "..kaaaaaaaaaak..",
    "..kakkaaaakkak..",
    "..kakkaaaakkak..",
    "..kaaaaaaaaaak..",
    "..kapaaaaaapak..",
    "..kaaaaaaaaaak..",
    "..kssssssssssk..",
    "..kaaaaaaaaaak..",
    "..kaaaaaaaaaak..",
    "..kaddaaaaddak..",
    "...kkk....kkk...",
    "................",
]

# Eyes shut to a single line. One row thinner than idle is the whole blink.
BLINK = list(IDLE)
BLINK[5] = "..kaaaaaaaaaak.."
BLINK[6] = "..kakkaaaakkak.."

# Lids wider than a blink so a held sleep never reads as a caught blink, and
# the cheeks drop away.
SLEEP = list(IDLE)
SLEEP[5] = "..kaaaaaaaaaak.."
SLEEP[6] = "..kkkkaaaakkkk.."
SLEEP[8] = "..kaaaaaaaaaak.."

# A paw lifted clear of the body on the right.
WAVE = list(IDLE)
WAVE[1] = "....kaakkaak.kk."
WAVE[2] = "...kaaaaaaaak.ak"
WAVE[3] = "..kaaaaaaaaaakak"
WAVE[4] = "..kaaaaaaaaaaaak"
WAVE[5] = "..kakkaaaakkakk.."[:16]

POSES = {'idle': IDLE, 'blink': BLINK, 'wave': WAVE, 'sleep': SLEEP}


def to_svg(grid, name):
    """Merge each row's equal-coloured runs into single rects."""
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            ch = row[x]
            run = 1
            while x + run < len(row) and row[x + run] == ch:
                run += 1
            if ch in P:
                rects.append(
                    f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{P[ch]}"/>'
                )
            x += run
    body = ''.join(rects)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" '
        f'viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" '
        f'aria-label="Byte the {name}">{body}</svg>\n'
    )


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    out = os.path.join(root, 'assets', 'mascot')
    os.makedirs(out, exist_ok=True)
    for pose, grid in POSES.items():
        assert len(grid) == 16 and all(len(r) == 16 for r in grid), pose
        path = os.path.join(out, f'{pose}.svg')
        io.open(path, 'w', encoding='utf-8', newline='\n').write(to_svg(grid, pose))
        print(f'wrote assets/mascot/{pose}.svg')


if __name__ == '__main__':
    main()
