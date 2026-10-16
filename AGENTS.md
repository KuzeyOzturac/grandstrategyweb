# Working on Fault Lines

Read docs/STATUS.md first, then only the documents needed for your task.

- Scope and acceptance: docs/FIRST_BUILD.md
- Simulation rules: docs/SYSTEMS.md; src/engine.ts is authoritative implementation.
- Architecture and commands: docs/ARCHITECTURE.md
- Historical caveats and sources: docs/SCENARIO.md, docs/DATA.md
- UI changes: DESIGN.md
- Verification commands and evidence: docs/VERIFICATION.md
  Keep engine independent of DOM, React, clocks, storage and unseeded randomness. All player and AI mutations go through engine commands. Never replace real map geometry with illustrative polygons. Do not represent balanced scenario numbers as researched statistics.
  Before shipping run npm run check, npm test, npm run build, npm run test:e2e. Update STATUS and VERIFICATION with actual results. Do not claim a test passed unless executed. Keep documentation focused; record behavior changes in DECISIONS and SYSTEMS. No backend, secret keys, external runtime requests, or paid services. GitHub Pages base path /grandstrategyweb/.
