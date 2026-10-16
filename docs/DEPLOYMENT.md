# GitHub Pages deployment

Repository: https://github.com/KuzeyOzturac/grandstrategyweb
Intended URL after deployment: https://kuzeyozturac.github.io/grandstrategyweb/

## One-time owner setup required

The first workflow's verify job passed, but configure-pages failed because Pages was not enabled and the workflow token cannot create the Pages site (`Resource not accessible by integration`). This is a repository setting, not an application build error.

1. Open https://github.com/KuzeyOzturac/grandstrategyweb/settings/pages
2. Under Build and deployment, set Source to **GitHub Actions**.
3. Open the latest Verify and deploy workflow under Actions and rerun the failed deployment job, or push a new change to main.

The connected coding tools can update source and rerun jobs but do not expose the repository-administration operation that enables Pages. No credentials should be pasted into source or chat.

## Release checks

Verification job must pass before deploy. After publish, run:

```sh
LIVE_URL=https://kuzeyozturac.github.io/grandstrategyweb/ npm run test:e2e
```

Check three playable starts, worker ticking, static map/font assets, access/war/aid/ceasefire, save/import and browser console errors. Update STATUS and VERIFICATION only after actual hosted success. Until then the URL is intended, not verified live.
