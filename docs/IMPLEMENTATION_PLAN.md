# Implementation order

1. Ship reproducible real map assets and source manifest; validate IDs/adjacency.
2. Build deterministic model, commands, pathfinding, budgets/supply, combat and faction control.
3. Add crises, agreements, sanctions, aid, guarantees and settlements; use same rules in AI.
4. Connect worker scheduler and map interface; onboarding, tutorial, dossiers, economy/army/diplomacy/journal.
5. Validate saves; tests for illegal actions, supply isolation, negotiated/war outcomes, AI soak and browser flows.
6. Build and inspect desktop screenshots; resolve errors; CI verification; deploy Pages; verify live assets/worker.
   Exit criteria and deliberate omissions are in FIRST_BUILD. Capture measured results in VERIFICATION and current state in STATUS.
