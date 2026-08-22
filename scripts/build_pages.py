from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

FILES = ("index.html", "404.html", "robots.txt", "sitemap.xml")
DIRS = ("assets", "icons", "demo")

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir()

for name in FILES:
    src = ROOT / name
    if not src.exists():
        raise SystemExit(f"missing deploy file: {name}")
    shutil.copy2(src, DIST / name)

for name in DIRS:
    src = ROOT / name
    if not src.exists():
        raise SystemExit(f"missing deploy directory: {name}")
    shutil.copytree(src, DIST / name)

print("Cloudflare Pages bundle ready:", DIST)
for path in sorted(DIST.rglob("*")):
    if path.is_file():
        print("-", path.relative_to(DIST))
