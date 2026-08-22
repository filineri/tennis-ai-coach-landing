from html.parser import HTMLParser
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CONTRACT = ROOT / "docs" / "landing-v3-decision-coverage.md"
CANONICAL_ROOT = "https://tennisagents.app/"
DEMO_ROUTES = {
    "demo/live-match/index.html": "https://tennisagents.app/demo/live-match/",
    "demo/tracking/index.html": "https://tennisagents.app/demo/tracking/",
    "demo/player/index.html": "https://tennisagents.app/demo/player/",
}
PUBLIC_AGENTS = ("Scout", "Observer", "Analyst", "Strategist", "Match Coach", "Trainer", "Mental")
REQUIREMENT_IDS = (
    "R-AGENT-TEAM",
    "R-AGENT-CONTRACT",
    "R-DEMO-HANDOFF",
    "R-PAYER-PARENT",
    "R-PAYER-SPONSOR",
    "R-SPONSOR-AGENTS",
    "R-VISUAL-PERSONALITY",
    "R-CLAIM-STATE",
    "R-CTA",
    "R-HERO-MENTORS",
    "R-FLOW-ANIMATION",
    "R-I18N-IT-EN",
    "R-BRAND-IDENTITY",
    "R-CUSTOMER-COPY",
)
BANNED_INTERNAL_COPY = (
    "niente promesse presentate come già disponibili",
    "il nome dell'agent deve dire cosa fa",
    "tennisagents deve parlare anche a chi finanzia",
    "early access a bassa frizione",
    "contratto pubblico",
    "impediscono alla metafora",
    "canonical entitlement authority",
    "source of truth",
)

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
        self.data_agents = []
        self.requirements = []
        self.i18n_nodes = 0

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
        if "data-agent" in attrs:
            self.data_agents.append(attrs["data-agent"])
        if "data-requirement" in attrs:
            self.requirements.extend(attrs["data-requirement"].split())
        if "data-it" in attrs and "data-en" in attrs:
            self.i18n_nodes += 1
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
    lower = text.lower()
    parser = parse(INDEX)
    title = "".join(parser.title_parts).strip()

    # Baseline / SEO / CTA
    require(parser.lang == "it", "html default lang must be it", errors)
    require(parser.h1 == 1, f"expected exactly one h1, found {parser.h1}", errors)
    require("TennisAgents" in title, "title must use TennisAgents brand", errors)
    require(bool(parser.meta.get("description")), "meta description missing", errors)
    require(parser.canonical == CANONICAL_ROOT, "canonical URL mismatch", errors)
    require(parser.meta.get("og:url") == CANONICAL_ROOT, "og:url mismatch", errors)
    require("Prova TennisAgents" in text, "primary CTA missing", errors)
    require("Scopri Premium" in text, "secondary CTA missing", errors)
    require(all(token in text for token in ("PROVEN", "BETA", "LAB")), "claim-state labels incomplete", errors)
    require("TENNIS AI COACH</span>" not in text, "legacy visible brand remains", errors)

    # Decision-preservation contract + HTML evidence markers
    require(CONTRACT.exists(), "decision coverage contract missing", errors)
    contract_text = CONTRACT.read_text(encoding="utf-8") if CONTRACT.exists() else ""
    for requirement_id in REQUIREMENT_IDS:
        require(requirement_id in contract_text, f"coverage contract missing {requirement_id}", errors)
        require(requirement_id in parser.requirements, f"HTML coverage marker missing: {requirement_id}", errors)

    # V2 visual identity and hero evidence must survive V3.
    mentors = ROOT / "assets" / "hero-mentors.jpg"
    require(mentors.exists() and mentors.stat().st_size > 0, "hero mentors asset missing", errors)
    require('src="assets/hero-mentors.jpg"' in text, "hero mentors image is not rendered", errors)
    require('/icons/icon.svg' in text, "V2 TennisAgents icon missing from visible brand", errors)
    require('<span class="brand-word">TENNISAGENTS</span>' in text, "TENNISAGENTS V2-style wordmark missing", errors)

    # Animated flow retained from pre-V3 landing.
    require(text.count("<animateMotion") >= 5, "animated flow must retain moving dots", errors)
    require('id="flow"' in text and 'class="flow-dot"' in text, "animated flow structure missing", errors)

    # IT/EN is a durable customer feature, not optional presentation polish.
    require('id="lang-switch"' in text, "IT/EN selector missing", errors)
    require("function setLang" in text or "window.setLang=function" in text, "language switching logic missing", errors)
    require("ta-lang" in text and "document.documentElement.lang=lang" in text, "language preference/document lang update missing", errors)
    require(parser.i18n_nodes >= 80, f"bilingual coverage too low: {parser.i18n_nodes} translated nodes", errors)

    # Customer-facing copy: governance notes must not leak into the public page.
    for phrase in BANNED_INTERNAL_COPY:
        require(phrase not in lower, f"internal/project copy leaked into public Landing: {phrase}", errors)

    # Agentic public team: distinct roles + visible contracts
    for agent in PUBLIC_AGENTS:
        require(agent in parser.data_agents, f"public Agent card missing: {agent}", errors)
    require(text.count('data-it="Riceve"') >= 7, "each public Agent must show input/Riceve", errors)
    require(text.count('data-it="Fa"') >= 7, "each public Agent must show unique job/Fa", errors)
    require(text.count('data-it="Passa a"') >= 7, "each public Agent must show output/handoff/Passa a", errors)

    # End-to-end human + agent handoff
    for token in ("Player / Coach", "Quick, Detailed o Tracked", "Observer", "Analyst", "confidence", "Strategist", "Match Coach", "Trainer / Mental"):
        require(token in text, f"end-to-end usage demo missing token: {token}", errors)
    require("DEEP MIDDLE → WAIT → ATTACK THE SHORT BH" in text, "illustrative advice handoff missing", errors)

    # Lifecycle Labs retained
    require("Tournament Copilot" in text and "String Health" in text, "approved Labs missing", errors)
    require("Coach Conversation" in text and "Tennis Passport" in text, "approved lifecycle Labs missing", errors)
    require("TA Feed" in text, "TA Feed section missing", errors)

    # Payer/sponsor coverage + sponsor-agent direction
    for token in ("PARENT / GUARDIAN", "SPONSORED PREMIUM", "Brand, Retail, Club, Academy", "Gear Agent · LAB", "Fuel Agent · LAB", "partners@tennisagents.app"):
        require(token in text, f"payer/sponsor coverage missing token: {token}", errors)
    require("nessuno sponsor controlla" in lower, "sponsor independence guardrail missing", errors)

    # Appearance control deliberately away from bottom-right Crisp area
    require('id="style-dock"' in text, "visual personality control missing", errors)
    require('data-theme-choice="default"' in text and 'data-theme-choice="prism"' in text and 'data-theme-choice="centre"' in text and 'data-theme-choice="clay"' in text, "visual personalities incomplete", errors)
    require("#style-dock{position:fixed;left:" in text, "appearance control must be anchored on the left, separate from Crisp", errors)
    require("client.crisp.chat/l.js" in text and "CRISP_WEBSITE_ID" in text, "Crisp support channel missing", errors)

    duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
    require(not duplicates, f"duplicate ids: {duplicates}", errors)
    ids = set(parser.ids)
    broken = sorted({href for href in parser.hrefs if href.startswith("#") and href[1:] not in ids})
    require(not broken, f"broken internal anchors: {broken}", errors)

    # Proof routes
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
    print(f"- public agents: {', '.join(parser.data_agents)}")
    print(f"- bilingual nodes: {parser.i18n_nodes}")
    print("- V2 hero visual, animated flow, IT/EN and brand identity preserved")
    print("- customer-copy leak guard PASS")
    print("- agent contracts, human/agent handoff, Parent/Sponsor, visual personality/Crisp separation verified")
    print("- metadata, CTA hierarchy, claim states, proof routes, robots, sitemap and 404 verified")

if __name__ == "__main__":
    main()
