# Landing V3 — decision preservation contract

This file is the implementation-side coverage contract for Landing V3. Notion remains the canonical project decision source; this file makes the currently applicable Landing decisions testable in CI.

## Precedence rule

1. A newer explicit canonical decision may supersede an older one.
2. If no newer decision explicitly supersedes a previously accepted requirement, preserve it.
3. Historical conversations, Dropbox, Obsidian and repository history are evidence sources to reconcile, not automatic authority; unresolved items must be surfaced, not silently dropped.
4. A Landing implementation is incomplete when it represents only the latest task summary but omits still-valid requirements recorded in related canonical architecture, audit or accepted design sources.

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
Landing must preserve the partner-funded access concept for Brand, Retail, Club/Academy or other approved sponsor models without claiming live partners that do not exist. Sponsor/promo access must converge on the same Premium access model; sponsors never control recommendations.

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

### R-HERO-MENTORS — preserve the instantly understandable Player/team visual
The approved visual showing the Player seated at the changeover with the virtual tennis staff / mentors around them is a durable Landing asset and must remain visibly rendered, not merely stored in the repository.

Implementation evidence:
- `assets/hero-mentors.jpg`
- historical Landing brief explicitly said the image **DEVE restare visibile** / **NON rimuoverla**.
- V3 may reposition or improve the composition, but may not silently remove the visual without an explicit replacement decision.

### R-FLOW-ANIMATION — preserve the animated information-flow explanation
The animated workflow with moving dots is a durable explanation of how information travels through TennisAgents. V3 may adapt node names to the current Agent architecture, but must retain:
- a readable static flow;
- visible animated dots on modern browsers;
- a reduced-motion/static fallback;
- Player/input → analysis/evidence → tactical decision → Player loop.

Historical evidence: pre-V3 `main` commit `39ee66c92a5fd5b040ed561d801f4146ab8579a3` contained the scalable SVG animation and language-aware labels.

### R-I18N-IT-EN — visible Italian / English selector
The Landing must provide a visible IT/EN selector and visitor-facing copy must be available in both languages.

Requirements:
- Italian remains a first-class default/local experience.
- Switching language updates visible customer copy and `document.documentElement.lang`.
- Product/role names such as Scout, Analyst, Strategist, Match Coach, Quick/Detailed/Tracked, Premium and PROVEN/BETA/LAB may remain intentional product terminology.
- Do not leave accidental English planning/copy fragments in Italian mode.
- The language preference should persist locally when practical.

Historical evidence: pre-V3 `main` commit `39ee66c92a5fd5b040ed561d801f4146ab8579a3` contained the IT/EN switch.

### R-BRAND-IDENTITY — use the approved TennisAgents master identity
The visible Landing brand must use the approved TennisAgents identity derived from `TennisAgents_AI_MASTER_DEFINITIVO`, which explicitly supersedes earlier CAD/logo versions. The small UI derivative must preserve the locked sphere, tennis seam, data-flow and spark geometry while reducing network detail at small sizes. The legacy rectangular **T monogram is V1 and must not return**.

Requirements:
- `icons/icon.svg` must identify itself as a derivative of `TennisAgents_AI_MASTER_DEFINITIVO`;
- visible `TENNISAGENTS` wordmark remains paired with the approved icon treatment;
- favicon / touch / maskable raster derivatives must be regenerated from the same approved SVG derivative, not from the V1 monogram;
- brand evolution is allowed only by explicit design decision, never as an incidental refactor.

### R-CUSTOMER-COPY — public copy is for the visitor, not the project team
Public Landing copy must explain customer value, product use, availability and limitations in visitor language. Internal governance/development wording must not leak into the page.

Examples of disallowed public-copy patterns include:
- `niente promesse presentate come già disponibili`;
- `Il nome dell'Agent deve dire cosa fa`;
- `TennisAgents deve parlare anche a chi finanzia`;
- `Early Access a bassa frizione`;
- internal terms such as `contratto pubblico`, `source of truth`, `canonical entitlement authority`, or explanations of why an implementation metaphor is allowed.

Truthfulness remains mandatory, but it should be expressed for customers, e.g. simple PROVEN/BETA/LAB explanations and clear availability statements.


### R-MOBILE-HERO-ORDER — explain the product visually before long supporting copy
On narrow/mobile layouts the first-screen hierarchy is: **headline → approved Player/team hero visual → supporting explanation / CTA**. Desktop may keep text and visual side by side. The hero image is an above-the-fold product explanation, must be present in initial HTML, must not be lazy-loaded, and should receive high fetch priority when it is a likely LCP image.

The hero visual must not carry a caption that merely restates `Il tuo AI Tennis Team / In campo con te`.

### R-COPY-NO-REDUNDANCY — every section must earn its place
Landing copy must avoid repeating the same positioning idea in adjacent headline, image caption, paragraph, card or section. Each block should add a new customer-relevant fact, proof, use case, distinction or action. A full semantic de-duplication pass is required before production; automated checks cover known regressions but do not replace editorial review.

## Source trail
- Notion: `Landing V3 — market-ready build with truthful value, proof and CTA`.
- Notion: `Agent Architecture Cross-Conversation Audit — 2026-08-20`.
- Notion: `Decision Preservation Gate — cross-source implementation rule`.
- Dropbox archive: `ChatGPT-Test Plan CRISP+LANDING-20260820-2312.md`.
- Dropbox: canonical Landing V2 package, including Sponsored Premium and appearance/Crisp integration evidence.
- Dropbox: `BRIEF_landing_layout.md` — explicit keep-visible requirement for `assets/hero-mentors.jpg` and animated flow.
- GitHub pre-V3 `main`: `39ee66c92a5fd5b040ed561d801f4146ab8579a3` — animated scalable SVG + IT/EN switch.
- Notion: Access/Subscription lifecycle and non-card Premium entitlement work.

## Release rule
A green static quality check is necessary but not sufficient. Production still requires preview/mobile/visual QA, customer-copy review, CTA destination verification, Crisp/contact verification, legal/privacy readiness and analytics/indexability checks.
