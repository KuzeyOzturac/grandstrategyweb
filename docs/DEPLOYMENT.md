# GitHub Pages deployment

Repository: https://github.com/KuzeyOzturac/grandstrategyweb
Published URL: https://kuzeyozturac.github.io/grandstrategyweb/

## One-time owner setup (completed 2026-10-16)

The first workflow's verify job passed, but configure-pages failed because Pages was not enabled and the workflow token cannot create the Pages site (`Resource not accessible by integration`). The owner enabled Source → GitHub Actions, and workflow run 38931589413 subsequently passed verification and deployment. These steps remain useful for a fork or replacement repository.

1. Open https://github.com/KuzeyOzturac/grandstrategyweb/settings/pages
2. Under Build and deployment, set Source to **GitHub Actions**.
3. Open the latest Verify and deploy workflow under Actions and rerun the failed deployment job, or push a new change to main.

The connected coding tools can update source and rerun jobs but do not expose the repository-administration operation that enables Pages. No credentials should be pasted into source or chat.

## Release checks

Verification job must pass before deploy. After publish, run:

```sh
LIVE_URL=https://kuzeyozturac.github.io/grandstrategyweb/ npm run test:e2e
```

Check three playable starts, worker ticking, static map/font assets, access/war/aid/ceasefire, save/import and browser console errors. Update STATUS and VERIFICATION only after actual hosted success. The first release is published; see VERIFICATION.md for hosted test evidence.

## Proxied verification environments

Playwright accepts optional `PLAYWRIGHT_PROXY_SERVER` for restricted networks. An intercepting test proxy may also require `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1`; this is opt-in for the test browser only and changes no application or hosting TLS settings. Neither option is needed for normal GitHub Actions runs.
