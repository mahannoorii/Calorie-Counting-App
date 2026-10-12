"""Generate Spotter's app icons: the two weekly rings (train and eat) on a near-black tile.

Run from the repo root:  python3 tools/make_icons.py
Needs Pillow (pip install pillow).
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

BG = (17, 17, 20, 255)
ORANGE = (255, 90, 31)
GREEN = (47, 191, 87)
OUT = Path(__file__).resolve().parent.parent / "spotter" / "icons"

# ring: (colour, radius as a share of the tile, how far it is closed)
RINGS = [(ORANGE, 0.300, 0.78), (GREEN, 0.190, 0.62)]
STROKE = 0.085


def draw_ring(d, c, r, w, colour, frac):
    box = [c - r, c - r, c + r, c + r]
    d.ellipse(box, outline=colour + (56,), width=int(w))  # the track
    start = -90
    end = start + 360 * frac
    d.arc(box, start=start, end=end, fill=colour + (255,), width=int(w))
    # round caps
    for ang in (start, end):
        a = math.radians(ang)
        x = c + (r - w / 2) * math.cos(a)
        y = c + (r - w / 2) * math.sin(a)
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=colour + (255,))


def icon(size, scale=1.0, rounded=False):
    """Draw the mark at `size` px. `scale` shrinks the rings for maskable safe zones."""
    big = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    base = ImageDraw.Draw(img)
    if rounded:
        base.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.225), fill=BG)
    else:
        base.rectangle([0, 0, big, big], fill=BG)
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = big / 2
    w = big * STROKE * scale
    for colour, r, frac in RINGS:
        draw_ring(d, c, big * r * scale + w / 2, w, colour, frac)
    img.alpha_composite(layer)
    return img.resize((size, size), Image.LANCZOS)


def svg():
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">', '<rect width="100" height="100" rx="22.5" fill="#111114"/>']
    for colour, r, frac in RINGS:
        rr = r * 100
        circ = 2 * math.pi * rr
        hexc = "#%02x%02x%02x" % colour
        parts.append(f'<circle cx="50" cy="50" r="{rr:.2f}" fill="none" stroke="{hexc}" stroke-opacity=".22" stroke-width="{STROKE * 100}"/>')
        parts.append(f'<circle cx="50" cy="50" r="{rr:.2f}" fill="none" stroke="{hexc}" stroke-width="{STROKE * 100}" stroke-linecap="round" stroke-dasharray="{circ * frac:.2f} {circ:.2f}" transform="rotate(-90 50 50)"/>')
    parts.append("</svg>\n")
    return "".join(parts)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192).save(OUT / "icon-192.png")
    icon(512).save(OUT / "icon-512.png")
    icon(512, scale=0.8).save(OUT / "icon-512-maskable.png")
    icon(180).convert("RGB").save(OUT / "apple-touch-icon.png")
    icon(32, rounded=True).save(OUT / "favicon-32.png")
    (OUT / "icon.svg").write_text(svg())
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
