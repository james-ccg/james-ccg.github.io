#!/usr/bin/env python3
"""Generates assets/mascot/*.svg - Puck, at 32x32.

Original pixel art of Puck from Re:Zero (Kadokawa / White Fox). Drawn here
rather than copied, and used as a personal site mascot.

Built from shape masks instead of a hand-typed grid so the silhouette can be
adjusted and re-rendered rather than retyped. It follows the usual rules: one
light direction (top-left), a real colour ramp per material with shadows
shifted toward blue, a consistent 1px outline added outside the silhouette,
and no pillow shading - shade follows the light rather than ringing the edge.

    python tools/make_puck.py
"""
import io
import os

N = 32

# Ramps. Shadows lean blue and highlights lean warm; that hue shift is most of
# what separates pixel art from flat clip art.
C = {
    'o': '#232838',   # outline - blue-black, not pure black
    'W': '#f4f7fc',   # fur highlight
    'F': '#d3dbe8',   # fur base
    'S': '#a6b2c6',   # fur shadow
    'D': '#77869e',   # fur deep shadow
    'P': '#f6a8bd',   # pink - inner ear and nose
    'p': '#d4809a',   # pink shadow
    'E': '#5fe0d6',   # eye - the aqua he is known for
    'e': '#22a79f',   # eye shadow
    'H': '#ffffff',   # eye glint
    'G': '#ffd166',   # earring gold
    'g': '#d2a034',   # earring shadow
}

BODY = 'WFSD'


def blank():
    return [['.' for _ in range(N)] for _ in range(N)]


def disc(grid, cx, cy, rx, ry, ch):
    for y in range(N):
        for x in range(N):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                grid[y][x] = ch


def blob(grid, pts, ch):
    for x, y in pts:
        if 0 <= x < N and 0 <= y < N:
            grid[y][x] = ch


def stroke(grid, pts, ch, r=1):
    """Walk a polyline with a round brush - a 1px path reads as a wire at
    this size, and hand-placing every pixel of a curve is how the first tail
    ended up closing into a loop."""
    for cx, cy in pts:
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r + 0.6:
                    x, y = cx + dx, cy + dy
                    if 0 <= x < N and 0 <= y < N:
                        grid[y][x] = ch


def filled(grid, x, y):
    return 0 <= x < N and 0 <= y < N and grid[y][x] != '.'


def outline(grid, ch='o'):
    """1px dark edge placed outside the silhouette, so it never eats detail."""
    edge = []
    for y in range(N):
        for x in range(N):
            if grid[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if filled(grid, x + dx, y + dy):
                    edge.append((x, y))
                    break
    for x, y in edge:
        grid[y][x] = ch


def shade(grid):
    """Light from the top-left. A pixel with nothing up-left of it catches the
    highlight; one with nothing down-right of it falls into shadow. Ringing
    every edge equally instead is the pillow-shading mistake."""
    src = [row[:] for row in grid]
    for y in range(N):
        for x in range(N):
            if src[y][x] not in BODY:
                continue
            if not filled(src, x - 1, y - 1):
                grid[y][x] = 'W'
            elif not filled(src, x + 2, y + 2):
                grid[y][x] = 'D'
            elif not filled(src, x + 1, y + 1):
                grid[y][x] = 'S'
            else:
                grid[y][x] = 'F'


def build_base():
    g = blank()

    disc(g, 15, 23, 6.5, 5.0, 'F')     # body, deliberately small
    disc(g, 15, 13, 10.0, 9.0, 'F')    # head, deliberately large

    # Tail last, and clear of the body. Drawn before the discs it was painted
    # over and only a sliver survived, which read as an outline artefact.
    stroke(g, [(20, 26), (23, 27), (25, 26), (27, 24),
               (28, 22), (28, 19), (27, 17)], 'F')

    # Floppy ears: wide at the base, drooping outward and down.
    blob(g, [(7, 3), (8, 3), (6, 4), (7, 4), (8, 4), (9, 4),
             (5, 5), (6, 5), (7, 5), (8, 5), (9, 5),
             (4, 6), (5, 6), (6, 6), (7, 6), (8, 6),
             (4, 7), (5, 7), (6, 7), (7, 7)], 'F')
    blob(g, [(24, 3), (23, 3), (25, 4), (24, 4), (23, 4), (22, 4),
             (26, 5), (25, 5), (24, 5), (23, 5), (22, 5),
             (27, 6), (26, 6), (25, 6), (24, 6), (23, 6),
             (27, 7), (26, 7), (25, 7), (24, 7)], 'F')
    return g


def add_features(g, pose):
    # Inner ears
    blob(g, [(6, 5), (7, 5), (6, 6), (7, 6), (5, 6)], 'P')
    blob(g, [(25, 5), (24, 5), (25, 6), (24, 6), (26, 6)], 'P')
    blob(g, [(5, 7), (6, 7)], 'p')
    blob(g, [(26, 7), (25, 7)], 'p')

    if pose in ('idle', 'wave'):
        for ex in (9, 19):
            blob(g, [(ex + 1, 10), (ex + 2, 10),
                     (ex, 11), (ex + 1, 11), (ex + 2, 11), (ex + 3, 11),
                     (ex, 12), (ex + 1, 12), (ex + 2, 12), (ex + 3, 12),
                     (ex, 13), (ex + 1, 13), (ex + 2, 13), (ex + 3, 13),
                     (ex + 1, 14), (ex + 2, 14)], 'E')
            blob(g, [(ex + 3, 13), (ex + 1, 14), (ex + 2, 14)], 'e')
            blob(g, [(ex + 1, 10), (ex, 11)], 'H')
    else:
        # Blink and sleep shut the eyes to a lash line.
        for ex in (9, 19):
            blob(g, [(ex, 12), (ex + 1, 12), (ex + 2, 12), (ex + 3, 12)], 'o')

    # Where the head meets the body - without it the two discs read as one blob
    blob(g, [(11, 20), (12, 20), (13, 20), (14, 20), (15, 20),
             (16, 20), (17, 20), (18, 20), (19, 20)], 'S')

    # Nose and muzzle
    blob(g, [(15, 15), (16, 15), (15, 16)], 'P')
    blob(g, [(13, 17), (14, 17), (17, 17), (18, 17)], 'S')

    # The gold hoop on his left ear (screen right) - his single clearest tell.
    blob(g, [(27, 8), (28, 8), (28, 9)], 'G')
    blob(g, [(27, 9)], 'g')

    if pose == 'wave':
        # The paw is raised beside the head, outside the silhouette. Tucked
        # against the body it was simply repainted by the head and the pose
        # looked identical to idle.
        blob(g, [(2, 12), (3, 12), (1, 13), (2, 13), (3, 13),
                 (1, 14), (2, 14), (3, 14), (2, 15), (3, 15),
                 (3, 16), (4, 16), (4, 17), (5, 17)], 'W')
        blob(g, [(3, 14), (3, 15), (4, 17)], 'F')


def build(pose):
    g = build_base()
    shade(g)
    add_features(g, pose)
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
