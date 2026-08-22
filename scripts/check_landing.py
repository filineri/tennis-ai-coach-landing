from html.parser import HTMLParser
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CANONICAL_ROOT = "https://tennisagents.app/"
DEMO_ROUTES = {
    "demo/live-match/index.html": "https://tennisagents.app/demo/live-match/",
    "demo/tracking/index.html": "https://tennisagents.app/demo/tracking/",
    "demo/player/index.html": "https://tennisagents.app/demo/player/",
}


class LandingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.hrefs = []
        self.h1 = 0
        self.lang = None
        self.title_parts = []
        self.in_title = False
        self.meta = {}
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.in_title = True
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.hrefs.append(attrs["href"])
        if tag == "meta":
            key = attrs.get("name") or attrs.get("property")
            if key:
                self.meta[key] = attrs.get("content", "")
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonical = attrs.get("href")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)


def parse(path):
    parser = LandingParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def main():
    errors = []
    text = INDEX.read_text(encoding="utf-8")
    parser = parse(INDEX)
    title = "".join(parser.title_parts).strip()

    require(parser.lang == "it", "html lang must be it", errors)
    require(parser.h1 == 1, f"expected exactly one h1, found {parser.h1}", errors)
    require("TennisAgents" in title, "title must use TennisAgents brand", errors)
    require(bool(parser.meta.get("description")), "meta description missing", errors)
    require(parser.canonical == CANONICAL_ROOT, "canonical URL mismatch", errors)
    require(parser.meta.get("og:url") == CANONICAL_ROOT, "og:url mismatch", errors)
    require("Prova TennisAgents" in text, "primary CTA missing", errors)
    require("Scopri Premium" in text, "secondary CTA missing", errors)
    require(all(token in text for token in ("PROVEN", "BETA", "LAB")), "claim-state labels incomplete", errors)
    require("Tournament Copilot" in text and "String Health" in text, "approved Labs missing", errors)
    require("Coach Conversation" in text and "Tennis Passport" in text, "approved lifecycle Labs missing", errors)
    require("TA Feed" in text, "TA Feed section missing", errors)
    require("TENNIS AI COACH</span>" not in text, "legacy visible brand remains", errors)
    require("client.crisp.chat/l.js" in text and "CRISP_WEBSITE_ID" in text, "Crisp support channel missing", errors)

    duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
    require(not duplicates, f"duplicate ids: {duplicates}", errors)
    ids = set(parser.ids)
    broken = sorted({href for href in parser.hrefs if href.startswith("#") and href[1:] not in ids})
    require(not broken, f"broken internal anchors: {broken}", errors)

    for relative, expected_canonical in DEMO_ROUTES.items():
        path = ROOT / relative
        require(path.exists(), f"proof route missing: {relative}", errors)
        if path.exists():
            demo_parser = parse(path)
            require(demo_parser.h1 == 1, f"{relative}: expected one h1", errors)
            require(demo_parser.canonical == expected_canonical, f"{relative}: canonical mismatch", errors)
    require("/demo/live-match/" in parser.hrefs, "home must link full-cycle proof", errors)
    require("/demo/tracking/" in parser.hrefs, "home must link tracking proof", errors)
    require("/demo/player/" in parser.hrefs, "home must link post-match proof", errors)

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    require("Sitemap: https://tennisagents.app/sitemap.xml" in robots, "robots sitemap mismatch", errors)
    try:
        tree = ET.parse(ROOT / "sitemap.xml")
        locs = [node.text for node in tree.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        require(CANONICAL_ROOT in locs, "canonical URL absent from sitemap", errors)
        for route in DEMO_ROUTES.values():
            require(route in locs, f"sitemap missing proof route: {route}", errors)
    except ET.ParseError as exc:
        errors.append(f"invalid sitemap.xml: {exc}")

    require((ROOT / "404.html").exists(), "404.html missing", errors)

    if errors:
        print("Landing V3 quality check: FAIL")
        for error in errors:
            print(f"- {error}")
        sys.exit(1)

    print("Landing V3 quality check: PASS")
    print(f"- title: {title}")
    print(f"- ids: {len(ids)}; internal links: {sum(h.startswith('#') for h in parser.hrefs)}")
    print("- metadata, CTA hierarchy, claim states, Crisp, proof routes, robots, sitemap and 404 verified")


if __name__ == "__main__":
    main()
