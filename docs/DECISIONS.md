# Decisions

2026-11-25: Replace the simulation with a standalone atlas. Use Natural Earth's `adm0_a3` administrative owner for each ADM1 feature. Preserve source country names, with the source's `admin` name for countries absent from the lower-resolution world layer. The map is an approximate cartographic presentation, not a sovereignty claim.

2026-11-25: Orient ADM1 exterior rings clockwise for D3 Geo before export. Keep six decimal places so very small islands do not reverse winding when rounded. The earlier export let D3 fill the complement of some regions during zoom.
