from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
ANALYTICS = ROOT / "assets" / "analytics.js"
CONFIG = ROOT / "assets" / "analytics-config.js"
BUILD = ROOT / "scripts" / "build_pages.py"
DOC = ROOT / "docs" / "landing-open-source-integration.md"


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def main():
    errors = []
    index = INDEX.read_text(encoding="utf-8")
    analytics = ANALYTICS.read_text(encoding="utf-8") if ANALYTICS.exists() else ""
    config = CONFIG.read_text(encoding="utf-8") if CONFIG.exists() else ""
    build = BUILD.read_text(encoding="utf-8") if BUILD.exists() else ""
    doc = DOC.read_text(encoding="utf-8") if DOC.exists() else ""

    require(ANALYTICS.exists(), "assets/analytics.js missing", errors)
    require(CONFIG.exists(), "assets/analytics-config.js missing", errors)
    require(DOC.exists(), "open-source adoption contract missing", errors)

    # Existing static V3 remains the source of CTA semantics.
    require(index.count('data-track="try"') >= 3, "tracked Try CTA coverage too low", errors)
    require(index.count('data-track="premium"') >= 2, "tracked Premium CTA coverage too low", errors)

    # Explicit, low-noise event contract. No autocapture/session replay in this first adoption.
    for event in (
        "landing_view",
        "landing_cta_click",
        "landing_proof_click",
        "landing_language_change",
        "landing_theme_change",
    ):
        require(event in analytics, f"analytics event missing: {event}", errors)
    require("autocapture: false" in analytics, "PostHog autocapture must start disabled", errors)
    require("disable_session_recording: true" in analytics, "session replay must start disabled", errors)
    require('person_profiles: "identified_only"' in analytics, "identified-only person profiles guard missing", errors)
    require("TAAnalytics" in analytics and "setConsent" in analytics, "provider adapter/consent API missing", errors)
    require("navigator.doNotTrack" in analytics, "Do Not Track guard missing", errors)

    # Build-time config must be inert without a key and must never hardcode a real PostHog token.
    require('enabled: false' in config, "source analytics config must be disabled", errors)
    require('consentRequired: true' in config, "source analytics config must require consent", errors)
    require("phc_" not in config and "phc_" not in analytics and "phc_" not in build, "PostHog project token committed to source", errors)
    for variable in (
        "POSTHOG_KEY",
        "POSTHOG_HOST",
        "POSTHOG_CONSENT_REQUIRED",
        "POSTHOG_RESPECT_DNT",
        "CF_PAGES_BRANCH",
        "CF_PAGES_COMMIT_SHA",
    ):
        require(variable in build, f"build config missing environment variable: {variable}", errors)
    require("analytics-config.js" in build and "analytics.js" in build, "Pages build does not inject analytics adapter", errors)

    # Adoption boundary prevents framework churn / duplicate experimentation authority.
    for phrase in (
        "Do not migrate Landing V3 to Next.js, Astro, React or Tailwind",
        "GrowthBook: LATER / CONDITIONAL",
        "OpenTelemetry JS: ADOPT GRADUALLY",
        "nextjs/saas-starter: REFERENCE / COPY PATTERN",
        "AstroWind: REFERENCE / COPY PATTERN",
    ):
        require(phrase in doc, f"open-source adoption boundary missing: {phrase}", errors)

    if errors:
        print("Landing analytics/open-source check: FAIL")
        for error in errors:
            print(f"- {error}")
        sys.exit(1)

    print("Landing analytics/open-source check: PASS")
    print("- PostHog adapter is privacy-gated and disabled without build-time config")
    print("- CTA/proof/language/theme events are explicit; autocapture and replay are off")
    print("- SaaS Starter/AstroWind are selective pattern sources, not migration targets")
    print("- GrowthBook/shadcn/OpenTelemetry remain conditional or downstream")


if __name__ == "__main__":
    main()
