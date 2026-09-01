from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

index = (ROOT / "index.html").read_text(encoding="utf-8")
analytics = (ROOT / "assets" / "analytics.js").read_text(encoding="utf-8")
hub = (ROOT / "assets" / "support-hub.js").read_text(encoding="utf-8")
config = (ROOT / "assets" / "support-config.js").read_text(encoding="utf-8")
css = (ROOT / "assets" / "support-hub.css").read_text(encoding="utf-8")

# Preserve the already-configured CRISP workspace and hosted client.
assert 'window.CRISP_WEBSITE_ID="0ca6e6f8-08c0-4a56-9113-80bcbea23457"' in index
assert 'https://client.crisp.chat/l.js' in index

# One customer-visible support entry: custom hub controls the same CRISP chat.
assert 'id="ta-support-launcher"' not in index  # injected dynamically, no duplicate static launcher
assert 'chat:hide' in hub
assert 'chat:show' in hub
assert 'chat:open' in hub
assert 'support_provider:"crisp-free"' in hub
assert 'provider: "crisp-free"' in config

# Anthropic-like support home capabilities without a second messaging backend.
for required in (
    'data-support-tab="home"',
    'data-support-tab="messages"',
    'data-support-tab="help"',
    'ta-support-recent-copy',
    'ta-support-status-copy',
    'ta-support-search',
    'localFaqs()',
    'knowledgeSearchUrl',
    'statusUrl',
    'message:received',
    'message:sent',
):
    assert required in hub or required in config

# Support must load even when PostHog is disabled/consent is absent, but only on
# the Landing rather than proof/demo pages.
assert '/assets/support-config.js' in analytics
assert '/assets/support-hub.js' in analytics
assert 'window.location.pathname.startsWith("/demo/")' in analytics

# Mobile/a11y/fail-closed behavior.
assert '@media(max-width:600px)' in css
assert 'aria-haspopup' in hub
assert 'aria-hidden' in hub
assert 'Escape' in hub
assert 'if(!cfg.knowledgeSearchUrl || !query) return []' in hub
assert 'if(cfg.statusUrl)' in hub

# Public config may mention security in comments, but it must not define common
# credential-bearing keys or authorization headers.
credential_patterns = (
    r'\b(api[_-]?key|token|secret|password|authorization)\s*:',
    r'\b(api[_-]?key|token|secret|password)\s*=',
    r'\bbearer\s+[A-Za-z0-9._~-]{8,}',
)
for pattern in credential_patterns:
    assert re.search(pattern, config, flags=re.IGNORECASE) is None

print('Support Hub contract: PASS')
