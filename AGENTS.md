# World Atlas

The site is a read-only map. See README.md for scope, data provenance, and local commands.

- Keep Natural Earth geometry and the source `adm0_a3` owner for each administrative region. Do not infer ownership from names, location, or former gameplay state.
- Do not add external runtime data requests. GitHub Pages uses `/grandstrategyweb/` as the base path.
- Before shipping, run `npm run check`, `npm run build`, and `npm run test:e2e`. Record actual results in docs/VERIFICATION.md and status in docs/STATUS.md.
