# Cursor Browser QA — TennisAgents Landing

Target preview: `https://feat-landing-openhands-chat.tennisagents-landing.pages.dev`

## Visual acceptance
- 390 px: one-column hierarchy; no horizontal overflow; AI/chat/graph/modes remain understandable.
- 768 px: tablet layout preserves ordering and readable card density.
- 1440 px: graph, engine contrast and proof sections use width without becoming sparse.
- 1920 px: max-width discipline prevents oversized text/cards.
- Explorer and Strategist are visually different but equally important.
- Quick / Detailed / Tracked are immediately distinguishable.
- Tracked gesture affordance is visible without implying unsupported automation.
- Real Match Proof reads as evidence/reconstruction, not marketing decoration.

## Browser acceptance
- No console errors during load, language switch, graph interaction or AI reset.
- Network shows no OpenAI/OpenHands/TA bridge secret in browser requests.
- IT/EN switch updates visible copy and document language.
- Keyboard focus reaches CTA, AI prompts, chat controls and interactive graph nodes.
- `prefers-reduced-motion` removes nonessential motion without hiding information.
- CRISP does not obscure native TennisAgents AI at mobile widths.

## Repository gates
`python scripts/check_landing.py`
`python scripts/check_system_story.py`
`python scripts/check_persistent_ai.py`
`python scripts/check_visual_review.py`
`python scripts/build_pages.py`
`git diff --check`

Capture screenshots for all four widths and summarize any remaining visual issue by section and severity.