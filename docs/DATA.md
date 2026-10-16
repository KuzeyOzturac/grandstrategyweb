# Map and data

Bundled Natural Earth 110m country outlines and selected 10m ADM1 polygons, public domain. See public/data/manifest.json for URLs, checksums and processing. https://www.naturalearthdata.com/about/terms-of-use/
Rebuild: `pip install shapely`; `python scripts/prepare_map.py`. Downloads are build-time only. Current source branch URLs can change: checksum manifest identifies inputs actually used; preserve raw sources separately when intentionally updating geometry.
Syrian ADM1 polygons clipped to a 1-degree grid. Stable IDs parent-region + piece index; no invented hand-drawn borders. Adjacency derived with a small tolerance for simplification gaps. Islands have no invented land bridges. Capital and port positions are approximate geographic anchors; routes abstract access rather than reproduce rail networks.
Map policy follows source geometry and is not a political endorsement. Territory ownership/control is game state, separate from geographic source attributes. Resource and military values use abstract game units, not real military inventories or monetary forecasts.
