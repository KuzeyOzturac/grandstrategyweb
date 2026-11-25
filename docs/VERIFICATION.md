# Verification

2026-11-25 local results:

- `npm run check`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 1 browser test passed (country search, region selection, ownership display).
- Data audit: 4,596 regions, 4,596 unique IDs, 251 owner codes, and all 177 world country codes represented in the ADM1 source. Seven unnamed source areas are labeled “Unspecified area.”

The browser test does not verify every boundary or geopolitical dispute. Ownership is copied from Natural Earth's ADM1 `adm0_a3` field.

CI adjustment: the original Playwright 1.56.1 installer failed on GitHub's Ubuntu 26.04 runner before running tests. Updated Playwright to 1.65.1; the full local verification passed again.

2026-11-25 zoom fix: `npm run check`, `npm run build`, and `npm run test:e2e` passed locally (2 browser tests). The zoom test checks that Ontario and Shaviyani Atoll remain local shapes when state borders appear. A browser screenshot of the zoomed map was inspected.

Cache follow-up, 2026-11-25: GitHub Pages served the old JSON at its original URL while a cache-busting request returned the corrected file with an exact SHA-256 match. Versioned the state request and reran typecheck, build, and both browser tests successfully.
