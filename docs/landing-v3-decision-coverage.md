# Landing V3 — decision preservation contract

This file is the implementation-side coverage contract for Landing V3. Notion remains the canonical project decision source; this file makes the currently applicable Landing decisions testable in CI.

## Precedence rule

1. A newer explicit canonical decision may supersede an older one.
2. If no newer decision explicitly supersedes a previously accepted requirement, preserve it.
3. Historical conversations/Dropbox are evidence sources to reconcile, not automatic authority; unresolved items must be surfaced, not silently dropped.
4. A Landing implementation is incomplete when it represents only the latest task summary but omits still-valid requirements recorded in related canonical architecture/audit sources.

## Required coverage

### R-AGENT-TEAM — visible virtual tennis team
The Landing must make TennisAgents feel like a virtual tennis staff, not a feature list. Public roles must have distinct responsibilities and truthful maturity state.

Working public staff:
- Match Team: Scout, Observer, Analyst, Strategist, Match Coach.
- Performance Staff: Trainer, Mental.
- Evidence/Tactical/Challenger may remain capabilities/internal reasoning rather than peer public personas.
- Backstage/company agents (Support, Radar, Tester/USE_TA, Media/Publisher, Product Improvement actors) are not part of the Player's visible tennis staff.

### R-AGENT-CONTRACT — input → unique job → output/handoff
Every public Agent card must show:
- what it receives;
- its one distinct job;
- what it produces / who receives the handoff.

### R-DEMO-HANDOFF — real end-to-end usage
The visual usage demo must show both sides of the loop:
- what Player/Coach/Parent actually enter or record (opponent context, observations, Quick/Detailed/Tracked match data, feedback);
- how Agents process and hand off the work;
- evidence/confidence before advice;
- the advice returning to the Player;
- subsequent data/feedback being measured;
- post-match Analyst → Trainer/Mental continuation.

The demo must read as one case, not independent screenshots or generic feature cards.

### R-PAYER-PARENT — Player is not always the payer
Landing must speak to a Parent/Guardian who may fund TennisAgents for the Player. Youth/privacy/guardian policies remain authoritative and are not relaxed by payment.

### R-PAYER-SPONSOR — Sponsored Premium / partner-funded access
Landing must preserve the partner-funded access concept for Brand, Retail, Club/Academy or other approved sponsor models without claiming live partners that do not exist. Sponsor/promo access must converge on the same canonical Premium entitlement authority; sponsors never control recommendations.

### R-SPONSOR-AGENTS — Gear/Fuel strategic sponsor surfaces
Gear and Fuel are strategic future specialist-agent directions for equipment/stringing and hydration/nutrition/recovery sponsor categories. Until their runtime contracts are real, present them as future/Lab direction only.

### R-VISUAL-PERSONALITY — appearance control
Landing preserves the visual-personality/theme switching capability. The appearance control must not overlap with Crisp. Place it in a separate screen corner/region and cover the separation in code review/QA.

### R-CLAIM-STATE — truthful maturity
Use explicit PROVEN / BETA / LAB (or a newer explicitly approved equivalent). Do not promote future agent names, partner programs, customer outcomes or prices to current capability without evidence.

### R-CTA — low-friction conversion
Primary CTA: `Prova TennisAgents`.
Secondary CTA: `Scopri Premium`.
WEB/PWA-first. Actual account/access/checkout path must be verified before production release.

## Source trail
- Notion: `Landing V3 — market-ready build with truthful value, proof and CTA`.
- Notion: `Agent Architecture Cross-Conversation Audit — 2026-08-20`.
- Dropbox archive: `ChatGPT-Test Plan CRISP+LANDING-20260820-2312.md`.
- Notion: Access/Subscription lifecycle and non-card Premium entitlement work.
- Dropbox: canonical Landing V2 package, including Sponsored Premium and appearance/Crisp integration evidence.

## Release rule
A green static quality check is necessary but not sufficient. Production still requires preview/mobile/visual QA, CTA destination verification, Crisp/contact verification, legal/privacy readiness and analytics/indexability checks.