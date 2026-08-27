# Landing V3 — selective open-source adoption

Notion remains canonical. This file records the implementation-side adoption boundary for the Landing open-source accelerator workstream.

## Foundation that does not change

Keep the current foundation:

`Cloudflare Pages → static Landing V3 → truthful PROVEN/BETA/LAB → proof routes → CTA → Firebase/Auth/Billing`

Do not migrate Landing V3 to Next.js, Astro, React or Tailwind merely to consume a starter/template. Existing decision-preservation and quality gates remain authoritative.

## Priority 1 — PostHog: ADOPT SOON / API INTEGRATION

Use PostHog for Landing product/web analytics and, if later approved, feature flags/experiments. The current Landing integration is intentionally provider-isolated behind `window.TAAnalytics`.

Implementation contract:
- source remains static and dependency-free;
- `scripts/build_pages.py` creates `assets/analytics-config.js` from Cloudflare build environment values;
- no project token is committed to source;
- analytics is disabled when no `POSTHOG_KEY` exists;
- consent is required by default (`POSTHOG_CONSENT_REQUIRED=true` unless explicitly changed after legal/privacy review);
- Do Not Track is respected by default;
- autocapture and session replay are disabled initially;
- only explicit low-noise events are captured: `landing_view`, `landing_cta_click`, `landing_proof_click`, `landing_language_change`, `landing_theme_change`;
- identification is opt-in through `TAAnalytics.identify(stableUserId, properties)` and must use an auth-system stable ID, not email/display name when a stable ID exists;
- `TAAnalytics.reset()` is available for the future logout/account path.

The Landing half of the funnel can now measure visits and outbound CTA intent once configured. Full `Landing → signup → App/Premium` attribution still requires the application side to use the same analytics authority and an explicitly approved cross-domain/cross-app identity strategy; do not fake this with a shared literal ID.

Cloudflare Pages build variables:
- `POSTHOG_KEY` — project token; empty means disabled;
- `POSTHOG_HOST` — defaults to `https://eu.i.posthog.com` and can be overridden to match the actual PostHog project region;
- `POSTHOG_CONSENT_REQUIRED` — defaults to true;
- `POSTHOG_RESPECT_DNT` — defaults to true;
- `CF_PAGES_BRANCH` / `CF_PAGES_COMMIT_SHA` — used only as environment/release event properties when Cloudflare supplies them.

## Priority 2 — nextjs/saas-starter: REFERENCE / COPY PATTERN

Do not import its framework stack. Reuse only patterns that fit existing TennisAgents authority:
- marketing CTA clearly separated from authenticated/account UX;
- pricing/access presentation leads into the existing Stripe Checkout authority, not a second billing path;
- subscription-management CTA should resolve to the existing Customer Portal path when that path is production-ready;
- account/auth state and payment state remain separate concerns;
- meaningful commercial/account actions should have explicit activity/analytics events.

No public CTA/account destination is changed by this adoption step because the current Landing task still requires the real account/access path to be verified before production.

## Priority 3 — openstarterkit/nextjs-saas-starter-kit: REFERENCE / LATER

Use only as a second comparison source when the current SaaS Starter pattern is insufficient. Do not run two starter-derived authorities or copy parallel billing/admin stacks.

## Priority 4 — AstroWind: REFERENCE / COPY PATTERN

Use it as a static-site benchmark, not a migration target. The current Landing already has the relevant foundation: deterministic `dist/`, canonical/meta/OG, robots, sitemap, proof routes and above-the-fold hero priority. Future extraction should focus on measurable performance/SEO gaps only.

## Priority 5 — GrowthBook: LATER / CONDITIONAL

Deferred while PostHog is the selected analytics/experiment authority candidate. Reconsider only if a concrete PostHog experiment/flag gap is proven. Do not duplicate feature-flag or experiment authority.

## Priority 6 — shadcn/ui: LATER / CONDITIONAL

Reference visual/component patterns only. Do not introduce React/Tailwind solely to consume shadcn components.

## Priority 7 — OpenTelemetry JS: ADOPT GRADUALLY, NOT IN THIS STATIC STEP

Reserve OpenTelemetry for the operational path behind the CTA (`Auth → Access/Billing/API`) where traces/latency/errors add value. Do not treat it as a replacement for product analytics. Browser instrumentation remains a separate engineering decision; add it only when there is a concrete trace boundary and collector/export destination.

## Release rule

This integration does not remove existing release blockers. Production still requires current Crisp/support work, visual/mobile QA, real CTA/account destination, legal/privacy readiness, analytics activation/configuration, and indexability/SEO checks. `main` and the production custom domain remain unchanged until those gates pass.
