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

Space pauses; 1–3 change speed. Drag/scroll the map. Select an army under Armed forces, choose an order, then select its destination. Friendly movement needs military access; attacks need war. Open a compensated diplomatic crisis for access or ceasefire. Use Journal for local saves or JSON export/import. Autosave every 10 simulated days.

## Verification

```sh
npx playwright install chromium --only-shell
npm run verify
```

Typecheck, seeded engine/integration tests, production build and browser scenarios. See [verification evidence](docs/VERIFICATION.md). GitHub Actions verifies before deploying Pages. No API keys, backend or paid services.

## Context for future coding

Start with [AGENTS.md](AGENTS.md) and [docs/STATUS.md](docs/STATUS.md). Scope, systems, architecture, data sources, decisions and test instructions are maintained separately. Read only the documents relevant to the change.

Natural Earth map geometry is public domain. Code license: MIT. Desktop browser first; narrow screens can scroll the command layout. SVG is used for the first map renderer, with simulation isolated in a Web Worker.
