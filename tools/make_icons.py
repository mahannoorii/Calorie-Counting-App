"""Generate Spotter's app icons: the Spotter barbell on a near-black tile. Training plates
(orange) load the left side, food plates (green) the right, as in the app's weekly bar.

Run from the repo root:  python3 tools/make_icons.py
Needs Pillow (pip install pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw

BG = (17, 17, 20, 255)
ORANGE = (255, 90, 31, 255)
GREEN = (47, 191, 87, 255)
STEEL = (226, 227, 232, 255)
OUT = Path(__file__).resolve().parent.parent / "spotter" / "icons"

# The mark on a 32-unit grid (same shapes as App.mark in core.js): x, y, w, h, corner, colour
MARK = [
    (2.0, 14.6, 28.0, 2.8, 1.4, STEEL),     # the bar
    (5.5, 7.0, 4.6, 18.0, 1.6, ORANGE),     # training plates
    (11.0, 9.5, 3.2, 13.0, 1.3, ORANGE),
    (21.9, 7.0, 4.6, 18.0, 1.6, GREEN),     # food plates
    (17.8, 9.5, 3.2, 13.0, 1.3, GREEN),
]


def icon(size, scale=0.74, rounded=False):
    """Draw the icon at `size` px. `scale` is the mark's width as a share of the tile."""
    big = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.225), fill=BG)
    else:
        d.rectangle([0, 0, big, big], fill=BG)
    unit = big * scale / 32
    off = (big - 32 * unit) / 2
    for x, y, w, h, r, colour in MARK:
        d.rounded_rectangle([off + x * unit, off + y * unit, off + (x + w) * unit, off + (y + h) * unit], radius=r * unit, fill=colour)
    return img.resize((size, size), Image.LANCZOS)


def svg():
    hexc = lambda c: "#%02x%02x%02x" % c[:3]
    scale = 0.74; unit = 100 * scale / 32; off = (100 - 32 * unit) / 2
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">', '<rect width="100" height="100" rx="22.5" fill="#111114"/>']
    for x, y, w, h, r, colour in MARK:
        parts.append(f'<rect x="{off + x * unit:.2f}" y="{off + y * unit:.2f}" width="{w * unit:.2f}" height="{h * unit:.2f}" rx="{r * unit:.2f}" fill="{hexc(colour)}"/>')
    parts.append("</svg>\n")
    return "".join(parts)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192).save(OUT / "icon-192.png")
    icon(512).save(OUT / "icon-512.png")
    icon(512, scale=0.6).save(OUT / "icon-512-maskable.png")
    icon(180).convert("RGB").save(OUT / "apple-touch-icon.png")
    icon(32, scale=0.86, rounded=True).save(OUT / "favicon-32.png")
    (OUT / "icon.svg").write_text(svg())
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
