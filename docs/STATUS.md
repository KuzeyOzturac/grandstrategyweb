# Status

Country-first revision 1.1.0, 2026-10-16. Local checks complete; publishing pending.

Read REDESIGN.md and VICTORIA3_RESEARCH.md before the original scope. The user's latest instruction supersedes HOI4-style army interactions.

- Province/army bounding-box focus removed; SVG keyboard focus follows shape strokes.
- Country clicks open dossiers and diplomatic actions immediately.
- National construction/production, four-good market and real-surplus trade, household living conditions, interest groups/government, reforms, institutions, research and decisions are connected.
- Warfare uses commander-managed deployments and advance/defend/standby stances; manual army orders are not exposed in UI.
- New decisions and incoming proposals pause the worker. AI cannot accept on behalf of a human recipient.
- Earlier saves migrate; map IDs unchanged.

Verification: 33 model tests passed, including six 400-day campaigns; nine browser scenarios passed locally (eight main journeys plus new-decision autopause). Typecheck and build passed. Screenshots inspected for country highlight/dossier, market, politics, construction, fronts and compact layout.

Next: publish to main, wait for CI/Pages, run the revised hosted browser suite and update release evidence. Current live URL: https://kuzeyozturac.github.io/grandstrategyweb/ (previous build until publication).
