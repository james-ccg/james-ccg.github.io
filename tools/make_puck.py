#!/usr/bin/env python3
"""Builds every Puck asset from the one source render.

`assets/mascot/Puck_Render.webp` is art the site owner supplies and owns. Both
the display images and the pixel sprite are derived from it, so the mascot is
one character everywhere instead of a drawing and a separate guess at it.

Three earlier hand-drawn attempts are why this file works the way it does:
stacked ellipses with an auto-shader gave a generic blob; mirroring one half
flattened his asymmetric ears, which are the thing that identifies him; and
even a careful hand-authored grid could not reach the quality of real art. So
the sprite is now *downsampled* from the render rather than guessed at.

Outputs:
    assets/mascot/puck-512.webp   hero / large display
    assets/mascot/puck-256.webp   medium
    assets/mascot/idle.png        96x96 pixel sprite
    assets/mascot/blink.png       eyes shut
    assets/mascot/wave.png        winking
    assets/mascot/sleep.png       eyes shut, drowsier

    python tools/make_puck.py
"""
import io
import os

from PIL import Image

SPRITE = 96
PALETTE_COLORS = 40
SRC_NAME = 'Puck_Render.webp'

# The sprite is a head crop, not the whole cat: fitting the full sitting pose
# into 96px leaves the head at 30px and each eye at 4px, too small for a blink
# to register at all.
#
# These numbers are read off the source with a tenths grid rather than guessed.
# On the trimmed subject his ear tips span x .17 to .68 - the left ear leans
# out further than it looks - and his chin bottoms out at y .44. Earlier crops
# crept inward and clipped the left ear, and reached past .44 into the neck
# ruff, which pulled the face off-centre in the frame.
HEAD_CROP = (0.17, 0.00, 0.68, 0.40)


def load_source(mascot_dir):
    path = os.path.join(mascot_dir, SRC_NAME)
    if not os.path.exists(path):
        raise SystemExit(f'missing source art: {path}')
    im = Image.open(path).convert('RGBA')
    # Trim the transparent margin, otherwise the subject shrinks inside its
    # own padding when we fit it to a square.
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def crop_head(im):
    """The head, as a fraction of the trimmed subject box."""
    w, h = im.size
    l, t, r, b = HEAD_CROP
    return im.crop((round(w * l), round(h * t), round(w * r), round(h * b)))


def largest_blob(im):
    """Keep only the biggest connected run of opaque pixels.

    Cropping a rectangle around the head also catches the base of his tail
    rising behind it. That fragment is disconnected from the head, but it
    still widens the alpha box - so centring the image centred head-plus-
    fragment, and the head itself sat visibly off to one side. Flood fill
    from the largest component and drop everything else."""
    px = im.load()
    w, h = im.size
    seen = [[False] * w for _ in range(h)]
    best, best_size = None, 0
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or px[sx, sy][3] <= 128:
                continue
            stack, comp = [(sx, sy)], []
            seen[sy][sx] = True
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 128:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if len(comp) > best_size:
                best, best_size = comp, len(comp)
    if not best:
        return im
    keep = set(best)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    op = out.load()
    for x, y in keep:
        op[x, y] = px[x, y]
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def fit_square(im, size, pad=0):
    """Scale to fit inside size x size, centred, on transparency.

    `pad` leaves a margin. Without it the head is scaled until its longest
    side touches both frame edges, which clipped his ear tips at the top and
    his chin at the bottom - and left no room for the face-centring shift to
    move into."""
    w, h = im.size
    inner = max(1, size - pad * 2)
    scale = min(inner / w, inner / h)
    new = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(new, ((size - new.width) // 2, (size - new.height) // 2), new)
    return out


def pixelate(im, size, colors):
    """Downsample, then quantise. LANCZOS first keeps the shapes legible;
    going straight to NEAREST at this ratio drops whole features like the
    earring. Alpha is re-applied hard afterwards so edges stay crisp rather
    than fading into a halo, which is what makes it read as pixel art.

    Returns (quantised, clean). The clean downsample is kept because his eyes
    are a small saturated region that quantisation flattens toward the fur -
    finding them afterwards silently fails, which is what made blink and wink
    come out identical to idle."""
    clean = fit_square(im, size, pad=7)
    alpha = clean.getchannel('A').point(lambda a: 255 if a > 128 else 0)
    rgb = clean.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT).convert('RGB')
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out, clean


def centre_on_face(im, eyes):
    """Shift the sprite so the midpoint between the eyes is the centre.

    Centring on the alpha box looked wrong and measured right: his left ear
    stands up in a tall point while the right one folds down, so the box is
    taller and wider on one side and its centre is not the face's centre. The
    eyes are the only landmark that tracks where a viewer thinks the middle
    is."""
    if not eyes:
        return im, 0
    xs = [x for x, _ in eyes]
    ys = [y for _, y in eyes]
    face_x = (min(xs) + max(xs)) / 2
    shift = round(im.width / 2 - face_x)
    if not shift:
        return im, 0
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (shift, 0), im)
    return out, shift


