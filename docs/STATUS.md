# Status

Revision 1.2.0 published and verified, 2026-10-16.
Live: https://kuzeyozturac.github.io/grandstrategyweb/

Latest request: deeper laws and diplomacy inspired by the linked Victoria3 wiki law/diplomatic-play pages and TNO law taxonomy. Read LAWS_DIPLOMACY.md for source provenance, exact formulas, new commands, migration and explicit scope boundaries.

- 48 mutually exclusive choices in 16 policy areas; three policy categories and a compact selector.
- Material effects, political endorsement/opposition, three-stage seeded legislation, debate/setback outcomes, legitimacy pauses and failure/cancellation cooldowns.
- Seven diplomatic goals, two-sided coalitions/counter-demands, secondary war aims, maneuver budgets, primary concessions and ongoing treaties.
- War settlement leverage, enforce/concede, negotiated ceasefire and coalition truces; resistant AI defenders bargain using shared commands.
- Save v1 fills missing policy groups, preserving prior enacted reforms and current debate.
- Country-first atlas/highlights, national economy and strategic fronts from1.1 retained.

Local final verification passed: 42 model tests, 11 browser journeys, typecheck, production build; screenshots inspected. Gameplay commit: 81c84500cbcfadb03fad8fd90e165cf12207816f. GitHub Actions run 38939825717 passed verification and deployment. Served main JavaScript matches local production build by SHA-256. All 11 hosted browser journeys passed in 2.1 minutes. No outstanding release blocker.

---

# Status

Country-first revision 1.1.0 published and verified, 2026-10-16.
Live: https://kuzeyozturac.github.io/grandstrategyweb/
Game source: eb7446542a45d43d76c12366c299566b66edb03f. GitHub Actions run 38936018202 passed verification and deployment.

Read REDESIGN.md and VICTORIA3_RESEARCH.md before the original scope. The user's latest instruction supersedes HOI4-style army interactions.

- Province/army bounding-box focus removed; SVG keyboard focus follows shape strokes.
- Country clicks open dossiers and diplomatic actions immediately.
- National construction/production, four-good market and real-surplus trade, household living conditions, interest groups/government, reforms, institutions, research and decisions are connected.
- Warfare uses commander-managed deployments and advance/defend/standby stances; manual army orders are not exposed in UI.
- New decisions and incoming proposals pause the worker. AI cannot accept on behalf of a human recipient.
- Earlier saves migrate; map IDs unchanged.

Verification: 33 model tests passed, including six 400-day campaigns; nine browser scenarios passed locally (eight main journeys plus new-decision autopause). Typecheck and build passed. Screenshots inspected for country highlight/dossier, market, politics, construction, fronts and compact layout.

Hosted verification: all nine browser scenarios passed against the live site in 1.4 minutes. Served JavaScript matches the verified release by SHA-256. No outstanding release blocker. Next changes should follow player feedback and the implemented/deferred research matrix.
