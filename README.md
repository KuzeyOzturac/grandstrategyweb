# Fault Lines

A single-player browser grand-strategy sandbox set in the Middle East on 1 January 2012. Lead Türkiye, Iran or Syria's government through diplomacy, resource constraints and province warfare.

Historical context; alternate outcomes. Military, economic and territorial-control values are gameplay approximations. The aggregate opposition is not a claim of unified historical command. See [scenario sources](docs/SCENARIO.md).

## Play and develop

Requires Node 22+ (Node 24 tested).

```sh
npm ci
npm run dev
```

Open the printed URL with `/grandstrategyweb/`. Build with `npm run build`; preview with `npm run preview`.

Click a country for its dossier and diplomatic actions. Click an owned state to choose a construction location. Production manages facilities and the national queue; Market shows shortages and trade routes; Politics contains interest groups, reforms and research. Military fronts offers advance/defend/standby while commanders manage deployments. Space pauses; 1–3 change speed (2 / 0.7 / 0.2 seconds per game day). New decisions and incoming proposals pause the clock. Save/export/import under Journal; older saves are migrated.

The [Victoria 3 research matrix](docs/VICTORIA3_RESEARCH.md) records the official sources, adaptations and remaining depth. [REDESIGN.md](docs/REDESIGN.md) supersedes the original army UI plan. This is an aggregate national-management game, not a complete pop-level economic simulation.

## Verification

```sh
npx playwright install chromium --only-shell
npm run verify
```

Typecheck, seeded engine/integration tests, production build and browser scenarios. See [verification evidence](docs/VERIFICATION.md). GitHub Actions verifies before deploying Pages. One-time repository Pages setup is documented in [deployment instructions](docs/DEPLOYMENT.md). No API keys, backend or paid services.

## Context for future coding

Start with [AGENTS.md](AGENTS.md) and [docs/STATUS.md](docs/STATUS.md). Scope, systems, architecture, data sources, decisions and test instructions are maintained separately. Read only the documents relevant to the change.

Natural Earth map geometry is public domain. Code license: MIT. Desktop browser first; narrow screens can scroll the command layout. SVG is used for the first map renderer, with simulation isolated in a Web Worker.
