from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


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
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def main():
    errors = []
    text = INDEX.read_text(encoding="utf-8")
    parser = LandingParser()
    parser.feed(text)
    title = "".join(parser.title_parts).strip()

    require(parser.lang == "it", "html lang must be it", errors)
    require(parser.h1 == 1, f"expected exactly one h1, found {parser.h1}", errors)
    require("TennisAgents" in title, "title must use TennisAgents brand", errors)
    require(bool(parser.meta.get("description")), "meta description missing", errors)
    require(parser.canonical == "https://www.tennisagents.app/", "canonical URL mismatch", errors)
    require(parser.meta.get("og:url") == "https://www.tennisagents.app/", "og:url mismatch", errors)
    require("Prova TennisAgents" in text, "primary CTA missing", errors)
    require("Scopri Premium" in text, "secondary CTA missing", errors)
    require(all(token in text for token in ("PROVEN", "BETA", "LAB")), "claim-state labels incomplete", errors)
    require("Tournament Copilot" in text and "String Health" in text, "approved Labs missing", errors)
    require("TENNIS AI COACH</span>" not in text, "legacy visible brand remains", errors)

    duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
    require(not duplicates, f"duplicate ids: {duplicates}", errors)
    ids = set(parser.ids)
    broken = sorted({href for href in parser.hrefs if href.startswith("#") and href[1:] not in ids})
    require(not broken, f"broken internal anchors: {broken}", errors)

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    require("Sitemap: https://www.tennisagents.app/sitemap.xml" in robots, "robots sitemap mismatch", errors)
    try:
        tree = ET.parse(ROOT / "sitemap.xml")
        locs = [node.text for node in tree.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        require("https://www.tennisagents.app/" in locs, "canonical URL absent from sitemap", errors)
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
    print("- metadata, CTA hierarchy, claim states, robots, sitemap and 404 verified")


if __name__ == "__main__":
    main()
