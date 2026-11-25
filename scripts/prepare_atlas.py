"""Build the worldwide ADM1 atlas from Natural Earth public-domain geometry.

Download ne_10m_admin_1_states_provinces.geojson into work/admin1.geojson,
then run this script. No geometry or ownership is inferred from game state.
"""
import json
import urllib.request
from pathlib import Path
from shapely.geometry import shape, mapping

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'admin1.geojson'
if not SOURCE.exists():
    url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
    SOURCE.write_bytes(urllib.request.urlopen(url).read())
world = json.loads((ROOT / 'public/data/world.json').read_text())
source = json.loads(SOURCE.read_text())
names = {f['id']: f['properties']['name'] for f in world['features']}

def round_coords(value):
    if isinstance(value, (float, int)):
        return round(value, 4)
    return [round_coords(x) for x in value]

features = []
for feature in source['features']:
    props = feature['properties']
    country = props['adm0_a3']
    geometry = shape(feature['geometry']).simplify(.035, preserve_topology=True)
    if geometry.is_empty:
        continue
    region = props.get('adm1_code') or props.get('iso_3166_2')
    features.append({
        'type': 'Feature', 'id': region,
        'properties': {
            'name': props.get('name_en') or props.get('name') or 'Unspecified area',
            'country': country,
            'countryName': names.get(country, props.get('admin') or country),
        },
        'geometry': {'type': geometry.geom_type,
                     'coordinates': round_coords(mapping(geometry)['coordinates'])},
    })

out = ROOT / 'public/data/states.json'
out.write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                          ensure_ascii=False, separators=(',', ':')))
print(f'{len(features)} states, {len(set(f["properties"]["country"] for f in features))} owners, {out.stat().st_size / 1e6:.1f} MB')
