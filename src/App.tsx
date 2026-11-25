import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";

type Place = { type: "Feature"; id: string; properties: { name: string; country?: string; countryName?: string }; geometry: any };
type Collection = { features: Place[] };
const WIDTH = 1200;
const HEIGHT = 620;
const projection = geoMercator().scale(190).translate([WIDTH / 2, HEIGHT / 2 + 5]);
const path = geoPath(projection);
const bounds = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const color = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 24% 47%)`;
};

export default function App() {
  const [countries, setCountries] = useState<Place[]>([]);
  const [states, setStates] = useState<Place[]>([]);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showStates, setShowStates] = useState(true);
  const pointer = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all(["world", "states"].map(async (file) => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${file}.json`);
      if (!response.ok) throw new Error(`Could not load ${file} boundaries`);
      return (await response.json()) as Collection;
    })).then(([world, regions]) => { setCountries(world.features); setStates(regions.features); })
      .catch((cause) => setError(String(cause)));
  }, []);

  const countryById = useMemo(() => new Map(countries.map((country) => [country.id, country])), [countries]);
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states]);
  const selected = selectedCountry ? countryById.get(selectedCountry) : null;
  const region = selectedState ? stateById.get(selectedState) : null;
  const ownedStates = useMemo(() => states.filter((state) => state.properties.country === selectedCountry), [states, selectedCountry]);
  const countryShapes = useMemo(() => countries.map((country) => <path key={country.id} d={path(country as any) ?? ""} fill={color(country.id)} className={`country ${selectedCountry === country.id ? "selected" : ""}`} onClick={() => { if (!pointer.current?.moved) selectCountry(country.id); }}><title>{country.properties.name}</title></path>), [countries, selectedCountry]);
  const stateShapes = useMemo(() => states.map((state) => <path key={state.id} d={path(state as any) ?? ""} fill={color(state.properties.country ?? "")} className={`state ${selectedState === state.id ? "selected" : ""}`} onClick={() => { if (!pointer.current?.moved) selectState(state); }}><title>{state.properties.name} — {state.properties.countryName}</title></path>), [states, selectedState]);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (term.length < 2) return [];
    return [
      ...countries.filter((country) => country.properties.name.toLocaleLowerCase().includes(term)).map((country) => ({ kind: "country" as const, feature: country })),
      ...states.filter((state) => `${state.properties.name} ${state.properties.countryName}`.toLocaleLowerCase().includes(term)).map((state) => ({ kind: "state" as const, feature: state })),
    ].slice(0, 12);
  }, [query, countries, states]);

  const focus = (feature: Place, level = 3) => {
    const center = path.centroid(feature as any);
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    setZoom(level);
    setPan({ x: WIDTH / 2 - center[0] * level, y: HEIGHT / 2 - center[1] * level });
  };
  const selectCountry = (id: string) => { setSelectedCountry(id); setSelectedState(null); };
  const selectState = (feature: Place) => {
    setSelectedState(feature.id);
    setSelectedCountry(feature.properties.country ?? null);
  };
  const changeZoom = (next: number, x = WIDTH / 2, y = HEIGHT / 2) => {
    const value = bounds(next, 1, 12);
    const ratio = value / zoom;
    setPan((old) => ({ x: x - (x - old.x) * ratio, y: y - (y - old.y) * ratio }));
    setZoom(value);
  };
  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * WIDTH;
    const y = (event.clientY - rect.top) / rect.height * HEIGHT;
    changeZoom(zoom * (event.deltaY < 0 ? 1.18 : 1 / 1.18), x, y);
  };

  return <main className="atlas">
    <header className="topbar"><div><span className="eyebrow">WORLD ATLAS</span><h1>Explore the world</h1></div><div className="topnote">Countries and first level administrative regions</div></header>
    <div className="workspace">
      <aside className="sidebar">
        <label htmlFor="place-search">Find a place</label>
        <input id="place-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Country or state…" />
        {query.trim().length >= 2 && <div className="results" role="listbox" aria-label="Search results">
          {results.length ? results.map(({ kind, feature }) => <button key={`${kind}-${feature.id}`} onClick={() => {
            if (kind === "country") selectCountry(feature.id); else selectState(feature);
            focus(feature, kind === "country" ? 3 : 6); setQuery("");
          }}><strong>{feature.properties.name}</strong><small>{kind === "state" ? feature.properties.countryName : "Country"}</small></button>) : <p>No matching places</p>}
        </div>}
        <div className="divider" />
        {selected ? <section className="selection"><span className="eyebrow">SELECTED COUNTRY</span><h2>{selected.properties.name}</h2><p>{ownedStates.length} mapped administrative regions</p>
          {region && <div className="region-card"><span className="eyebrow">SELECTED REGION</span><h3>{region.properties.name}</h3><p>Owned by {region.properties.countryName}</p></div>}
          <h3>Regions</h3><div className="region-list">{ownedStates.map((state) => <button key={state.id} className={selectedState === state.id ? "active" : ""} onClick={() => { selectState(state); focus(state, 6); }}>{state.properties.name}</button>)}</div>
        </section> : <section className="selection empty"><span className="eyebrow">GET STARTED</span><h2>Choose a country</h2><p>Click a country on the map, or search for a country or region.</p></section>}
        <div className="source">Boundary data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> (public domain). Administrative boundaries are cartographic approximations; disputed areas may differ by source.</div>
      </aside>
      <div className="map-area">
        {error ? <div className="map-message" role="alert">{error}</div> : !countries.length || !states.length ? <div className="map-message" role="status">Loading world map…</div> : <svg ref={svg} className="map-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Interactive world map" onWheel={onWheel}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pointer.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false }; }}
          onPointerMove={(event) => { if (!pointer.current) return; const rect = event.currentTarget.getBoundingClientRect(); const dx = (event.clientX - pointer.current.x) / rect.width * WIDTH; const dy = (event.clientY - pointer.current.y) / rect.height * HEIGHT; if (Math.abs(dx) + Math.abs(dy) > 3) pointer.current.moved = true; setPan({ x: pointer.current.panX + dx, y: pointer.current.panY + dy }); }}
          onPointerUp={() => { setTimeout(() => { pointer.current = null; }, 0); }}>
          <rect width={WIDTH} height={HEIGHT} className="ocean" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {countryShapes}
            {showStates && zoom >= 1.8 && stateShapes}
          </g>
        </svg>}
        <div className="map-controls"><button aria-label="Zoom in" onClick={() => changeZoom(zoom * 1.5)}>+</button><button aria-label="Zoom out" onClick={() => changeZoom(zoom / 1.5)}>−</button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset view</button></div>
        <label className="layer-toggle"><input type="checkbox" checked={showStates} onChange={(event) => setShowStates(event.target.checked)} /> State borders</label>
        <div className="map-hint">Drag to pan · Scroll to zoom · Select a place to inspect it</div>
      </div>
    </div>
  </main>;
}
