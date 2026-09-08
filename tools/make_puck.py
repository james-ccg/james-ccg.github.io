#!/usr/bin/env python3
"""Generates assets/mascot/*.svg - Puck, at 32x32.

Original pixel art of Puck from Re:Zero (Kadokawa / White Fox). Drawn here
rather than copied, since these pages are public.

The first version of this file stacked ellipses and ran a procedural shading
pass over them. That produces a creature, but not *this* creature - likeness
lives in the face, and a disc with an auto-shader gives you a generic grey
blob every time. So the art is hand-authored on a grid.

Only the left half is written out; the right half is mirrored from it. That
guarantees a symmetric face for free and halves the work, and the handful of
things that are genuinely asymmetric - his gold hoop, the tail, a raised paw -
are added afterwards.

Puck's tells, and why each one is in here: light grey and white fur, large
aqua eyes set high and wide, big pointed ears with pink inside, a small pink
nose, a thick curling tail as long as his body, and the single gold hoop on
his left ear. Miss the ears and the eyes and it reads as a mouse.

    python tools/make_puck.py
"""
import io
import os

N = 32
H = N // 2

# Ramps: shadows lean blue, highlights lean warm.
C = {
    'o': '#232838',   # outline - blue-black, never pure black
    'W': '#f7f9fd',   # fur highlight
    'F': '#dbe2ee',   # fur base
    'S': '#aab6c9',   # fur shadow
    'D': '#8592a8',   # fur deep shadow
    'P': '#f6a8bd',   # pink - inner ear and nose
    'p': '#d4809a',   # pink shadow
    'E': '#5fe0d6',   # eye - the aqua he is known for
    'e': '#1d8f88',   # eye shadow
    'H': '#ffffff',   # eye glint
    'G': '#ffd166',   # earring gold
    'g': '#d2a034',   # earring shadow
}

# Left half only, 16 columns wide. Column 15 is the centre line, so anything
# touching it becomes 2px wide after mirroring.
LEFT = [
    "................",  # 0
    "......o.........",  # 1   ear tip
    ".....oPo........",  # 2
    ".....oPPo.......",  # 3
    "....oWPPo.......",  # 4
    "....oWFPPo......",  # 5
    "...oWFFPPo......",  # 6
    "...oWFFFPo..oooo",  # 7   ear meets the crown of the head
    "..oWFFFFFooWWWWW",  # 8
    "..oWFFFFWWWWWWWW",  # 9
    ".oWFFFWWWWWWWWWW",  # 10
    ".oWFFWWWWWWWWWWW",  # 11
    ".oWFWWWWWWWWWWWW",  # 12
    ".oFWWoooooWWWWWW",  # 13  eyes start - big, set high and wide
    ".oFWoEEEEEoWWWWW",  # 14
    ".oFWoEHEEEoWWWWW",  # 15  glint top-left, matching the light
    ".oFWoEEEEEoWWWWW",  # 16
    ".oFWoEEEEeoWWWWW",  # 17
    ".oFWWoooooWWWWPP",  # 18  nose
    ".oSFWWWWWWWWWWPP",  # 19
    "..oSFWWWWWWWWWWW",  # 20
    "...oSFFWWWWWWWWW",  # 21
    "....oSSFFFWWWWWW",  # 22
    "......ooSSSFFFFF",  # 23
    ".........oooSSSS",  # 24
    "................",  # 25
    "................",  # 26
    "................",  # 27
    "................",  # 28
    "................",  # 29
    "................",  # 30
    "................",  # 31
]


def mirrored():
    """Left half plus its reflection - a symmetric face, guaranteed."""
    grid = []
    for row in LEFT:
        assert len(row) == H, f'row must be {H} wide, got {len(row)}'
        grid.append(list(row + row[::-1]))
    assert len(grid) == N
    return grid


def put(grid, pts, ch):
    for x, y in pts:
        if 0 <= x < N and 0 <= y < N:
            grid[y][x] = ch


def stroke(grid, pts, ch, r=1, only_empty=True):
    """Round brush along a polyline. `only_empty` keeps the tail from carving
    into the body it grows out of."""
    for cx, cy in pts:
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy > r * r + 0.6:
                    continue
                x, y = cx + dx, cy + dy
                if not (0 <= x < N and 0 <= y < N):
                    continue
                if only_empty and grid[y][x] != '.':
                    continue
                grid[y][x] = ch


def filled(grid, x, y):
    return 0 <= x < N and 0 <= y < N and grid[y][x] != '.'


def outline(grid, ch='o'):
    """1px dark edge outside the silhouette, 4-neighbour so it never bridges
    a gap into a solid plate."""
    edge = [
        (x, y)
        for y in range(N)
        for x in range(N)
        if grid[y][x] == '.'
        and any(filled(grid, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    ]
    for x, y in edge:
        grid[y][x] = ch


def close_eyes(grid):
    """Blink and sleep: the eye block collapses to a lash line."""
    for y in range(13, 19):
        for x in range(N):
            if grid[y][x] in 'EeH':
                grid[y][x] = 'W'
    for ex in (5, 21):
        put(grid, [(ex + i, 15) for i in range(6)], 'o')


def build(pose):
    g = mirrored()

    # No tail. This is a head, not a whole cat - the sprite is 32px and the
    # face is what carries the likeness, so the body was cut. A tail growing
    # out of nothing just read as a stray nub in the corner.

    # His single clearest tell: one gold hoop, on his left ear (screen right).
    put(g, [(25, 8), (26, 8), (26, 9), (25, 10)], 'G')
    put(g, [(26, 10)], 'g')

    if pose in ('blink', 'sleep'):
        close_eyes(g)
    if pose == 'sleep':
        put(g, [(14, 21), (15, 21), (16, 21), (17, 21)], 'S')

    if pose == 'wave':
        # A wink, not a raised paw. The head fills the sprite edge to edge, so
        # there is nowhere outside the silhouette for an arm to go - and a paw
        # drawn inside it just vanished.
        for y in range(13, 19):
            for x in range(0, N // 2):
                if g[y][x] in 'EeH':
                    g[y][x] = 'W'
        put(g, [(5 + i, 15) for i in range(6)], 'o')

    outline(g)
    return g


def to_svg(g, pose):
    rects = []
    for y in range(N):
        x = 0
        while x < N:
            ch, run = g[y][x], 1
            while x + run < N and g[y][x + run] == ch:
                run += 1
            if ch in C:
                rects.append(
                    f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{C[ch]}"/>'
                )
            x += run
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{N}" height="{N}" '
        f'viewBox="0 0 {N} {N}" shape-rendering="crispEdges" role="img" '
        f'aria-label="Puck, the site mascot ({pose})">{"".join(rects)}</svg>\n'
    )


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    out = os.path.join(root, 'assets', 'mascot')
    os.makedirs(out, exist_ok=True)
    for pose in ('idle', 'blink', 'wave', 'sleep'):
        path = os.path.join(out, f'{pose}.svg')
        io.open(path, 'w', encoding='utf-8', newline='\n').write(to_svg(build(pose), pose))
        print(f'wrote assets/mascot/{pose}.svg')


if __name__ == '__main__':
    main()
