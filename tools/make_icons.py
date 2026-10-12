"""Generate Spotter's app icons (a white bumper plate on plate blue).

Run from the repo root:  python3 tools/make_icons.py
Needs Pillow (pip install pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw

BLUE = (36, 72, 245, 255)
WHITE = (255, 255, 255, 255)
SOFT = (225, 231, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "spotter" / "icons"


def plate(size, scale=1.0, rounded=False):
    """Draw the mark at `size` px. `scale` shrinks the plate for maskable safe zones."""
    big = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=BLUE)
    else:
        d.rectangle([0, 0, big, big], fill=BLUE)
    c = big / 2

    def circle(r, **kw):
        d.ellipse([c - r, c - r, c + r, c + r], **kw)

    s = big * scale
    circle(s * 0.37, fill=WHITE)
    circle(s * 0.285, outline=BLUE, width=max(2, int(s * 0.018)))
    circle(s * 0.13, fill=SOFT)
    circle(s * 0.055, fill=BLUE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plate(192).save(OUT / "icon-192.png")
    plate(512).save(OUT / "icon-512.png")
    plate(512, scale=0.78).save(OUT / "icon-512-maskable.png")
    plate(180).convert("RGB").save(OUT / "apple-touch-icon.png")
    plate(32, rounded=True).save(OUT / "favicon-32.png")
    (OUT / "icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        '<rect width="100" height="100" rx="22" fill="#2448f5"/>'
        '<circle cx="50" cy="50" r="37" fill="#fff"/>'
        '<circle cx="50" cy="50" r="28.5" fill="none" stroke="#2448f5" stroke-width="1.8"/>'
        '<circle cx="50" cy="50" r="13" fill="#e1e7ff"/>'
        '<circle cx="50" cy="50" r="5.5" fill="#2448f5"/>'
        "</svg>\n"
    )
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
