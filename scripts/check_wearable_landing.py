from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FRAGMENT = ROOT / "fragments" / "wearable-beta.html"
DEMO = ROOT / "demo" / "live-match" / "index.html"
BUILD = ROOT / "scripts" / "build_pages.py"
DIST_INDEX = ROOT / "dist" / "index.html"
DIST_DEMO = ROOT / "dist" / "demo" / "live-match" / "index.html"

REQUIRED = (
    'id="wearable-beta"',
    'data-requirement="R-WEARABLE-BETA"',
    'BETA · Smartwatch',
    'Il prossimo consiglio, al polso.',
    'Your next cue, right on your wrist.',
    'nessun tap',
    'no taps',
    'Device validation in progress',
    'coaching elettronico',
    'electronic coaching',
    'Player Analysis Technology',
    '/demo/live-match/#smartwatch',
)

DEMO_REQUIRED = (
    'id="smartwatch"',
    'BETA · Smartwatch',
    'id="watch-face"',
    'id="coaching-allowed"',
    'id="coaching-prohibited"',
    'SERVI ESTERNO',
    'DELIVERY OFF',
    'NESSUN CUE INVIATO',
    'GLANCE ONLY',
    'Player Analysis Technology',
    "setCompliance(isAllowed)",
)

FORBIDDEN = (
    "funziona in ogni match",
    "works in every match",
    "non farsi notare",
    "avoid detection",
    "bypass tournament",
)


class IdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def check_forbidden(text, where, errors):
    lower = text.lower()
    for phrase in FORBIDDEN:
        require(phrase not in lower, f"forbidden wearable claim in {where}: {phrase}", errors)


def main():
    errors = []
    require(FRAGMENT.exists(), "wearable fragment missing", errors)
    require(DEMO.exists(), "live-match demo missing", errors)

    if FRAGMENT.exists():
        text = FRAGMENT.read_text(encoding="utf-8")
        for token in REQUIRED:
            require(token in text, f"wearable fragment missing token: {token}", errors)
        check_forbidden(text, "fragment", errors)
        require(text.count('class="status beta"') >= 3, "wearable module must stay visibly BETA", errors)
        require(text.count("data-it=") >= 10 and text.count("data-en=") >= 10, "wearable module bilingual coverage too low", errors)

    if DEMO.exists():
        demo = DEMO.read_text(encoding="utf-8")
        for token in DEMO_REQUIRED:
            require(token in demo, f"live-match smartwatch demo missing token: {token}", errors)
        check_forbidden(demo, "live-match demo", errors)
        demo_parser = IdParser()
        demo_parser.feed(demo)
        require(demo_parser.ids.count("smartwatch") == 1, "live-match demo must contain one smartwatch step", errors)
        require(demo_parser.ids.count("coaching-allowed") == 1, "allowed compliance control must be unique", errors)
        require(demo_parser.ids.count("coaching-prohibited") == 1, "prohibited compliance control must be unique", errors)
        require("addEventListener('click',()=>setCompliance(true))" in demo, "allowed demo control is not wired", errors)
        require("addEventListener('click',()=>setCompliance(false))" in demo, "prohibited demo control is not wired", errors)

    if errors:
        print("Wearable Landing gate: FAIL")
        for error in errors:
            print("-", error)
        sys.exit(1)

    subprocess.run([sys.executable, str(BUILD)], cwd=ROOT, check=True)
    built = DIST_INDEX.read_text(encoding="utf-8")
    built_demo = DIST_DEMO.read_text(encoding="utf-8")
    parser = IdParser()
    parser.feed(built)

    require(parser.ids.count("wearable-beta") == 1, "built Landing must contain wearable-beta exactly once", errors)
    require(built.find('id="wearable-beta"') < built.find('id="flow"'), "wearable module must appear before the data-flow section", errors)
    require("Device validation in progress" in built, "built Landing lost device-validation qualifier", errors)
    require("Player Analysis Technology" in built, "built Landing lost regulatory footnote", errors)
    require('/demo/live-match/#smartwatch' in built, "built Landing lost smartwatch demo deep-link", errors)
    require('id="smartwatch"' in built_demo, "deploy bundle lost smartwatch demo step", errors)
    require("DELIVERY OFF" in built_demo and "NESSUN CUE INVIATO" in built_demo, "deploy bundle lost prohibited-state demo", errors)

    if errors:
        print("Wearable Landing gate: FAIL")
        for error in errors:
            print("-", error)
        sys.exit(1)

    print("Wearable Landing gate: PASS")
    print("- BETA smartwatch module injected exactly once")
    print("- Landing deep-link to live-match smartwatch demo retained")
    print("- interactive allowed/prohibited compliance demo retained")
    print("- IT/EN glance-only copy retained")
    print("- regulatory hard-off wording retained")
    print("- device-validation qualifier retained")


if __name__ == "__main__":
    main()
