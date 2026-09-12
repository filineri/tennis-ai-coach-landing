from pathlib import Path

root=Path(__file__).resolve().parents[1]
workflow=(root/'.github/workflows/landing-visual-review.yml').read_text(encoding='utf-8')
config=(root/'visual-review/backstop.config.cjs').read_text(encoding='utf-8')

required_workflow=[
    'workflow_dispatch:',
    'current_url:',
    'candidate_url:',
    'backstopjs@6.3.25',
    'playwright install --with-deps chromium',
    'actions/upload-artifact@v4',
    "'production_authorized':False",
    "'authority':'REVIEW_EVIDENCE_ONLY'",
]
for marker in required_workflow:
    assert marker in workflow, f'missing visual-review workflow marker: {marker}'

required_config=[
    "engine:'playwright'",
    "browser:'chromium'",
    "referenceUrl:CURRENT",
    "url:CANDIDATE",
    "label:'mobile'",
    "label:'tablet'",
    "label:'desktop'",
    "label:'wide'",
]
for marker in required_config:
    assert marker in config, f'missing BackstopJS marker: {marker}'

for forbidden in ['wrangler pages deploy','cloudflare pages deploy','git push origin main','merge_pull_request']:
    assert forbidden not in workflow.lower(), f'visual review must never publish automatically: {forbidden}'

print('Landing visual review contract OK')
