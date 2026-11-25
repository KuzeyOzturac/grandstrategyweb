# Verification

2026-11-25 local results:

- `npm run check`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 1 browser test passed (country search, region selection, ownership display).
- Data audit: 4,596 regions, 4,596 unique IDs, 251 owner codes, and all 177 world country codes represented in the ADM1 source. Seven unnamed source areas are labeled “Unspecified area.”

The browser test does not verify every boundary or geopolitical dispute. Ownership is copied from Natural Earth's ADM1 `adm0_a3` field.
