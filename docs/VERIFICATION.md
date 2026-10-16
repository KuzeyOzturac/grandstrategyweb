# Verification
## Reproduce
Node 24; `npm ci`; `npx playwright install --with-deps chromium --only-shell`; `npm run verify`.
The browser suite runs against the production build via Vite preview on loopback. Set `LIVE_URL=https://kuzeyozturac.github.io/grandstrategyweb/ npm run test:e2e` to repeat against the deployed site.
## Local evidence, 2026-10-16
- TypeScript check: passed.
- 19 Vitest tests: passed. Geometry orientation/adjacency; all player starts; illegal commands; compensated agreement and cost; warning period/escalation/guarantee; crisis expiry; ceasefire stops combat; movement/halt; supply isolation; combat/retreat/ownership; encirclement; aid/delivery interruption; investment/sanctions/mobilization; exact saves and deterministic continuation; corrupt saves; six 400-day campaigns; defeat/observer.
- Six campaigns: TUR/IRN/SYR with seeds 7 and 2012, 400 days each (2,400 simulated days total); seed 7 observes AI government control, seed 2012 keeps player government idle. States valid; no overdue negotiating crises.
- Production build: passed; worker bundled separately; map, fonts and scripts local assets.
- Seven Playwright Chromium scenarios: passed. Three governments/worker, access/investment/save restoration, refusal/escalation/army objective/halt, corrupt import, overlays/world/pause/layout, aid delivery/ceasefire/valid import, introduction/political map.
- Screenshots inspected at 1440×960 and 1100×800; introduction, political theatre and supply overlay checked. Corrected inverse-ring ocean fill and added geometry test. No horizontal desktop overflow. These checks do not certify a full accessibility audit or all browsers.
- Keyboard test was corrected to click map background rather than the intentionally pointer-transparent map heading. Production pointer behavior was appropriate; no forced heading click added.
- Aid negative test corrected: open ports legitimately permit TUR→IRN sea aid. Uses a recipient without a regional route instead.
## Deployment
Pending first push and hosted verification. See STATUS for final outcome. CI blocks deployment when typecheck, model tests, build or browser tests fail.
## Known limits
Small balanced vertical slice, not a historical military database. One aggregate opposition actor, no faction spawning, no detailed navy, no freehand fronts. AI follows short routes and basic fiscal rules; no advanced coalition planning. Maritime pressure and air operations are aggregate effects. Escalation is an indicator, not an independent intervention AI. Current administrative geometry approximates 2012. Desktop/Chromium verified; mobile uses horizontally scrollable command layout. Long-term strategic balance and 45–90-minute enjoyment need player sessions beyond automated correctness checks.
