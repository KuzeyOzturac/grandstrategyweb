import CommandPanel, { type PanelTab } from "./CommandPanel";
import { society } from "./society";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import {
  GlobeIcon,
  TargetIcon,
  BackpackIcon,
  ReaderIcon,
  DashboardIcon,
  PlayIcon,
  PauseIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
  ResetIcon,
  DownloadIcon,
  UploadIcon,
  Cross1Icon,
  InfoCircledIcon,
  TriangleRightIcon,
  LayersIcon,
} from "@radix-ui/react-icons";
import {
  META,
  name,
  dateLabel,
  type MapData,
  type MapFeature,
} from "./scenario";
import { relation, deserialize, type State, type Command } from "./engine";
type Tab = PanelTab;
const SAVE = "fault-lines-v1";
const num = (v: number) => Math.round(v).toLocaleString("en-GB");
const tabs: { id: Tab; label: string; icon: typeof GlobeIcon }[] = [
  { id: "overview", label: "Situation", icon: GlobeIcon },
  { id: "diplomacy", label: "Diplomacy", icon: ReaderIcon },
  { id: "military", label: "Military fronts", icon: TargetIcon },
  { id: "economy", label: "Production", icon: BackpackIcon },
  { id: "market", label: "Market", icon: LayersIcon },
  { id: "politics", label: "Politics", icon: ReaderIcon },
  { id: "journal", label: "Journal", icon: DashboardIcon },
];
function Action({
  children,
  onClick,
  disabled = false,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      className={`action ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
export default function App() {
  const [map, setMap] = useState<MapData | null>(null),
    [world, setWorld] = useState<any>(null),
    [loadError, setLoadError] = useState("");
  const [state, setState] = useState<State | null>(null),
    [speed, setSpeed] = useState(0),
    [picker, setPicker] = useState(true),
    [choice, setChoice] = useState("TUR"),
    [guided, setGuided] = useState(true),
    [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<string | null>(null),
    [target, setTarget] = useState("SYR"),
    [overlay, setOverlay] = useState("political");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [showHelp, setShowHelp] = useState(false),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [global, setGlobal] = useState(false),
    [tutorial, setTutorial] = useState(0),
    [journalOpen, setJournalOpen] = useState(true),
    [hasSave, setHasSave] = useState(false),
    [outside, setOutside] = useState<string | null>(null),
    [hoverCountry, setHoverCountry] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null),
    stateRef = useRef<State | null>(null),
    file = useRef<HTMLInputElement>(null),
    panelRef = useRef<HTMLElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      px: number;
      py: number;
      moved: boolean;
    } | null>(null),
    svg = useRef<SVGSVGElement>(null),
    savePending = useRef<string | null>(null);
  const notify = useCallback(
    (text: string, error = false) => setNotice({ text, error }),
    [],
  );
  useEffect(() => {
    Promise.all([
      fetch(import.meta.env.BASE_URL + "data/provinces.json").then((r) => {
        if (!r.ok) throw Error("Province map unavailable");
        return r.json();
      }),
      fetch(import.meta.env.BASE_URL + "data/world.json").then((r) => {
        if (!r.ok) throw Error("World map unavailable");
        return r.json();
      }),
    ])
      .then(([m, w]) => {
        setMap(m);
        setWorld(w);
      })
      .catch((e) => setLoadError(String(e)));
    try {
      setHasSave(!!localStorage.getItem(SAVE));
    } catch {
      /* storage may be unavailable */
    }
  }, []);
  useEffect(() => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    const store = (text: string) => {
      try {
        localStorage.setItem(SAVE, text);
        setHasSave(true);
      } catch {
        notify(
          "Storage unavailable. Export a save file to preserve this campaign.",
          true,
        );
      }
    };
    w.onmessage = ({ data: d }) => {
      if (d.state) {
        setState(d.state);
        stateRef.current = d.state;
        setSpeed(d.speed);
        if (savePending.current) {
          const text = savePending.current;
          savePending.current = null;
          w.postMessage({ type: "load", text });
        }
      }
      if (d.result) notify(d.result.message, !d.result.ok);
      if (d.error) notify(d.error, true);
      if (d.autosave) store(d.autosave);
      if (d.save) {
        store(d.save);
        if (d.export) {
          const url = URL.createObjectURL(
            new Blob([d.save], { type: "application/json" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `fault-lines-${stateRef.current?.player}-${stateRef.current?.day}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          notify("Campaign exported.");
        } else notify("Campaign saved on this browser.");
      }
    };
    w.onerror = () =>
      notify(
        "Simulation worker failed. Reload the page or restore a saved campaign.",
        true,
      );
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, [notify]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(id);
  }, [notice]);
  const send = (command: Command) =>
    worker.current?.postMessage({ type: "command", command });
  const changeSpeed = useCallback(
    (n: number) => worker.current?.postMessage({ type: "speed", speed: n }),
    [],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest("input,select,textarea,button") ||
        picker ||
        showHelp
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        changeSpeed(speed ? 0 : 1);
      }
      if (["1", "2", "3"].includes(e.key)) changeSpeed(+e.key);
      if (e.key === "Escape") {
        setShowHelp(false);
      }
      if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        worker.current?.postMessage({ type: "save" });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [picker, showHelp, speed, changeSpeed]);
  const start = (load = false) => {
    if (!map) return;
    if (load) {
      try {
        const text = localStorage.getItem(SAVE);
        if (!text) {
          notify("No saved campaign found.", true);
          return;
        }
        savePending.current = text;
      } catch {
        notify("Browser storage is unavailable.", true);
        return;
      }
    }
    worker.current?.postMessage({ type: "init", map, player: choice, guided });
    setPicker(false);
    setOutside(null);
    setSelected(null);
    setTab("overview");
    setTutorial(0);
    setTarget(choice === "SYR" ? "OPP" : "SYR");
    setGlobal(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const importSave = async (f?: File) => {
    if (!f || !map) return;
    try {
      if (f.size > 8_000_000) throw Error("Save file is too large.");
      const text = await f.text();
      const s = deserialize(text, map);
      if (!state) {
        savePending.current = text;
        worker.current?.postMessage({
          type: "init",
          map,
          player: s.player,
          guided: s.guided,
        });
      } else worker.current?.postMessage({ type: "load", text });
      setPicker(false);
      setTarget(s.player === "SYR" ? "OPP" : "SYR");
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), true);
    }
    if (file.current) file.current.value = "";
  };
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [tab, target, outside]);
  const projection = useMemo(
    () =>
      geoMercator()
        .center(global ? [15, 15] : [42, 33])
        .scale(global ? 178 : 1450)
        .translate([600, 380]),
    [global],
  );
  const pathMaker = useMemo(() => geoPath(projection), [projection]);
  const featureById = useMemo(
    () => Object.fromEntries(map?.features.map((f) => [f.id, f]) ?? []),
    [map],
  );
  const c = state?.countries[state.player];
  const inspectCountry = (id: string, label?: string) => {
    if (drag.current?.moved || !state) return;
    if (!state.countries[id]) {
      setOutside(label ?? id);
      setTab("diplomacy");
      return;
    }
    setOutside(null);
    setTarget(id);
    setTab(id === state.player ? "overview" : "diplomacy");
  };
  const selectProvince = (f: MapFeature) => {
    if (drag.current?.moved) return;
    setSelected(f.id);
    inspectCountry(state?.provinces[f.id]?.controller ?? f.properties.country);
  };
  const mapFill = (f: MapFeature) => {
    if (!state) return META[f.properties.country]?.color ?? "#61716d";
    const p = state.provinces[f.id];
    if (overlay === "supply") {
      const a = state.armies.filter((a) => a.province === f.id);
      return a.length
        ? a.some((a) => a.supply < 35)
          ? "#b77866"
          : "#7eaa97"
        : p.depot
          ? "#8da790"
          : "#657e77";
    }
    if (overlay === "economy")
      return p.industry >= 3
        ? "#c5ad73"
        : p.industry > 1
          ? "#a69873"
          : "#777e69";
    if (overlay === "diplomatic") {
      const r = relation(state, state.player, p.controller);
      return p.controller === state.player
        ? "#d2b77e"
        : r > 10
          ? "#81a497"
          : r < 0
            ? "#b47e71"
            : "#89918a";
    }
    return META[p.controller]?.color ?? "#7a8b85";
  };
  const tutorialSteps = [
    {
      title: "Click a country",
      text: "Click a foreign country to open its dossier and diplomatic actions. Click your own territory to inspect a state. Right-click works too.",
    },
    {
      title: "Follow the market",
      text: "Open Market. High prices reveal shortages. Import a partner’s surplus or construct domestic production to improve household living standards.",
    },
    {
      title: "Shape your society",
      text: "Politics shows interest groups, government legitimacy, laws and research. Reforms take time and need support; decisions have visible consequences.",
    },
    {
      title: "Build with a purpose",
      text: "Production holds the national construction queue. Choose a state, add facilities, and prioritize projects. New output affects prices and employment.",
    },
    {
      title: "Let commanders handle war",
      text: "Military fronts has advance, defend and standby orders. Diplomacy can secure a ceasefire. Space pauses; 1–3 set speed. Save under Journal.",
    },
  ];
  if (loadError)
    return (
      <main className="boot">
        <h1>Map could not load</h1>
        <p>{loadError}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </main>
    );
  return (
    <div className="app">
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Import campaign file"
        onChange={(e) => importSave(e.target.files?.[0])}
      />
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            changeSpeed(0);
            setShowHelp(true);
          }}
          aria-label="About Fault Lines"
        >
          <span className="brand-mark">
            <GlobeIcon />
          </span>
          <span>
            FAULT LINES<small>Grand strategy · 2012</small>
          </span>
        </button>
        {c && (
          <>
            <div className="nation">
              <i style={{ background: META[state!.player].color }} />
              <div>
                {name(state!.player)}
                <small>
                  {state?.observer ? "Observer campaign" : "National command"}
                </small>
              </div>
            </div>
            <div className="resources">
              <Resource
                label="Treasury"
                value={num(c.treasury)}
                sub={`${c.income - c.expense >= 0 ? "+" : ""}${(c.income - c.expense).toFixed(1)}/day`}
                title="Abstract budget credits. Daily revenue minus spending."
              />
              <Resource
                label="Living standard"
                value={state?.society ? society(state).living.toFixed(1) : "—"}
                sub="households"
                title="Wages, prices, taxes and social services shape living standards."
              />
              <Resource
                label="Construction"
                value={String(state?.society ? society(state).queue.length : 0)}
                sub="projects"
                title="Open Production to manage your construction queue."
              />
              <Resource
                label="Legitimacy"
                value={`${num(c.legitimacy)}%`}
                sub="government"
                title="Government composition and political support affect reforms."
              />
            </div>
            <div className="clock">
              <span>{dateLabel(state!.day)}</span>
              <div className="time-controls">
                <button
                  aria-label={speed ? "Pause" : "Play"}
                  onClick={() => changeSpeed(speed ? 0 : 1)}
                >
                  {speed ? <PauseIcon /> : <PlayIcon />}
                </button>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={speed === n ? "active" : ""}
                    aria-label={`Speed ${n}`}
                    onClick={() => changeSpeed(n)}
                  >
                    {n}×
                  </button>
                ))}
                <button
                  title="Advance one day while paused"
                  aria-label="Next day"
                  onClick={() => {
                    changeSpeed(0);
                    worker.current?.postMessage({ type: "step" });
                  }}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
        {!state && (
          <span className="header-note">
            A Middle East sandbox · Single player
          </span>
        )}
      </header>
      <div className="workspace">
        <nav className="rail" aria-label="Command panels">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setOutside(null);
                if (t.id === "diplomacy" && target === state?.player)
                  setTarget(state.player === "SYR" ? "OPP" : "SYR");
                setTab(t.id);
              }}
              title={t.label}
              aria-label={t.label}
            >
              <t.icon />
              <span>{t.label}</span>
            </button>
          ))}
          <div className="rail-bottom">
            <button
              title="Save campaign"
              aria-label="Save campaign"
              disabled={!state}
              onClick={() => worker.current?.postMessage({ type: "save" })}
            >
              <DownloadIcon />
              <span>Save</span>
            </button>
            <button aria-label="Help" onClick={() => setShowHelp(true)}>
              <InfoCircledIcon />
              <span>Help</span>
            </button>
          </div>
        </nav>
        <main className="atlas" aria-label="Strategy map">
          <div className="map-tools">
            <div className="theater-label">
              <span className="eyebrow">
                {global ? "Global overview" : "Active theatre"}
              </span>
              <h1>{global ? "The world" : "Middle East"}</h1>
              <p>
                {overlay === "political"
                  ? "Click a country to interact"
                  : "Strategic overlay"}{" "}
                <span> / {speed ? "Live" : "Paused"}</span>
              </p>
            </div>
            <div className="overlay-control">
              <LayersIcon />
              <select
                aria-label="Map overlay"
                value={overlay}
                onChange={(e) => setOverlay(e.target.value)}
              >
                <option value="political">Political</option>
                <option value="supply">Supply network</option>
                <option value="diplomatic">Diplomatic relations</option>
                <option value="economy">Industry</option>
              </select>
            </div>
          </div>
          {!map ? (
            <div className="map-loading">
              <div />
              <span>Preparing the atlas…</span>
            </div>
          ) : (
            <svg
              ref={svg}
              className="map-svg"
              viewBox="0 0 1200 760"
              aria-label="Province map"
              onWheel={(e) => {
                setZoom((z) =>
                  Math.max(0.6, Math.min(5, z * (e.deltaY < 0 ? 1.12 : 0.89))),
                );
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  px: pan.x,
                  py: pan.y,
                  moved: false,
                };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) return;
                const factor =
                  1200 / (svg.current?.getBoundingClientRect().width ?? 1200);
                if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) {
                  d.moved = true;
                  setPan({
                    x: d.px + (e.clientX - d.x) * factor,
                    y: d.py + (e.clientY - d.y) * factor,
                  });
                }
              }}
              onPointerUp={() => {
                setTimeout(() => {
                  drag.current = null;
                }, 0);
              }}
              onPointerLeave={() => {
                drag.current = null;
              }}
            >
              <defs>
                <pattern
                  id="sea"
                  width="12"
                  height="12"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0 12L12 0" stroke="#20353e" strokeWidth=".4" />
                </pattern>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L10 5L0 10z" fill="#ead9ad" />
                </marker>
              </defs>
              <rect width="1200" height="760" fill="#20343d" />
              <rect width="1200" height="760" fill="url(#sea)" />
              <g
                transform={`translate(${600 + pan.x},${380 + pan.y}) scale(${zoom}) translate(-600,-380)`}
              >
                <path
                  d={pathMaker(geoGraticule10()) ?? ""}
                  fill="none"
                  stroke="#38505a"
                  strokeWidth=".6"
                  opacity=".45"
                />
                {world?.features.map((f: any) => (
                  <path
                    key={f.id}
                    d={pathMaker(f) ?? ""}
                    fill="#536469"
                    stroke="#91a1a0"
                    strokeWidth=".6"
                    opacity=".7"
                    role="button"
                    tabIndex={global ? 0 : -1}
                    className="world-country"
                    data-country={f.id}
                    aria-label={`Inspect ${f.properties.name}`}
                    onClick={() => inspectCountry(f.id, f.properties.name)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      inspectCountry(f.id, f.properties.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        inspectCountry(f.id, f.properties.name);
                    }}
                  >
                    <title>
                      {f.properties.name} · Outside the active simulation where
                      no province layer is shown
                    </title>
                  </path>
                ))}
                {map.features.map((f) => (
                  <path
                    key={f.id}
                    data-province={f.id}
                    d={pathMaker(f as any) ?? ""}
                    fill={mapFill(f)}
                    stroke={selected === f.id ? "#f3dba8" : "#334b49"}
                    strokeWidth={
                      selected === f.id
                        ? 2.4
                        : overlay === "political"
                          ? 0.48
                          : 0.65
                    }
                    vectorEffect="non-scaling-stroke"
                    className={`province ${selected === f.id ? "selected" : ""} ${state?.provinces[f.id]?.controller === target && tab === "diplomacy" ? "country-selected" : ""} ${hoverCountry === (state?.provinces[f.id]?.controller ?? f.properties.country) ? "country-hover" : ""}`}
                    tabIndex={global ? -1 : 0}
                    role="button"
                    aria-label={`${f.properties.name}, ${name(state?.provinces[f.id]?.controller ?? f.properties.country)}`}
                    onClick={() => selectProvince(f)}
                    onMouseEnter={() =>
                      setHoverCountry(
                        state?.provinces[f.id]?.controller ??
                          f.properties.country,
                      )
                    }
                    onMouseLeave={() => setHoverCountry(null)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      selectProvince(f);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") selectProvince(f);
                    }}
                  >
                    <title>
                      {f.properties.name} ·{" "}
                      {name(
                        state?.provinces[f.id]?.controller ??
                          f.properties.country,
                      )}
                    </title>
                  </path>
                ))}
                {Object.entries(META)
                  .filter(
                    ([id]) =>
                      ![
                        "OPP",
                        "USA",
                        "RUS",
                        "PSE",
                        "BHR",
                        "QAT",
                        "KWT",
                        "LBN",
                        "CYP",
                      ].includes(id),
                  )
                  .map(([id, m]) => {
                    const anchors: Record<string, [number, number]> = {
                      SAU: [44, 25],
                      ARE: [54, 23.5],
                      OMN: [57, 21],
                      ISR: [34.8, 31.8],
                      JOR: [37.2, 30.5],
                      SYR: [38, 35],
                      TUR: [33.5, 40.3],
                      IRN: [54, 33],
                    };
                    const pos = projection(anchors[id] ?? m.capital);
                    if (!pos) return null;
                    return (
                      <text
                        key={id}
                        className="country-label"
                        x={pos[0]}
                        y={pos[1] - 15}
                        fontSize={["ISR", "JOR"].includes(id) ? 9 : 12}
                      >
                        {id === "SYR"
                          ? "SYRIA"
                          : id === "ARE"
                            ? "U.A.E."
                            : id === "ISR"
                              ? "ISR"
                              : name(id).toUpperCase()}
                      </text>
                    );
                  })}
                {!global &&
                  [
                    [30, 34.6, "MEDITERRANEAN SEA"],
                    [51, 27, "PERSIAN GULF"],
                    [35.2, 24.8, "RED SEA"],
                    [33.5, 43, "BLACK SEA"],
                  ].map(([x, y, t]) => {
                    const p = projection([x as number, y as number])!;
                    return (
                      <text className="sea-label" key={t} x={p[0]} y={p[1]}>
                        {t}
                      </text>
                    );
                  })}
                {!global &&
                  state &&
                  Object.values(state.countries)
                    .filter((v) => v.capital && !["OPP"].includes(v.id))
                    .map((v) => {
                      const f = featureById[v.capital];
                      if (!f) return null;
                      const p = projection(f.properties.center)!;
                      return (
                        <g
                          key={v.id}
                          className="capital"
                          transform={`translate(${p[0]},${p[1]})`}
                        >
                          <circle r="2.3" />
                          <text x="6" y="3">
                            {v.id === "TUR"
                              ? "Ankara"
                              : v.id === "SYR"
                                ? "Damascus"
                                : v.id === "IRN"
                                  ? "Tehran"
                                  : name(v.id)}
                          </text>
                        </g>
                      );
                    })}
                {!global &&
                  state?.wars.map(([a, b]) => {
                    const front = map.features.filter(
                      (f) =>
                        state.provinces[f.id].controller === a &&
                        map.adjacency[f.id].some(
                          (id) => state.provinces[id].controller === b,
                        ),
                    );
                    if (!front.length) return null;
                    return (
                      <g key={`${a}-${b}`} className="strategic-front">
                        {front.map((f) => {
                          const pt = projection(f.properties.center)!;
                          return (
                            <circle
                              key={f.id}
                              cx={pt[0]}
                              cy={pt[1]}
                              r="3"
                              fill="#df9c82"
                              stroke="#694838"
                              strokeWidth="1"
                            />
                          );
                        })}
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label={`Inspect ${name(a)} ${name(b)} front`}
                          onClick={() => {
                            setTarget(a === state.player ? b : a);
                            setTab(
                              [a, b].includes(state.player)
                                ? "military"
                                : "diplomacy",
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setTarget(a === state.player ? b : a);
                              setTab(
                                [a, b].includes(state.player)
                                  ? "military"
                                  : "diplomacy",
                              );
                            }
                          }}
                          transform={`translate(${projection(front[0].properties.center)![0]},${projection(front[0].properties.center)![1] - 12})`}
                        >
                          <circle r="8" fill="#503f34" stroke="#e0bc85" />
                          <path d="M-3 -3L3 3M3 -3L-3 3" stroke="#e8d6b8" />
                        </g>
                      </g>
                    );
                  })}
              </g>
            </svg>
          )}
          {state && hoverCountry && (
            <div className="country-tooltip">
              <b>{name(hoverCountry)}</b>
              <span>
                {hoverCountry === state.player
                  ? "Click to inspect state"
                  : "Click to interact with this country"}
              </span>
            </div>
          )}
          {state?.society && society(state).decision && (
            <button
              className="attention-banner"
              onClick={() => setTab("politics")}
            >
              Decision awaits: {society(state).decision!.title}
              <ChevronRightIcon />
            </button>
          )}
          {state &&
            !(state.society && society(state).decision) &&
            state.crises.some(
              (cr) => cr.status === "negotiating" && cr.to === state.player,
            ) && (
              <button
                className="attention-banner"
                onClick={() => {
                  const cr = state.crises.find(
                    (cr) =>
                      cr.status === "negotiating" && cr.to === state.player,
                  )!;
                  setTarget(cr.from);
                  setTab("diplomacy");
                }}
              >
                Diplomatic proposal needs a response
                <ChevronRightIcon />
              </button>
            )}
          <div className="map-footer">
            <div className="legend">
              <i style={{ background: META.OPP.color }} /> Opposition control{" "}
              <i style={{ background: META.SYR.color }} /> Government control{" "}
              <span>Approximate starting areas</span>
            </div>
            <div className="zoom">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.6, z / 1.3))}
              >
                <MinusIcon />
              </button>
              <button
                aria-label="Reset map"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <ResetIcon />
              </button>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(5, z * 1.3))}
              >
                <PlusIcon />
              </button>
              <button
                aria-label="Focus Syrian theatre"
                onClick={() => {
                  setGlobal(false);
                  setZoom(2.1);
                  const p = projection([37.8, 35])!;
                  setPan({ x: (600 - p[0]) * 2.1, y: (380 - p[1]) * 2.1 });
                }}
              >
                <TargetIcon />
              </button>
              <button
                aria-label="Toggle world overview"
                className={global ? "active" : ""}
                onClick={() => {
                  setGlobal(!global);
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <GlobeIcon />
              </button>
            </div>
          </div>
          {state?.guided && !state.defeated && tutorial < 5 && (
            <div className="tutorial">
              <span className="eyebrow">
                Field briefing · {tutorial + 1} / 5
              </span>
              <button
                className="close"
                aria-label="Dismiss tutorial"
                onClick={() => setTutorial(5)}
              >
                <Cross1Icon />
              </button>
              <h2>{tutorialSteps[tutorial].title}</h2>
              <p>{tutorialSteps[tutorial].text}</p>
              <button onClick={() => setTutorial(tutorial + 1)}>
                {tutorial === 4 ? "Finish briefing" : "Next"}
                <ChevronRightIcon />
              </button>
            </div>
          )}
          {state && journalOpen && (
            <section className="ticker">
              <button
                className="ticker-heading"
                onClick={() => setJournalOpen(false)}
              >
                LATEST DISPATCHES <MinusIcon />
              </button>
              {state.events.slice(0, 3).map((e, i) => (
                <div key={`${e.day}-${i}`}>
                  <time>{dateLabel(e.day).slice(0, 6)}</time>
                  <p>{e.text}</p>
                </div>
              ))}
            </section>
          )}
          {state && !journalOpen && (
            <button
              className="show-journal"
              onClick={() => setJournalOpen(true)}
            >
              Show dispatches
            </button>
          )}
        </main>
        <aside
          ref={panelRef}
          className="panel"
          aria-label="Country command panel"
        >
          {state && state.society ? (
            <CommandPanel
              s={state}
              map={map!}
              tab={tab}
              target={target}
              outside={outside}
              setTarget={(id) => {
                setTarget(id);
                setOutside(null);
              }}
              selected={selected}
              setTab={setTab}
              send={send}
              save={(exp) =>
                worker.current?.postMessage({ type: "save", export: exp })
              }
              load={() => {
                try {
                  const text = localStorage.getItem(SAVE);
                  if (text) worker.current?.postMessage({ type: "load", text });
                } catch {
                  notify("Storage unavailable.", true);
                }
              }}
              importFile={() => file.current?.click()}
              newGame={() => {
                changeSpeed(0);
                setPicker(true);
              }}
              hasSave={hasSave}
            />
          ) : (
            <div className="panel-heading">
              <span className="eyebrow">Country management</span>
              <h2>A society in motion</h2>
              <p>
                Click a country for diplomacy. Develop production, support
                households and navigate political reform.
              </p>
            </div>
          )}
        </aside>
      </div>
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`toast ${notice.error ? "error" : ""}`}
        >
          <span>{notice.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <Cross1Icon />
          </button>
        </div>
      )}
      {picker && (
        <div className="modal-backdrop">
          <section
            className="campaign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-title"
          >
            <div className="campaign-intro">
              <span className="eyebrow">Scenario 01 · 1 January 2012</span>
              <h1 id="campaign-title">
                A region at
                <br />a crossroads.
              </h1>
              <p>
                The Syrian uprising is becoming an armed conflict. Neighbouring
                governments face choices about access, support and intervention.
              </p>
              <p className="historical-note">
                Historical context. Alternate outcomes.
                <br />
                Statistics, force strengths and control pockets are gameplay
                approximations, not a reconstruction of January front lines.
              </p>
              <button className="text-button" onClick={() => setShowHelp(true)}>
                Read the scenario dossier <ChevronRightIcon />
              </button>
              <div className="campaign-coordinates">
                33°30′N &nbsp; 36°17′E
                <br />
                <span>SYRIAN THEATRE / 2012</span>
              </div>
            </div>
            <div className="campaign-choices">
              <span className="eyebrow">Select your government</span>
              {["TUR", "IRN", "SYR"].map((id) => (
                <button
                  key={id}
                  className={`country-choice ${choice === id ? "chosen" : ""}`}
                  onClick={() => setChoice(id)}
                  aria-pressed={choice === id}
                >
                  <span
                    className="country-code"
                    style={{ color: META[id].color }}
                  >
                    {id}
                  </span>
                  <span>
                    <strong>{name(id)}</strong>
                    <small>{META[id].blurb}</small>
                  </span>
                  <span className="radio">{choice === id && <span />}</span>
                </button>
              ))}
              <label className="guided">
                <input
                  type="checkbox"
                  checked={guided}
                  onChange={(e) => setGuided(e.target.checked)}
                />{" "}
                Guided briefing <span>Recommended for your first campaign</span>
              </label>
              <button className="begin" disabled={!map} onClick={() => start()}>
                {map ? "Begin campaign" : "Preparing map…"}
                <TriangleRightIcon />
              </button>
              <div className="resume-row">
                <button disabled={!map || !hasSave} onClick={() => start(true)}>
                  Continue saved game
                </button>
                <button disabled={!map} onClick={() => file.current?.click()}>
                  <UploadIcon /> Import save
                </button>
                {state && (
                  <button onClick={() => setPicker(false)}>Cancel</button>
                )}
              </div>
              <p className="desktop-note">
                Desktop browser · Space to pause · 1 / 2 / 3 for speed
                <br />
                No account or server required. Saves stay in your browser.
              </p>
            </div>
          </section>
        </div>
      )}
      {showHelp && (
        <div className="modal-backdrop help-backdrop">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <button
              className="close"
              aria-label="Close dossier"
              onClick={() => setShowHelp(false)}
            >
              <Cross1Icon />
            </button>
            <span className="eyebrow">Scenario dossier</span>
            <h2 id="help-title">Fault Lines / 2012</h2>
            <p>
              Lead a country through diplomatic crises and a regional conflict.
              A successful settlement counts as progress. The sandbox continues
              after your objectives are complete.
            </p>
            <h3>Command essentials</h3>
            <p>
              Click a foreign country for its dossier and diplomatic actions.
              Click your own state to choose a construction location. In
              Military fronts, choose advance, defend or standby; commanders
              deploy forces and conduct battles. Manage shortages in Market,
              queue production, and shape reforms and research under Politics.
            </p>
            <p>
              Open a diplomatic crisis to negotiate access or a ceasefire.
              Review the acceptance reasons, adjust compensation, and seek
              backing. Access crises can escalate after a three-day warning.
              Guarantees trigger equipment support rather than automatic
              worldwide war.
            </p>
            <p>
              Space pauses; 1–3 change speed. Next day advances a single paused
              day. Drag to pan and scroll to zoom. Save/export under Journal.
              Build in owned and controlled states under Production.
            </p>
            <h3>Historical scope and limitations</h3>
            <p>
              Starting date: 1 January 2012. Protests began in March 2011; the
              Arab League observer mission was active across the turn of 2012.
              Opposition is aggregated for gameplay. No later faction or
              historical outcome is forced.
            </p>
            <p>
              All military and economic numbers, control pockets and
              civilian-impact indices are abstractions. Administrative geography
              comes from contemporary Natural Earth data. Whole-area control is
              not a verified January 2012 front map. External powers supply
              guarantees and backing; they have no simulated global armies.
            </p>
            <h3>Sources</h3>
            <ul>
              <li>
                <a
                  href="https://dppa.dfs.un.org/en/mission/special-envoy-syria"
                  target="_blank"
                  rel="noreferrer"
                >
                  UN: Syria background
                </a>
              </li>
              <li>
                <a
                  href="https://digitallibrary.un.org/record/720513"
                  target="_blank"
                  rel="noreferrer"
                >
                  UN: Arab League observer report, December 2011–January 2012
                </a>
              </li>
              <li>
                <a
                  href="https://www.naturalearthdata.com/about/terms-of-use/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Natural Earth: public domain map data
                </a>
              </li>
            </ul>
            <button className="begin" onClick={() => setShowHelp(false)}>
              Return to command
            </button>
          </section>
        </div>
      )}
      {state?.defeated && !state.observer && (
        <div className="modal-backdrop">
          <section className="help-modal">
            <span className="eyebrow">Campaign result</span>
            <h2>Your government has fallen</h2>
            <p>
              {c?.stability === 0
                ? "Government stability reached zero."
                : c?.lostCapitalDays
                  ? `The capital was held by another actor for ${c.lostCapitalDays} days.`
                  : "No controlled territory remains."}{" "}
              Review the journal for the events that led here.
            </p>
            <Action onClick={() => send({ type: "observe" })}>
              Continue as observer
            </Action>
            <Action
              onClick={() => {
                setPicker(true);
              }}
            >
              Restore or start another campaign
            </Action>
          </section>
        </div>
      )}
    </div>
  );
}
function Resource({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub: string;
  title: string;
}) {
  return (
    <div className="resource" title={title}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  );
}
