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
  CheckIcon,
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
import {
  acceptance,
  atWar,
  relation,
  deserialize,
  type State,
  type Army,
  type Command,
} from "./engine";
type Tab = "overview" | "diplomacy" | "military" | "economy" | "journal";
const SAVE = "fault-lines-v1";
const num = (v: number) => Math.round(v).toLocaleString("en-GB");
const tabs: { id: Tab; label: string; icon: typeof GlobeIcon }[] = [
  { id: "overview", label: "Situation", icon: GlobeIcon },
  { id: "diplomacy", label: "Diplomacy", icon: ReaderIcon },
  { id: "military", label: "Armed forces", icon: TargetIcon },
  { id: "economy", label: "Economy", icon: BackpackIcon },
  { id: "journal", label: "Journal", icon: DashboardIcon },
];
function Meter({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <b>
          {num(value)}
          {detail ?? "%"}
        </b>
      </div>
      <span className="track">
        <span style={{ transform: `scaleX(${Math.min(1, value / 100)})` }} />
      </span>
    </div>
  );
}
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
    [armyId, setArmyId] = useState<string | null>(null),
    [target, setTarget] = useState("SYR"),
    [overlay, setOverlay] = useState("political"),
    [order, setOrder] = useState<"advance" | "move" | "front" | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [showHelp, setShowHelp] = useState(false),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [global, setGlobal] = useState(false),
    [offer, setOffer] = useState(65),
    [demand, setDemand] = useState("access"),
    [tutorial, setTutorial] = useState(0),
    [journalOpen, setJournalOpen] = useState(true),
    [hasSave, setHasSave] = useState(false);
  const worker = useRef<Worker | null>(null),
    stateRef = useRef<State | null>(null),
    file = useRef<HTMLInputElement>(null),
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
        setOrder(null);
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
    setSelected(null);
    setArmyId(null);
    setTab("overview");
    setTutorial(0);
    setOrder(null);
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
      setArmyId(null);
      setOrder(null);
      setTarget(s.player === "SYR" ? "OPP" : "SYR");
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), true);
    }
    if (file.current) file.current.value = "";
  };
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
  const c = state?.countries[state.player],
    province = selected ? state?.provinces[selected] : null,
    feature = selected ? featureById[selected] : null,
    army = state?.armies.find((a) => a.id === armyId);
  const ownArmies =
    state?.armies.filter((a) => a.country === state.player) ?? [];
  const crises =
    state?.crises.filter(
      (x) =>
        x.status === "negotiating" &&
        (x.from === state.player || x.to === state.player),
    ) ?? [];
  const selectProvince = (f: MapFeature) => {
    if (drag.current?.moved) return;
    setSelected(f.id);
    if (order && army) {
      send({ type: "order", army: army.id, province: f.id, stance: order });
      setOrder(null);
    } else if (state && f.properties.country !== state.player)
      setTarget(state.provinces[f.id].controller);
  };
  const focusArmy = (a: Army) => {
    setArmyId(a.id);
    setSelected(a.province);
    setTab("military");
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
      title: "Read your position",
      text: "Select a province on the map. Situation shows who owns it, who controls it and what can be built there.",
    },
    {
      title: "Make a proposal",
      text: "Open Diplomacy. Choose a target and an access or ceasefire proposal. Compensation and international backing change acceptance.",
    },
    {
      title: "Prepare an army",
      text: "Open Armed forces, select an army, then assign a border or objective. Orders require access or war; supply limits combat power.",
    },
    {
      title: "Fund the campaign",
      text: "Open Economy. Adjust spending or invest in an owned province. High taxes and mobilization have political costs.",
    },
    {
      title: "Observe the consequences",
      text: "Use Play or Next day to advance. Review the journal, negotiate a settlement, and save your campaign.",
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
                label="Fuel"
                value={num(c.fuel)}
                sub="stockpile"
                title="Movement and air missions consume fuel; sanctions reduce replenishment."
              />
              <Resource
                label="Equipment"
                value={num(c.equipment)}
                sub="stockpile"
                title="Defence allocation produces equipment. Reinforcement, combat and aid consume it."
              />
              <Resource
                label="Support"
                value={`${num(c.support)}%`}
                sub="domestic"
                title="Taxes, mobilization and conflict affect public support."
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
              onClick={() => setTab(t.id)}
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
                {order
                  ? "Select a province to issue your order"
                  : overlay === "political"
                    ? "Territorial control"
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
                    className={`province ${selected === f.id ? "selected" : ""}`}
                    tabIndex={global ? -1 : 0}
                    role="button"
                    aria-label={`${f.properties.name}, ${name(state?.provinces[f.id]?.controller ?? f.properties.country)}`}
                    onClick={() => selectProvince(f)}
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
                    ([id, m]) =>
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
                  state?.armies
                    .filter(
                      (a) => a.country === state.player || sVisible(state, a),
                    )
                    .map((a, i) => {
                      const p = projection(
                        featureById[a.province].properties.center,
                      )!;
                      const offset = (i % 2) * 8;
                      const end = a.objective
                        ? projection(featureById[a.objective].properties.center)
                        : null;
                      return (
                        <g key={a.id}>
                          {end && a.country === state.player && (
                            <path
                              d={`M${p[0]},${p[1]} Q${(p[0] + end[0]) / 2 + 12},${(p[1] + end[1]) / 2 - 12} ${end[0]},${end[1]}`}
                              className="order-line"
                              markerEnd="url(#arrow)"
                            />
                          )}
                          <g
                            className={`army-counter ${armyId === a.id ? "army-selected" : ""}`}
                            transform={`translate(${p[0] - 9 + offset},${p[1] - 5 + offset})`}
                            role="button"
                            tabIndex={0}
                            aria-label={`${a.name}${a.country === state.player ? "" : " estimated position"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!drag.current?.moved) {
                                if (a.country === state.player) focusArmy(a);
                                else {
                                  setSelected(a.province);
                                  setTarget(a.country);
                                  setTab("overview");
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                a.country === state.player
                              )
                                focusArmy(a);
                            }}
                          >
                            <rect
                              width="23"
                              height="15"
                              rx="1"
                              fill={
                                a.country === state.player
                                  ? "#243b3b"
                                  : "#654e40"
                              }
                              stroke={armyId === a.id ? "#f0dab0" : "#e0d6bc"}
                              strokeWidth="1"
                            />
                            <path
                              d="M4 3L18 12M18 3L4 12"
                              stroke="#dfdbca"
                              strokeWidth=".8"
                            />
                            <title>
                              {a.name} ·{" "}
                              {a.country === state.player
                                ? `${num(a.strength)} strength / ${num(a.supply)} supply`
                                : "Estimated location; strength uncertain"}
                            </title>
                          </g>
                        </g>
                      );
                    })}
              </g>
            </svg>
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
          {order && (
            <div className="order-banner">
              {order === "front"
                ? "Select a friendly border province"
                : order === "move"
                  ? "Select a province with legal military access"
                  : "Select an objective province"}
              <button onClick={() => setOrder(null)}>Cancel</button>
            </div>
          )}
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
        <aside className="panel" aria-label="Country command panel">
          {state && c ? (
            <>
              <div className="panel-heading">
                <span className="eyebrow">National command</span>
                <h2>{tabs.find((t) => t.id === tab)?.label}</h2>
                <span className={`status-dot ${speed ? "live" : ""}`}>
                  {speed ? "Simulation running" : "Orders while paused"}
                </span>
              </div>
              {tab === "overview" && (
                <>
                  <div className="section">
                    <span className="eyebrow">Strategic position</span>
                    <h3>{name(state.player)}</h3>
                    <p>{META[state.player].blurb}</p>
                    <Meter label="Government stability" value={c.stability} />
                    <Meter label="Public support" value={c.support} />
                    <Meter label="Legitimacy" value={c.legitimacy} />
                    <div className="stat-line">
                      <span>Regional escalation</span>
                      <b>{num(state.escalation)} / 100</b>
                    </div>
                    <p className="hint">
                      {state.escalation > 65
                        ? "High escalation signals a wider conflict. Review guarantees before intervening."
                        : "Guarantees, intervention and maritime pressure raise escalation."}
                    </p>
                  </div>
                  <div className="section">
                    <span className="eyebrow">Campaign objective</span>
                    <h3>
                      {state.player === "SYR"
                        ? "Stabilize the country"
                        : "Shape a sustainable settlement"}
                    </h3>
                    <p>
                      Secure an agreement, sustain your forces, and bring the
                      Syrian conflict to a ceasefire. You may continue
                      afterward.
                    </p>
                    {[
                      ["agreement", "Reach a diplomatic agreement"],
                      ["aid", "Deliver foreign aid"],
                      ["settlement", "Secure a ceasefire"],
                    ]
                      .filter(([id]) => state.player !== "SYR" || id !== "aid")
                      .map(([id, label]) => (
                        <div
                          className={`objective ${state.achievements.includes(id) ? "complete" : ""}`}
                          key={id}
                        >
                          {state.achievements.includes(id) ? (
                            <CheckIcon />
                          ) : (
                            <span className="objective-circle" />
                          )}
                          {label}
                        </div>
                      ))}
                    <Action onClick={() => setTab("diplomacy")}>
                      Open diplomacy <ChevronRightIcon />
                    </Action>
                  </div>
                  <div className="section">
                    <span className="eyebrow">Selected territory</span>
                    {province && feature ? (
                      <>
                        <h3>{feature.properties.name}</h3>
                        <div className="stat-line">
                          <span>Owner / controller</span>
                          <b>
                            {province.owner} / {province.controller}
                          </b>
                        </div>
                        <div className="stat-line">
                          <span>Terrain</span>
                          <b>{province.terrain}</b>
                        </div>
                        <div className="stat-line">
                          <span>Infrastructure / damage</span>
                          <b>
                            {num(province.infra)} / {num(province.damage)}
                          </b>
                        </div>
                        <div className="stat-line">
                          <span>Industry / depots</span>
                          <b>
                            {province.industry} / {province.depot}
                          </b>
                        </div>
                        <Action onClick={() => setTab("economy")}>
                          Manage investment
                        </Action>
                      </>
                    ) : (
                      <p>
                        Select a province to inspect its control, infrastructure
                        and industry.
                      </p>
                    )}
                  </div>
                  <div className="section">
                    <div className="stat-line">
                      <span>Civilian harm index</span>
                      <b>{state.harm.toFixed(1)}</b>
                    </div>
                    <div className="stat-line">
                      <span>Displacement index</span>
                      <b>{state.displaced.toFixed(1)}</b>
                    </div>
                    <p className="hint">
                      Abstract campaign indices, not historical casualty counts.
                      Fighting damages infrastructure and public support.
                    </p>
                  </div>
                </>
              )}
              {tab === "diplomacy" && (
                <>
                  <div className="section">
                    <label className="field">
                      Negotiation partner
                      <select
                        aria-label="Diplomatic target"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      >
                        {Object.keys(META)
                          .filter((id) => id !== state.player)
                          .map((id) => (
                            <option key={id} value={id}>
                              {name(id)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="stat-line">
                      <span>Relations</span>
                      <b>
                        {relation(state, state.player, target) > 0 ? "+" : ""}
                        {relation(state, state.player, target)}
                      </b>
                    </div>
                    <div className="stat-line">
                      <span>Status</span>
                      <b
                        className={
                          atWar(state, state.player, target) ? "danger" : ""
                        }
                      >
                        {atWar(state, state.player, target)
                          ? "At war"
                          : "At peace"}
                      </b>
                    </div>
                    <p className="hint">
                      Agreements use visible acceptance rules. A crisis expires
                      after 14 days unless settled or escalated.
                    </p>
                  </div>
                  {crises.map((cr) => {
                    const a = acceptance(state, cr);
                    return (
                      <div className="section crisis" key={cr.id}>
                        <span className="eyebrow">
                          Active crisis · {Math.max(0, cr.deadline - state.day)}{" "}
                          days left
                        </span>
                        <h3>
                          {name(cr.from)} → {name(cr.to)}
                        </h3>
                        <p>
                          Demand: {cr.demand} · Compensation: {cr.offer} credits
                        </p>
                        <div className="acceptance">
                          <span>Acceptance</span>
                          <b className={a.score >= 0 ? "success" : "danger"}>
                            {a.score >= 0 ? "+" : ""}
                            {a.score} ·{" "}
                            {a.score >= 0 ? "Will accept" : "Will refuse"}
                          </b>
                        </div>
                        {a.reasons.map((r) => (
                          <div className="reason" key={r.label}>
                            <span>{r.label}</span>
                            <b>
                              {r.value > 0 ? "+" : ""}
                              {r.value}
                            </b>
                          </div>
                        ))}
                        {cr.from === state.player && (
                          <>
                            <Action
                              onClick={() =>
                                send({ type: "offer", id: cr.id, offer })
                              }
                            >
                              Revise offer to {offer}
                            </Action>
                            <div className="button-pair">
                              <Action
                                onClick={() =>
                                  send({
                                    type: "backing",
                                    id: cr.id,
                                    to: "USA",
                                  })
                                }
                              >
                                Seek US backing
                              </Action>
                              <Action
                                onClick={() =>
                                  send({
                                    type: "backing",
                                    id: cr.id,
                                    to: "RUS",
                                  })
                                }
                              >
                                Seek Russian backing
                              </Action>
                            </div>
                          </>
                        )}
                        <Action
                          className="primary"
                          onClick={() =>
                            send({
                              type: "resolve",
                              id: cr.id,
                              action: "negotiate",
                            })
                          }
                        >
                          Conclude agreement
                        </Action>
                        <div className="button-pair">
                          <Action
                            onClick={() =>
                              send({
                                type: "resolve",
                                id: cr.id,
                                action: "backdown",
                              })
                            }
                          >
                            Back down
                          </Action>
                          {cr.from === state.player &&
                            cr.demand !== "ceasefire" && (
                              <Action
                                className="danger-button"
                                onClick={() =>
                                  send({
                                    type: "resolve",
                                    id: cr.id,
                                    action: "escalate",
                                  })
                                }
                              >
                                Escalate to war
                              </Action>
                            )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="section">
                    <h3>Open negotiations</h3>
                    <label className="field">
                      Demand
                      <select
                        aria-label="Crisis demand"
                        value={demand}
                        onChange={(e) => setDemand(e.target.value)}
                      >
                        <option value="access">Military access</option>
                        <option value="ceasefire">Ceasefire mediation</option>
                        <option value="withdrawal">
                          Withdraw from my territory
                        </option>
                      </select>
                    </label>
                    <label className="field">
                      Compensation · {offer} credits
                      <input
                        aria-label="Compensation"
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={offer}
                        onChange={(e) => setOffer(+e.target.value)}
                      />
                    </label>
                    <Action
                      className="primary"
                      disabled={crises.length > 0}
                      onClick={() =>
                        send({ type: "crisis", to: target, demand, offer })
                      }
                    >
                      Propose diplomatic crisis
                    </Action>
                  </div>
                  <div className="section">
                    <h3>Agreements & pressure</h3>
                    <div className="button-pair">
                      <Action
                        onClick={() => send({ type: "trade", to: target })}
                      >
                        Trade agreement · 10
                      </Action>
                      <Action
                        onClick={() => send({ type: "access", to: target })}
                      >
                        Request access · 10
                      </Action>
                      <Action onClick={() => send({ type: "aid", to: target })}>
                        Equipment aid · 20
                      </Action>
                      <Action
                        onClick={() => send({ type: "guarantee", to: target })}
                      >
                        Guarantee · 15
                      </Action>
                      <Action
                        onClick={() => send({ type: "sanction", to: target })}
                      >
                        Sanctions · 15
                      </Action>
                      <Action
                        onClick={() => send({ type: "blockade", to: target })}
                      >
                        Maritime pressure · 15
                      </Action>
                    </div>
                    <p className="hint">
                      Credits are game units. Aid also costs equipment and takes
                      5 days. Pressure and guarantees have daily upkeep.
                    </p>
                  </div>
                  <div className="section">
                    <h3>Active commitments</h3>
                    {state.treaties
                      .filter(
                        (t) => t.a === state.player || t.b === state.player,
                      )
                      .map((t, i) => (
                        <div className="commitment" key={i}>
                          <span>
                            {t.kind === "blockade"
                              ? "Maritime pressure"
                              : t.kind}
                            <small>
                              {name(t.a)} → {name(t.b)}
                            </small>
                          </span>
                          <b>
                            {t.until > 9999
                              ? "Standing"
                              : `${t.until - state.day}d`}
                          </b>
                        </div>
                      ))}
                    {state.aid
                      .filter(
                        (a) => a.from === state.player || a.to === state.player,
                      )
                      .map((a, i) => (
                        <p key={i}>
                          Aid convoy → {name(a.to)} · {a.days} days
                        </p>
                      ))}
                  </div>
                </>
              )}
              {tab === "military" && (
                <>
                  <div className="section">
                    <h3>Army command</h3>
                    <p>
                      Select a formation. Assign an objective or move it through
                      friendly territory. Attacks require war; foreign movement
                      requires access.
                    </p>
                    <div className="army-list">
                      {ownArmies.length ? (
                        ownArmies.map((a) => (
                          <button
                            className={armyId === a.id ? "active" : ""}
                            onClick={() => focusArmy(a)}
                            key={a.id}
                          >
                            <span>
                              <TargetIcon />
                              {a.name}
                            </span>
                            <small>
                              {featureById[a.province]?.properties.name} ·{" "}
                              {num(a.supply)}% supply
                            </small>
                          </button>
                        ))
                      ) : (
                        <p>No formations remain.</p>
                      )}
                    </div>
                  </div>
                  {army && army.country === state.player && (
                    <div className="section">
                      <span className="eyebrow">Selected formation</span>
                      <h3>{army.name}</h3>
                      <Meter label="Strength" value={army.strength} />
                      <Meter label="Organization" value={army.org} />
                      <Meter label="Supply" value={army.supply} />
                      <div className="stat-line">
                        <span>Order</span>
                        <b>{army.stance}</b>
                      </div>
                      {army.objective && (
                        <p className="hint">
                          Objective:{" "}
                          {featureById[army.objective]?.properties.name}
                        </p>
                      )}
                      <div className="button-pair">
                        <Action
                          className="primary"
                          onClick={() => {
                            setOrder("advance");
                            setTutorial(5);
                          }}
                        >
                          Set objective
                        </Action>
                        <Action
                          onClick={() => {
                            setOrder("front");
                            setTutorial(5);
                          }}
                        >
                          Assign border
                        </Action>
                        <Action
                          onClick={() => {
                            setOrder("move");
                            setTutorial(5);
                          }}
                        >
                          Move
                        </Action>
                        <Action
                          onClick={() =>
                            send({
                              type: "order",
                              army: army.id,
                              stance: "hold",
                            })
                          }
                        >
                          Halt
                        </Action>
                      </div>
                      <p className="hint">
                        Border assignment deploys to a friendly border, then
                        attacks an adjacent enemy if at war. Objectives route
                        automatically. Isolated forces lose organization.
                      </p>
                    </div>
                  )}
                  <div className="section">
                    <h3>Air operations</h3>
                    <label className="field">
                      Regional mission
                      <select
                        aria-label="Air mission"
                        value={c.air}
                        onChange={(e) =>
                          send({
                            type: "policy",
                            key: "air",
                            value: e.target.value,
                          })
                        }
                      >
                        <option value="standby">Standby · preserve fuel</option>
                        <option value="recon">
                          Reconnaissance · reveal estimates
                        </option>
                        <option value="support">
                          Ground support · combat bonus
                        </option>
                      </select>
                    </label>
                    <p className="hint">
                      Active missions consume 0.35 fuel/day. Support adds 18%
                      attacking power when fuel is available. Recon expands
                      visible enemy positions.
                    </p>
                    <Action
                      onClick={() =>
                        send({
                          type: "policy",
                          key: "mobilized",
                          value: !c.mobilized,
                        })
                      }
                    >
                      {c.mobilized ? "Demobilize" : "Mobilize reserves"}
                    </Action>
                    <p className="hint">
                      Mobilization increases reinforcement and costs 1.2
                      credits/day, civilian goods and public support.
                    </p>
                  </div>
                </>
              )}
              {tab === "economy" && (
                <>
                  <div className="section">
                    <h3>National accounts</h3>
                    <div className="stat-line">
                      <span>Daily revenue</span>
                      <b className="success">+{c.income.toFixed(2)}</b>
                    </div>
                    <div className="stat-line">
                      <span>Daily spending</span>
                      <b>−{c.expense.toFixed(2)}</b>
                    </div>
                    <div className="stat-line">
                      <span>Public debt</span>
                      <b>{num(c.debt)}</b>
                    </div>
                    <label className="field">
                      Tax effort · {c.tax}%
                      <input
                        type="range"
                        aria-label="Tax effort"
                        min="10"
                        max="70"
                        step="5"
                        value={c.tax}
                        onChange={(e) =>
                          send({
                            type: "policy",
                            key: "tax",
                            value: +e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Defence allocation · {c.defence}%
                      <input
                        type="range"
                        aria-label="Defence allocation"
                        min="10"
                        max="70"
                        step="5"
                        value={c.defence}
                        onChange={(e) =>
                          send({
                            type: "policy",
                            key: "defence",
                            value: +e.target.value,
                          })
                        }
                      />
                    </label>
                    <p className="hint">
                      Taxes above 40 reduce support. Defence creates equipment
                      and competes with civilian goods. Deficits become
                      interest-bearing debt.
                    </p>
                    <Meter
                      label="Energy stock"
                      value={c.energy}
                      detail=" units"
                    />
                    <Meter
                      label="Civilian goods"
                      value={c.goods}
                      detail=" units"
                    />
                  </div>
                  <div className="section">
                    <h3>Provincial investment</h3>
                    {province && feature ? (
                      <>
                        <p>{feature.properties.name}</p>
                        <div className="stat-line">
                          <span>Industry / infrastructure</span>
                          <b>
                            {province.industry} / {num(province.infra)}
                          </b>
                        </div>
                        {province.project ? (
                          <p className="construction">
                            {province.project.kind} · {province.project.days}{" "}
                            days remaining
                          </p>
                        ) : (
                          <>
                            <Action
                              disabled={
                                province.owner !== state.player ||
                                province.controller !== state.player
                              }
                              onClick={() =>
                                send({
                                  type: "build",
                                  province: selected,
                                  kind: "industry",
                                })
                              }
                            >
                              Expand civilian industry · 35 / 25d
                            </Action>
                            <Action
                              disabled={
                                province.owner !== state.player ||
                                province.controller !== state.player
                              }
                              onClick={() =>
                                send({
                                  type: "build",
                                  province: selected,
                                  kind: "depot",
                                })
                              }
                            >
                              Improve supply depot · 20 / 15d
                            </Action>
                            <Action
                              disabled={
                                province.owner !== state.player ||
                                province.controller !== state.player
                              }
                              onClick={() =>
                                send({
                                  type: "build",
                                  province: selected,
                                  kind: "equipment",
                                })
                              }
                            >
                              Equipment production run · 25 / 15d
                            </Action>
                          </>
                        )}
                      </>
                    ) : (
                      <p>Select an owned province on the map to invest.</p>
                    )}
                  </div>
                </>
              )}
              {tab === "journal" && (
                <>
                  <div className="section">
                    <h3>Campaign record</h3>
                    <p>
                      Day {state.day} · {state.commands} issued commands
                    </p>
                    <div className="button-pair">
                      <Action
                        onClick={() =>
                          worker.current?.postMessage({ type: "save" })
                        }
                      >
                        Save locally
                      </Action>
                      <Action
                        onClick={() =>
                          worker.current?.postMessage({
                            type: "save",
                            export: true,
                          })
                        }
                      >
                        Export JSON
                      </Action>
                      <Action onClick={() => file.current?.click()}>
                        Import JSON
                      </Action>
                      <Action
                        disabled={!hasSave}
                        onClick={() => {
                          try {
                            const text = localStorage.getItem(SAVE);
                            if (text)
                              worker.current?.postMessage({
                                type: "load",
                                text,
                              });
                          } catch {
                            notify("Storage unavailable.", true);
                          }
                        }}
                      >
                        Load local save
                      </Action>
                    </div>
                    <p className="hint">
                      Autosave every 10 days. Import validates the map,
                      references and numerical state before replacing the
                      campaign.
                    </p>
                    <Action
                      onClick={() => {
                        changeSpeed(0);
                        setPicker(true);
                      }}
                    >
                      New campaign…
                    </Action>
                  </div>
                  <div className="section">
                    <h3>Dispatch archive</h3>
                    {state.events.map((e, i) => (
                      <article className="journal-entry" key={i}>
                        <span className="eyebrow">
                          {dateLabel(e.day)} · {e.kind}
                        </span>
                        <p>{e.text}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="panel-heading">
              <span className="eyebrow">Campaign briefing</span>
              <h2>The balance of power</h2>
              <p>
                Diplomacy, resources and force share the same map. Choose a
                government to begin.
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
              Select provinces to inspect them. Choose an army in Armed forces,
              then assign an objective on the map. Access permits peaceful
              movement; war permits attacks. Supply comes from the capital,
              operational ports and connected access routes. Depots improve
              local capacity.
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
              Build in owned and controlled provinces under Economy.
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
function sVisible(s: State, a: Army) {
  return (
    a.country === "SYR" ||
    a.country === "OPP" ||
    s.countries[s.player].air === "recon"
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
