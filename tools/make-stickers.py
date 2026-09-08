#!/usr/bin/env python3
"""Generates assets/stickers.svg - the gacha prize sheet.

Ten 12x12 pixel collectibles, emitted as <symbol>s so the arcade page can
reference them with <use> and pay for one request instead of ten.

    python tools/make-stickers.py
"""
import io
import os

PAL = {
    'k': '#14151c', 'a': '#ffb454', 'w': '#ffffff', 'r': '#ff6b6b',
    'g': '#7ee2b8', 'b': '#6db3f2', 'p': '#c08bf5', 'y': '#ffe066',
    'd': '#8e93a8', 'n': '#3b3f56',
}

S = {
 'star':    ["............",".....yy.....","....yyyy....","...yyyyyy...",
             "yyyyyyyyyyyy",".yyyyyyyyyy.","..yyyyyyyy..","...yyyyyy...",
             "..yyy..yyy..",".yy......yy.","............","............"],
 'heart':   ["............",".rr......rr.","rrrr....rrrr","rrrrrr.rrrrr",
             "rrrrrrrrrrrr","rrrrrrrrrrrr",".rrrrrrrrrr.","..rrrrrrrr..",
             "...rrrrrr...","....rrrr....",".....rr.....","............"],
 'coin':    ["....aaaa....","..aaaaaaaa..",".aaaawwaaaa.","aaaaawwaaaaa",
             "aaaawwwwaaaa","aaaaawwaaaaa","aaaaawwaaaaa",".aaaawwaaaa.",
             "..aaaaaaaa..","....aaaa....","............","............"],
 'floppy':  ["kkkkkkkkkkkk","kwwwwwwwwwwk","kwkkkkkkkkwk","kwkddddddkwk",
             "kwkddddddkwk","kwkkkkkkkkwk","kwwwwwwwwwwk","kwwkkkkkkwwk",
             "kwwkwwwwwkwk","kwwkwwwwwkwk","kwwkkkkkkkwk","kkkkkkkkkkkk"],
 'cassette':["kkkkkkkkkkkk","knnnnnnnnnnk","knwwwwwwwwnk","knwkkkkkkwnk",
             "knwkddddkwnk","knwkddddkwnk","knwkkkkkkwnk","knwwwwwwwwnk",
             "knnnnnnnnnnk","knnkknnkknnk","kkkkkkkkkkkk","............"],
 'gem':     ["............","...bbbbbb...","..bwwbbbbb..",".bbwbbbbbbb.",
             "bbbbbbbbbbbb",".bbbbbbbbbb.","..bbbbbbbb..","...bbbbbb...",
             "....bbbb....",".....bb.....","............","............"],
 'ghost':   ["....wwww....","..wwwwwwww..",".wwwwwwwwww.","wwkkwwwwkkww",
             "wwkkwwwwkkww","wwwwwwwwwwww","wwwwwwwwwwww","wwwwwwwwwwww",
             "wwwwwwwwwwww","w.ww.ww.ww.w","............","............"],
 'mushroom':["...rrrrrr...",".rrwwrrwwrr.","rrrwwrrwwrrr","rrrrrrrrrrrr",
             "rrrrrrrrrrrr",".rrrrrrrrrr.","...wwwwww...","..wwkwwkww..",
             "..wwwwwwww..","...wwwwww...","............","............"],
 'key':     ["...aaaa.....","..a....a....",".a......a...",".a......a...",
             "..a....a....","...aaaa.....","....aa......","....aa......",
             "....aaa.....","....aa......","....aaa.....","............"],
 'crown':   ["............","p....p....p.","pp..ppp..pp.","ppp.ppp.ppp.",
             "pppppppppppp","pppyppypppp.","pppppppppppp",".pppppppppp.",
             "............","............","............","............"],
}


def to_symbol(name, grid):
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            ch, run = row[x], 1
            while x + run < len(row) and row[x + run] == ch:
                run += 1
            if ch in PAL:
                rects.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{PAL[ch]}"/>')
            x += run
    return f'<symbol id="s-{name}" viewBox="0 0 12 12">{"".join(rects)}</symbol>'


def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    for n, g in S.items():
        assert len(g) == 12 and all(len(r) == 12 for r in g), n
    body = '\n  '.join(to_symbol(n, g) for n, g in S.items())
    out = os.path.join(root, 'assets', 'stickers.svg')
    io.open(out, 'w', encoding='utf-8', newline='\n').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n  {body}\n</svg>\n'
    )
    print('wrote assets/stickers.svg -', len(S), 'stickers')


if __name__ == '__main__':
    main()
