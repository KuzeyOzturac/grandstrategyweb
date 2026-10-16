"""Build shipped geometry and adjacency from Natural Earth. Requires shapely.
Use cached /tmp/world.geojson and /tmp/admin1.geojson or download original sources.
"""
import json,math,urllib.request,hashlib
from pathlib import Path
from shapely.geometry import shape,mapping,box,Point
from shapely.ops import unary_union
from shapely import orient_polygons
ROOT=Path(__file__).resolve().parents[1]
def source(name,url):
 p=Path('/tmp')/name
 if not p.exists():p.write_bytes(urllib.request.urlopen(url).read())
 return json.loads(p.read_text()),hashlib.sha256(p.read_bytes()).hexdigest()
base='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
world,wh=source('world.geojson',base+'ne_110m_admin_0_countries.geojson')
admin,ah=source('admin1.geojson',base+'ne_10m_admin_1_states_provinces.geojson')
active=['TUR','IRN','SYR','IRQ','LBN','JOR','ISR','SAU','KWT','QAT','ARE','OMN','BHR','PSX','EGY','CYP']
regions=[]; provinces=[]; geoms=[]
for f in admin['features']:
 p=f['properties']; c=p.get('adm0_a3')
 if c not in active or p.get('name')=='UNDOF':continue
 if c=='PSX':c='PSE'
 geom=shape(f['geometry']).buffer(0).simplify(.025,preserve_topology=True)
 if geom.is_empty:continue
 rid=p['adm1_code']; name=p.get('name_en') or p['name']; regions.append({'id':rid,'name':name,'country':c})
 pieces=[geom]
 if c=='SYR':
  minx,miny,maxx,maxy=geom.bounds; pieces=[]
  for x in range(math.floor(minx),math.ceil(maxx)):
   for y in range(math.floor(miny),math.ceil(maxy)):
    g=geom.intersection(box(x,y,x+1,y+1))
    if g.area>.012:pieces.append(g)
  if not pieces:pieces=[geom]
 for n,g in enumerate(pieces):
  pt=g.representative_point(); pid=rid+('-'+str(n) if c=='SYR' else '')
  feat={'type':'Feature','id':pid,'properties':{'id':pid,'region':rid,'name':name+(f' · {n+1}' if len(pieces)>1 else ''),'country':c,'center':[round(pt.x,4),round(pt.y,4)]},'geometry':mapping(orient_polygons(g,exterior_cw=True))}
  provinces.append(feat);geoms.append(g)
# Topological adjacency, with tolerance for cartographic gaps. Island ferries explicit.
links={f['id']:[] for f in provinces}
for i,g in enumerate(geoms):
 for j in range(i):
  h=geoms[j]
  if g.distance(h)<.045:
   a,b=provinces[i]['id'],provinces[j]['id'];links[a].append(b);links[b].append(a)
# Island components remain real islands; no invented land edges.
countries=[]
for f in world['features']:
 p=f['properties']; c=p.get('ADM0_A3'); countries.append({'type':'Feature','id':c,'properties':{'id':c,'name':p.get('NAME_EN') or p['NAME']},'geometry':mapping(orient_polygons(shape(f['geometry']),exterior_cw=True))})
result={'type':'FeatureCollection','features':provinces,'regions':regions,'adjacency':links}
(ROOT/'public/data/provinces.json').write_text(json.dumps(result,separators=(',',':')))
(ROOT/'public/data/world.json').write_text(json.dumps({'type':'FeatureCollection','features':countries},separators=(',',':')))
(ROOT/'public/data/manifest.json').write_text(json.dumps({'provider':'Natural Earth','license':'Public domain','retrieved':'2026-10-16','world_sha256':wh,'admin1_sha256':ah,'sources':[base+'ne_110m_admin_0_countries.geojson',base+'ne_10m_admin_1_states_provinces.geojson'],'processing':'ADM1 simplified 0.025 degrees; Syrian military areas clipped to 1-degree grid; adjacency tolerance 0.045 degrees. Current administrative geography is an approximation for 2012. No claim of exact front lines.'},indent=2))
print(len(regions),'regions;',len(provinces),'military areas;',sum(map(len,links.values()))//2,'edges')
