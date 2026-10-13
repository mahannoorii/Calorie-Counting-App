"""Bundle Spotter into one self-contained HTML page for a claude.ai preview link.

The preview host wraps the page in its own <html>/<head>/<body>, so the output is page
content only: title, fonts, inlined CSS, the app containers and inlined scripts.

Run from the repo root:  python3 tools/build_preview.py [output-path]
Default output: dist/spotter-preview.html
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "spotter"


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "spotter-preview.html"
    index = (APP / "index.html").read_text()
    css = (APP / "css" / "app.css").read_text()
    scripts = re.findall(r'<script src="([^"]+)"></script>', index)
    js = "\n".join((APP / s).read_text() for s in scripts)
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', index).group(1)
    page = "\n".join([
        "<title>Spotter</title>",
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link rel="stylesheet" href="' + fonts + '">',
        "<style>\n" + css + "\n</style>",
        '<div id="app"></div>',
        '<canvas id="fx" aria-hidden="true"></canvas>',
        "<script>\n" + js.replace("</script>", "<\\/script>") + "\n</script>",
        "",
    ])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print(f"Wrote {out} ({len(page) // 1024} KB, {len(scripts)} scripts inlined)")


if __name__ == "__main__":
    main()
