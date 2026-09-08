#!/usr/bin/env python3
"""Generates assets/mascot/*.svg - Puck, at 32x32.

Original pixel art of Puck from Re:Zero (Kadokawa / White Fox), drawn here
rather than copied, since these pages are public.

Two earlier attempts failed for reasons worth recording:

1. Stacking ellipses and running an auto-shader over them. That reliably
   produces a creature and just as reliably the wrong one - likeness lives in
   the face, and a disc with a shading pass is a generic grey blob whatever
   character it is meant to be.
2. Authoring one half and mirroring it. Symmetric faces are cheap that way,
   but *Puck's head is not symmetric*: his left ear stands up in a point while
   his right ear folds over, and the gold hoop hangs from the folded one.
   Mirroring flattened exactly the detail that identifies him, which is why
   the earring read as something stuck on rather than worn.

So the full grid is hand-authored. Rows are padded on the right, so only the
meaningful prefix has to be typed, and an assert catches anything too long.

Working from reference, the tells that matter at this size: grey-lavender
outer fur against a white face and chest, a white V marking on the forehead,
large teal almond eyes with strong highlights, pink blush, a small pink nose,
the asymmetric ears, and the single gold hoop.

    python tools/make_puck.py
"""
import io
import os

N = 32

C = {
    'o': '#3a3547',   # outline - soft dark violet, not black
    'G': '#c9c6d4',   # outer fur, grey-lavender
    'S': '#aaa5ba',   # fur shadow
    'D': '#8b8799',   # fur deep shadow
    'W': '#fbfaff',   # face, chest, muzzle
    'w': '#e6e4ef',   # white in shadow
    'P': '#f0c0c8',   # inner ear
    'B': '#f5b0be',   # blush
    'N': '#ef9fb0',   # nose
    'E': '#5fc9d8',   # eye, teal
    'e': '#2e8ba0',   # eye depth
    'H': '#ffffff',   # eye highlight
    'Y': '#e8c05a',   # earring gold
    'y': '#bf9530',   # earring shadow
}

# Left ear points up; the right ear folds over and carries the hoop. The white
# V on the forehead runs from between the ears down between the eyes.
ART = [
    ".......oo",                                      # 0
    "......oGGo",                                     # 1
    "......oGPGo",                                    # 2
    ".....oGPPGo...........oooo",                     # 3
    ".....oGPPGo........oooGGGGo",                    # 4
    "....oGPPPGooooooooooGGGGGGo",                    # 5
    "....oGPPGGGGGGGGGGGGGGPPGGo",                    # 6
    "...oGGPGGGGGGWGGGGGGGGPPGGo",                    # 7
    "...oGGGGGGGGWWWGGGGGGGGGGoYo",                   # 8
    "..oGGGGGGGGWWWWWGGGGGGGGGoYYo",                  # 9
    "..oGGGGGGGWWWWWWWGGGGGGGGGoYo",                  # 10
    ".oGGGGGGGWWWWWWWWWGGGGGGGGo",                    # 11
    ".oGGGGGGWWWWWWWWWWWGGGGGGGo",                    # 12
    ".oGGGooooWWWWWWWWWooooGGGGo",                    # 13  eyes: narrow
    ".oGGoHHEEoWWWWWWWoHHEEoGGGo",                    # 14  and tall, the
    ".oGGoHEEEoWWWWWWWoHEEEoGGGo",                    # 15  way an almond
    ".oGGoEEEEoWWWWWWWoEEEEoGGGo",                    # 16  eye reads - a
    ".oGGoEEeeoWWWWWWWoEEeeoGGGo",                    # 17  wide block looks
    ".oGGGooooWWWWNNWWWooooGGGGo",                    # 18  like goggles
    ".oGBBGoWWWWWWNNWWWWoGBBGGo",                     # 19
    "..oGGGWWWWWWWWWWWWWWWGGGo",                      # 20
    "..oGGGWWWWWWWWWWWWWWWGGGo",                      # 21
    "...oGGGWWWWWWWWWWWWWGGGo",                       # 22
    "....oGGGGWWWWWWWWWGGGGo",                        # 23
    "......oGGGGWWWWWWGGGGo",                         # 24
    ".......ooGGGGGGGGGGoo",                          # 25
    ".........oooooooooo",                            # 26
]


def grid():
    g = []
    for row in ART:
        assert len(row) <= N, f'row is {len(row)} wide, max {N}'
        g.append(list(row.ljust(N, '.')))
    while len(g) < N:
        g.append(list('.' * N))
    return g


def put(g, pts, ch):
    for x, y in pts:
        if 0 <= x < N and 0 <= y < N:
            g[y][x] = ch


def close_eyes(g, side='both'):
    """Shut the eyes to lash lines. Puck's eye blocks sit at rows 13-18."""
    lo = 0 if side in ('both', 'left') else N // 2
    hi = N if side in ('both', 'right') else N // 2
    for y in range(13, 19):
        for x in range(lo, hi):
            if g[y][x] in 'EeH':
                g[y][x] = 'W'
    lashes = []
    if side in ('both', 'left'):
        lashes += [(4 + i, 15) for i in range(7)]
    if side in ('both', 'right'):
        lashes += [(17 + i, 15) for i in range(7)]
    put(g, lashes, 'o')


def smile(g):
    """A small w-shaped mouth under the nose. Drawn in rather than typed into
    the grid so the muzzle stays a clean white field."""
    put(g, [(12, 20), (15, 20), (13, 21), (14, 21)], 'o')


def build(pose):
    g = grid()
    smile(g)
    if pose == 'blink':
        close_eyes(g)
    elif pose == 'sleep':
        close_eyes(g)
        put(g, [(13, 22), (14, 22), (15, 22), (16, 22), (17, 22)], 'w')
    elif pose == 'wave':
        # A wink. The head fills the sprite, so there is nowhere outside the
        # silhouette to raise a paw, and a paw drawn inside it disappears.
        close_eyes(g, side='left')
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
