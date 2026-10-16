# Revision1.2.0 — laws and diplomatic plays

2026-10-16: final `npm run verify` passed locally: TypeScript,42 model/integration tests, production build and11 Chromium browser scenarios (21.5 seconds). Existing six400-day campaigns still pass. `git diff --check` clean. Screenshots of law catalogue and war settlement inspected at1440×960; existing country shape selection and1100px layout tests pass.

New model coverage:16 exclusive groups/48 distinct effect combinations; checkpoint probabilities; low-legitimacy pause; three-setback failure; cancellation cooldown/radicals; migration retaining old reforms; duplicate-policy rejection; reparations cash/debt flow;180-day arms restrictions/expiry; counter-demands; primary-only backdown; countdown command rejection without mutation; opposing coalitions; conquest-based settlement leverage; primary/secondary settlement enforcement; duplicate-free demand promotion; mediation closes play war and coalition hostilities. Browser additions exercise policy category/selector/odds/cancellation and war aims/backing/escalation/concession through the actual worker UI.

Earlier tests were updated where the rules intentionally changed: reform passage uses fixed checkpoint seeds rather than assuming all bills inevitably pass; research respects the new institutional modifiers. Final source was not changed after this verification run. CI deployment and hosted verification pending.

---

# Current revision verification (1.1.0)

2026-10-16: 33 model/integration tests passed, including migration, markets/routes/embargo, queue/priority/refund/production, reform/upkeep/living standards, coalition/research/method unlocks, decisions, automatic fronts, obligations, incoming proposal consent and deterministic continuation. Original combat/supply/geometry/save tests and six 400-day campaigns continue to pass.
Nine browser scenarios passed locally: three government starts; country click and shape-only focus; relations/negotiation/obligation; trade shortage relief; construction priority/cancellation; politics/reform/research/decisions; strategic fronts; saves/imports/overlays/keyboard/layout; automatic pause for new decisions. The main eight journeys ran together; the added pause journey ran separately. Typecheck and production build passed. Screenshots inspected. No game source changed after those checks.
One new test caught a second auto-acceptance path in weekly AI diplomacy; fixed in the command gateway so incoming offers require the player's explicit response, not only at expiry.
Revision 1.1.0 published from eb7446542a45d43d76c12366c299566b66edb03f. GitHub Actions run 38936018202 passed verification and deployment. All nine revised browser scenarios passed together against the live public site in 1.4 minutes, including shape-only focus/country clicks and automatic pause. The served main JavaScript matches the tested production build by SHA-256. Controlled test proxy options were used in this environment, as documented below. The earlier release record remains historical evidence.

---

# Verification

## Reproduce

Node 24; `npm ci`; `npx playwright install --with-deps chromium --only-shell`; `npm run verify`.
The browser suite runs against the production build via Vite preview on loopback. Set `LIVE_URL=https://kuzeyozturac.github.io/grandstrategyweb/ npm run test:e2e` to repeat against the deployed site.

## Local evidence, 2026-10-16

- TypeScript check: passed.
- 20 Vitest tests: passed. Geometry orientation/adjacency; all player starts; illegal commands; compensated agreement and cost; warning period/escalation/guarantee; crisis expiry; ceasefire stops combat; movement/halt; supply isolation; combat/retreat/ownership; encirclement; aid/delivery interruption; investment/sanctions/mobilization; exact saves and deterministic continuation; corrupt saves; six 400-day campaigns; defeat/observer; low-stock mobilized reinforcement cannot make equipment negative.
- Six campaigns: TUR/IRN/SYR with seeds 7 and 2012, 400 days each (2,400 simulated days total); seed 7 observes AI government control, seed 2012 keeps player government idle. States valid; no overdue negotiating crises.
- Production build: passed; worker bundled separately; map, fonts and scripts local assets.
- Seven Playwright Chromium scenarios: passed. Three governments/worker, access/investment/save restoration, refusal/escalation/army objective/halt, corrupt import, overlays/world/pause/layout, aid delivery/ceasefire/valid import, introduction/political map.
- Screenshots inspected at 1440×960 and 1100×800; introduction, political theatre and supply overlay checked. Corrected inverse-ring ocean fill and added geometry test. No horizontal desktop overflow. These checks do not certify a full accessibility audit or all browsers.
- Keyboard test was corrected to click map background rather than the intentionally pointer-transparent map heading. Production pointer behavior was appropriate; no forced heading click added.
- Aid negative test corrected: open ports legitimately permit TUR→IRN sea aid. Uses a recipient without a regional route instead.

## Deployment and hosted verification, 2026-10-16

Published: https://kuzeyozturac.github.io/grandstrategyweb/
Source: cdf3f97b30b345bc6782424ad32a12cd94e762a9.
GitHub Actions run 38931589413: verification and deployment both succeeded. Owner enabled Pages after the initial configure-pages permission failure.
All seven Playwright scenarios passed against the public URL (1.3 minutes): three governments and worker ticking, compensated access/investment/local restore, failed negotiation/escalation/army objective/halt, corrupt import, map overlays/world/pause/layout, aid/ceasefire/valid import, introduction/political map. First scenario also asserts no page JavaScript errors.
Public index JS, CSS, world.json, provinces.json and manifest.json match the local production build by SHA-256. HTTP 200 confirmed. Hosted screenshots rendered successfully.
Network verification initially failed with direct Chromium connections and then an untrusted intercepting proxy certificate. Optional proxy and explicit test-only certificate handling enabled the live suite; no game/hosting TLS behavior changed. First completed proxied attempt lost its tunnel after one successful test; rerunning with the command held open produced seven passes. These were environment transport failures, not accepted application test failures.
CI blocks deployment on failed typecheck, model tests, build or browser checks.

## Known limits

Small balanced vertical slice, not a historical military database. One aggregate opposition actor, no faction spawning, no detailed navy, no freehand fronts. AI follows short routes and basic fiscal rules; no advanced coalition planning. Maritime pressure and air operations are aggregate effects. Escalation is an indicator, not an independent intervention AI. Current administrative geometry approximates 2012. Desktop/Chromium verified; mobile uses horizontally scrollable command layout. Long-term strategic balance and 45–90-minute enjoyment need player sessions beyond automated correctness checks.