def eye_pixels(im):
    """Puck's eyes are the only strongly cyan region - his fur is neutral
    grey-lavender and everything else is pink or gold."""
    px = im.load()
    found = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 128 and b > r + 25 and g > r + 15 and b > 90:
                found.append((x, y))
    return found


def close_eyes(im, eyes, side=None, lash=(58, 53, 71)):
    """Shut the eyes by filling each eye's box with fur and laying a lash
    across it.

    An earlier version recoloured eye pixels one at a time using the nearest
    non-eye neighbour. That neighbour is almost always the dark eye outline,
    so the eye was repainted in a colour close to what it already was: 107
    pixels changed and the result was indistinguishable from idle. Filling the
    whole box with fur sampled from above the eye is what makes it read.

    `side` of 'left' or 'right' winks. The split uses the midpoint of the eye
    pixels rather than the image centre, because the subject is not centred.
    """
    im = im.copy()
    if not eyes:
        return im
    xs = [x for x, _ in eyes]
    mid = (min(xs) + max(xs)) // 2

    groups = {'l': [], 'r': []}
    for x, y in eyes:
        groups['l' if x <= mid else 'r'].append((x, y))
    if side == 'left':
        groups['r'] = []
    elif side == 'right':
        groups['l'] = []

    px = im.load()
    for pts in groups.values():
        if not pts:
            continue
        x0, x1 = min(x for x, _ in pts), max(x for x, _ in pts)
        y0, y1 = min(y for _, y in pts), max(y for _, y in pts)

        # Fur colour from just above the eye - reliably forehead, never lid.
        cx = (x0 + x1) // 2
        fur = (231, 229, 240, 255)
        for dy in range(2, 8):
            if y0 - dy >= 0 and px[cx, y0 - dy][3] > 128:
                fur = px[cx, y0 - dy]
                break

        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if px[x, y][3] > 128:
                    px[x, y] = fur

        # A lash line with the ends lifted, so it reads as a closed eye
        # rather than a struck-through one.
        row = y0 + round((y1 - y0) * 0.55)
        span = x1 - x0
        for x in range(x0, x1 + 1):
            t = abs((x - x0) / span - 0.5) * 2 if span else 0
            r = row - (1 if t > 0.65 else 0)
            for dy in (0, 1):
                if 0 <= r + dy < im.height and px[x, r + dy][3] > 128:
                    px[x, r + dy] = lash + (255,)
    return im


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    mascot = os.path.join(root, 'assets', 'mascot')
    src = load_source(mascot)

    for size in (512, 256):
        out = fit_square(src, size)
        path = os.path.join(mascot, f'puck-{size}.webp')
        out.save(path, 'WEBP', quality=90, method=6)
        print(f'wrote assets/mascot/puck-{size}.webp  {os.path.getsize(path) // 1024} KB')

    idle, clean = pixelate(largest_blob(crop_head(src)), SPRITE, PALETTE_COLORS)
    eyes = eye_pixels(clean)

    # Paint the eyes back in from the clean downsample. His eyes are a small
    # saturated region, so whether the quantiser keeps a teal depends on the
    # rest of the frame - tightening the crop was enough to lose it and leave
    # him grey-eyed. Restoring them makes the one colour that identifies him
    # independent of the palette.
    src_px, dst_px = clean.load(), idle.load()
    for x, y in eyes:
        dst_px[x, y] = src_px[x, y]

    # Centre the silhouette, not the face. Shifting to put the midpoint of
    # the eyes on the frame centre is defensible in theory and looked wrong in
    # practice: his left ear is taller and wider, so the shift left a visibly
    # bigger gap down one side of the frame. fit_square already centres the
    # trimmed content, and with a margin in place the head reads as centred.
    print(f'found {len(eyes)} eye pixels')
    poses = {
        'idle': idle,
        'blink': close_eyes(idle, eyes),
        'wave': close_eyes(idle, eyes, side='left'),
        'sleep': close_eyes(idle, eyes),
    }
    for name, im in poses.items():
        path = os.path.join(mascot, f'{name}.png')
        im.save(path, 'PNG', optimize=True)
        print(f'wrote assets/mascot/{name}.png  {os.path.getsize(path) // 1024} KB')

    # The hand-drawn SVGs are superseded; leaving them would let a stale path
    # keep resolving and hide a mistake.
    for name in ('idle', 'blink', 'wave', 'sleep'):
        old = os.path.join(mascot, f'{name}.svg')
        if os.path.exists(old):
            os.remove(old)
            print(f'removed stale assets/mascot/{name}.svg')


if __name__ == '__main__':
    main()
