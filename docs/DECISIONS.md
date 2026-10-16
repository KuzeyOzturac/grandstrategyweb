# Decisions

2026-10-16: User accepted a regional campaign on a global map, 2012-01-01 start, Syrian focus, playable TUR/IRN/SYR, approximate balanced data, AI aggregate opposition, crisis diplomacy, army objective orders, economic constraints, uncertainty, rule parity, domestic/civilian effects, defeat/observer mode, static desktop delivery, automated verification, and GitHub Pages deployment.
Syria focus supersedes earlier Gulf-first and Balkan proposals. Gulf maritime economics supports the campaign, without an equally detailed second theatre. Historical events are conditional, never forced.
Implementation: SVG instead of WebGL for first map; independent model/worker allows replacement without simulation changes. Accessible DOM controls and relatively small geometry benefit verification. CSS token styling instead of a large UI kit. No unnecessary backend or remote AI.

2026-10-16 revision: user rejected per-army micromanagement and rectangular map focus. Country clicks now open diplomacy immediately; national production/markets/politics/research and autonomous front postures take precedence. Existing army routing/combat remains an internal implementation detail. Original army-UI acceptance is superseded.

## 2026-10-16 — law and diplomacy depth

Replaced four additive reforms with 16 exclusive policy groups/48 choices and three-stage seeded enactment. Failure/cancellation have political costs and cooldowns. Added two-sided demands/backing, maneuver budgets, concrete primary concessions, ongoing treaty obligations and coalition war settlements. Preserve peaceful play expiry and explicit war initiation. Laws are a balanced shared baseline, not researched national constitutions. Save v1 migrates missing law groups. Source provenance, formulas and deferred systems live in LAWS_DIPLOMACY.md.
