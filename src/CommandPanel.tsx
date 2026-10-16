import { LawPanel } from "./LawPanel";
import { useState, useEffect } from "react";
import {
  ChevronRightIcon,
  CheckIcon,
  ArrowUpIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";
import { META, name, dateLabel, type MapData } from "./scenario";
import {
  DEMANDS,
  settlementLeverage,
  acceptance,
  atWar,
  relation,
  aidRoute,
  treaty,
  crisisPhase,
  frontSummary,
  type State,
  type Command,
  type Crisis,
} from "./engine";
import {
  GOODS,
  BUILDINGS,
  GROUPS,
  LAWS,
  TECH,
  society,
  lawSupport,
  capacity,
  influence,
  eligible,
  type Good,
  type Group,
  type Law,
  type Tech,
} from "./society";
export type PanelTab =
  | "overview"
  | "diplomacy"
  | "military"
  | "economy"
  | "market"
  | "politics"
  | "journal";
const num = (v: number) => Math.round(v).toLocaleString("en-GB");
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="stat-line">
      <span>
        {label}
        {detail && <small>{detail}</small>}
      </span>
      <b>{value}</b>
    </div>
  );
}
function Btn({
  children,
  onClick,
  why,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  why?: string | null;
  primary?: boolean;
}) {
  return (
    <div className="explained-action">
      <button
        className={`action ${primary ? "primary" : ""}`}
        disabled={!!why}
        onClick={onClick}
        title={why ?? undefined}
      >
        {children}
      </button>
      {why && <small>{why}</small>}
    </div>
  );
}
function Spark({ values }: { values: number[] }) {
  if (values.length < 2)
    return (
      <p className="hint">Weekly history appears as the campaign advances.</p>
    );
  const low = Math.min(...values) * 0.95,
    high = Math.max(...values) * 1.05;
  return (
    <svg
      className="sparkline"
      viewBox="0 0 260 42"
      role="img"
      aria-label="Weekly trend"
    >
      <path
        d={values
          .map(
            (v, i) =>
              `${i ? "L" : "M"}${(i / (values.length - 1)) * 260},${38 - ((v - low) / (high - low || 1)) * 33}`,
          )
          .join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
export default function CommandPanel({
  s,
  map,
  tab,
  target,
  setTarget,
  selected,
  setTab,
  send,
  save,
  load,
  importFile,
  newGame,
  hasSave,
  outside,
}: {
  s: State;
  map: MapData;
  tab: PanelTab;
  target: string;
  setTarget: (id: string) => void;
  selected: string | null;
  setTab: (tab: PanelTab) => void;
  send: (c: Command) => void;
  save: (exp?: boolean) => void;
  load: () => void;
  importFile: () => void;
  newGame: () => void;
  hasSave: boolean;
  outside?: string | null;
} & { send: (c: Command) => void }) {
  // Components keep only UI drafts; all accepted changes go through the worker.

  const [good, setGood] = useState<Good>("energy"),
    [partner, setPartner] = useState("IRN"),
    [direction, setDirection] = useState("import"),
    [location, setLocation] = useState(""),
    [coalition, setCoalition] = useState<Group[] | null>(null);
  useEffect(() => {
    setLocation(selected ?? "");
  }, [selected]);
  const tradePartner =
    partner === s.player ? (s.player === "IRN" ? "TUR" : "IRN") : partner;
  const c = s.countries[s.player],
    n = society(s),
    other = s.countries[target],
    foreign = tab === "diplomacy",
    p = selected ? s.provinces[selected] : null,
    feat = map.features.find((f) => f.id === selected);
  const own = map.features.filter(
    (f) =>
      s.provinces[f.id].owner === s.player &&
      s.provinces[f.id].controller === s.player,
  );
  const province =
    location && own.some((f) => f.id === location)
      ? location
      : p?.owner === s.player && p.controller === s.player
        ? selected!
        : c.capital;
  const crises = s.crises.filter(
    (cr) =>
      ["negotiating", "war"].includes(cr.status) &&
      [cr.from, cr.to].includes(s.player),
  );
  const titles = {
    overview: "National overview",
    diplomacy: "Country diplomacy",
    military: "Military fronts",
    economy: "Production & construction",
    market: "National market",
    politics: "Politics & research",
    journal: "Journal & saves",
  };
  return (
    <>
      <div className="panel-heading">
        <span className="eyebrow">
          {foreign ? "Foreign affairs" : "National management"}
        </span>
        <h2>{foreign ? (outside ?? name(target)) : titles[tab]}</h2>
        <p className="panel-subtitle">
          {foreign
            ? "Country dossier & available interactions"
            : `${name(s.player)} · ${dateLabel(s.day)}`}
        </p>
      </div>
      {foreign && outside ? (
        <div className="section">
          <p>
            This country is visible on the global atlas but is outside this
            regional campaign. Select a Middle Eastern country, Russia or the
            United States to interact.
          </p>
          <Btn
            onClick={() => {
              setTarget("SYR");
            }}
          >
            Inspect Syria
          </Btn>
        </div>
      ) : null}
      {foreign && !outside && other && (
        <>
          <div className="section country-dossier">
            <div className="dossier-identity">
              <span style={{ color: META[target]?.color }}>{target}</span>
              <div>
                <h3>{name(target)}</h3>
                <p>
                  {target === s.player
                    ? "Your country"
                    : atWar(s, s.player, target)
                      ? "At war with your government"
                      : relation(s, s.player, target) > 15
                        ? "Cooperative attitude"
                        : relation(s, s.player, target) < -10
                          ? "Wary attitude"
                          : "Neutral attitude"}
                </p>
              </div>
            </div>
            <div className="dossier-stats">
              <Stat
                label="Relations"
                value={`${relation(s, s.player, target) > 0 ? "+" : ""}${num(relation(s, s.player, target))}`}
              />
              <Stat
                label="Living standard"
                value={society(s, target).living.toFixed(1)}
              />
              <Stat
                label="Economic output"
                value={num(society(s, target).gdp)}
              />
              <Stat
                label="Government support"
                value={`${num(other.support)}%`}
              />
            </div>
            <p className="hint">
              Click any country to open its dossier. Borders highlight the
              selected country; select one of your states to manage its
              production.
            </p>
            {target !== s.player && (
              <>
                <div className="button-pair">
                  <Btn
                    onClick={() => send({ type: "improve", to: target })}
                    why={eligible(s, s.player, "improve", target)}
                  >
                    Improve relations · 5
                  </Btn>
                  <Btn
                    onClick={() => send({ type: "rival", to: target })}
                    why={eligible(s, s.player, "rival", target)}
                  >
                    Declare rivalry · 5
                  </Btn>
                </div>
                {n.missions[target] && (
                  <>
                    <p className="hint">
                      Active mission: {n.missions[target]}. Relations change by
                      0.4/day; 12 influence reserved.
                    </p>
                    <Btn
                      onClick={() => send({ type: "stop_mission", to: target })}
                    >
                      Recall diplomats
                    </Btn>
                  </>
                )}
              </>
            )}
          </div>
          {target !== s.player && (
            <>
              <PlayBuilder s={s} target={target} send={send} crises={crises} />
              <div className="section">
                <h3>Cooperate or apply pressure</h3>
                <div className="diplomatic-actions">
                  {(
                    [
                      "trade",
                      "access",
                      "aid",
                      "guarantee",
                      "sanction",
                      "blockade",
                    ] as const
                  ).map((type) => {
                    const cost =
                      type === "trade" || type === "access"
                        ? 10
                        : type === "aid"
                          ? 20
                          : 15;
                    const label = {
                      trade: "Trade agreement",
                      access: "Military access",
                      aid: "Equipment aid",
                      guarantee: "Guarantee independence",
                      sanction: "Impose sanctions",
                      blockade: "Maritime pressure",
                    }[type];
                    const why =
                      c.treasury < cost
                        ? `Requires ${cost} credits.`
                        : type === "aid"
                          ? c.equipment < 20
                            ? "Requires 20 equipment."
                            : !aidRoute(s, map, s.player, target)
                              ? "No open land or port route."
                              : null
                          : treaty(s, s.player, target, type)
                            ? "Already active."
                            : (type === "access" || type === "trade") &&
                                (atWar(s, s.player, target) ||
                                  relation(s, s.player, target) < 10)
                              ? "Needs peace and relations of +10."
                              : type === "blockade" && !c.port
                                ? "Requires an operational port."
                                : null;
                    return (
                      <Btn
                        key={type}
                        onClick={() => send({ type, to: target })}
                        why={why}
                      >
                        {label}
                        <span>{cost} credits</span>
                      </Btn>
                    );
                  })}
                </div>
              </div>
              <div className="section">
                <h3>Trade with {name(target)}</h3>
                <p>
                  Open the market to choose a good and direction. Importing a
                  partner’s surplus can lower domestic prices.
                </p>
                <Btn
                  onClick={() => {
                    setPartner(target);
                    setTab("market");
                  }}
                >
                  Manage trade routes <ChevronRightIcon />
                </Btn>
              </div>
            </>
          )}
          <div className="section">
            <h3>Diplomatic commitments</h3>
            {s.treaties
              .filter((t) => t.a === target || t.b === target)
              .map((t, i) => (
                <div className="commitment" key={i}>
                  <span>
                    {t.kind === "blockade" ? "Maritime pressure" : t.kind}
                    <small>
                      {name(t.a)} → {name(t.b)}
                    </small>
                  </span>
                  <b>{t.until > 9999 ? "Standing" : `${t.until - s.day}d`}</b>
                </div>
              ))}
            {n.obligations.includes(target) && (
              <p className="hint">
                You owe this country an obligation (8 influence reserved).
              </p>
            )}
          </div>
        </>
      )}
      {tab === "overview" && (
        <>
          <div className="section national-summary">
            <span className="eyebrow">Your society</span>
            <div className="hero-indicator">
              <b>{n.living.toFixed(1)}</b>
              <span>
                Standard of living
                <small>
                  {n.living < 12
                    ? "Struggling"
                    : n.living < 16
                      ? "Modest"
                      : "Prosperous"}{" "}
                  · wage and consumption index
                </small>
              </span>
            </div>
            <Spark values={n.history.map((h) => h.living)} />
            <div className="dossier-stats">
              <Stat label="Economic output" value={num(n.gdp)} />
              <Stat label="Employment" value={`${num(n.employment)}%`} />
              <Stat label="Radicals" value={`${num(n.radicals)}%`} />
              <Stat label="Legitimacy" value={`${num(c.legitimacy)}%`} />
            </div>
          </div>
          <div className="section">
            <span className="eyebrow">What needs attention</span>
            <h3>Decisions with consequences</h3>
            {n.decision && (
              <Btn primary onClick={() => setTab("politics")}>
                {n.decision.title}
                <ChevronRightIcon />
              </Btn>
            )}
            {crises.length > 0 && (
              <Btn
                primary
                onClick={() => {
                  setTarget(
                    crises[0].from === s.player ? crises[0].to : crises[0].from,
                  );
                  setTab("diplomacy");
                }}
              >
                Resolve diplomatic play · {crises[0].deadline - s.day}d left
              </Btn>
            )}
            {(Object.keys(GOODS) as Good[])
              .filter((g) => n.market[g].price / GOODS[g].base > 1.12)
              .map((g) => (
                <Btn
                  key={g}
                  onClick={() => {
                    setGood(g);
                    setTab("market");
                  }}
                >
                  {GOODS[g].name} is expensive{" "}
                  <span>
                    +{num((n.market[g].price / GOODS[g].base - 1) * 100)}%
                  </span>
                </Btn>
              ))}
            {!n.research.topic && n.research.completed.length < 3 && (
              <Btn onClick={() => setTab("politics")}>
                Choose a research priority
              </Btn>
            )}
            {!n.queue.length && (
              <Btn onClick={() => setTab("economy")}>
                Put construction capacity to work
              </Btn>
            )}
            <p className="hint">
              Prices, laws and diplomatic commitments affect households,
              production and the budget. There is no mandatory conquest
              objective.
            </p>
          </div>
          <div className="section">
            <h3>{feat ? feat.properties.name : "Inspect a state"}</h3>
            {p ? (
              <>
                <Stat
                  label="Owner / controller"
                  value={`${p.owner} / ${p.controller}`}
                />
                <Stat
                  label="Industry / infrastructure"
                  value={`${p.industry} / ${num(p.infra)}`}
                />
                <Stat label="Damage" value={`${num(p.damage)}%`} />
                <Btn onClick={() => setTab("economy")}>
                  Open state construction
                </Btn>
              </>
            ) : (
              <p>
                Click one of your states to inspect it. Click another country
                for diplomacy.
              </p>
            )}
          </div>
          <div className="section">
            <h3>Foreign affairs</h3>
            <Stat label="Free influence" value={`${influence(n)} / 60`} />
            <Stat label="Infamy" value={num(n.infamy)} />
            <Stat
              label="Regional escalation"
              value={`${num(s.escalation)} / 100`}
            />
            <p className="hint">
              Relations missions and obligations reserve influence. Starting
              wars creates infamy. State values are game indices, not historical
              statistics.
            </p>
          </div>
        </>
      )}
      {tab === "military" && (
        <>
          <div className="section">
            <h3>Command the strategy</h3>
            <p>
              Commanders deploy forces and conduct battles. Choose a stance for
              each war; no province orders are needed.
            </p>
            <Btn
              onClick={() =>
                send({ type: "policy", key: "mobilized", value: !c.mobilized })
              }
            >
              {c.mobilized ? "Demobilize reserves" : "Mobilize reserves"}
              <span>{c.mobilized ? "Active" : "1.2 credits/day"}</span>
            </Btn>
            <p className="hint">
              Mobilization doubles reinforcement but reduces civilian employment
              and costs public support.
            </p>
          </div>
          {s.wars
            .filter((w) => w.includes(s.player))
            .map((w) => {
              const enemy = w.find((id) => id !== s.player)!;
              const f = frontSummary(s, s.player, enemy);
              return (
                <div className="section front-card" key={enemy}>
                  <span className="eyebrow">Active theatre</span>
                  <h3>
                    {name(s.player)} — {name(enemy)}
                  </h3>
                  <Stat label="Your effective strength" value={num(f.forces)} />
                  <Stat
                    label="Enemy strength estimate"
                    value={`${Math.floor(f.enemy / 25) * 25}–${Math.ceil(f.enemy / 25) * 25}`}
                  />
                  <Stat
                    label="Readiness / supply"
                    value={`${num(f.readiness)}% / ${num(f.supply)}%`}
                  />
                  <div
                    className="stance-control"
                    aria-label={`Front stance against ${name(enemy)}`}
                  >
                    {(["advance", "defend", "standby"] as const).map(
                      (stance) => (
                        <button
                          key={stance}
                          aria-pressed={f.posture === stance}
                          className={f.posture === stance ? "active" : ""}
                          onClick={() =>
                            send({
                              type: "posture",
                              to: enemy,
                              posture: stance,
                            })
                          }
                        >
                          {stance === "advance"
                            ? "Advance"
                            : stance === "defend"
                              ? "Defend"
                              : "Stand by"}
                        </button>
                      ),
                    )}
                  </div>
                  <p className="hint">
                    {f.posture === "advance"
                      ? "Commanders seek reachable enemy territory. Low readiness pauses offensives."
                      : f.posture === "defend"
                        ? "Forces deploy to friendly borders and defend without initiating attacks."
                        : "Forces halt offensive deployments to reorganize."}
                  </p>
                  <Btn
                    onClick={() => {
                      setTarget(enemy);
                      setTab("diplomacy");
                    }}
                  >
                    Negotiate an end to the war
                  </Btn>
                </div>
              );
            })}
          {!s.wars.some((w) => w.includes(s.player)) && (
            <div className="section">
              <h3>No active fronts</h3>
              <p>
                Your country is at peace. Use diplomacy to negotiate access,
                offer aid, or exert pressure. Military spending still affects
                readiness and the economy.
              </p>
            </div>
          )}
          <div className="section">
            <h3>Air & supply policy</h3>
            <label className="field">
              Air mission
              <select
                aria-label="Air mission"
                value={c.air}
                onChange={(e) =>
                  send({ type: "policy", key: "air", value: e.target.value })
                }
              >
                <option value="standby">Standby · preserve fuel</option>
                <option value="recon">Reconnaissance</option>
                <option value="support">Ground support</option>
              </select>
            </label>
            <Stat
              label="Fuel / equipment"
              value={`${num(c.fuel)} / ${num(c.equipment)}`}
            />
            <Stat
              label="Civilian harm / displacement"
              value={`${s.harm.toFixed(1)} / ${s.displaced.toFixed(1)}`}
            />
            <p className="hint">
              Civilian-impact indices reflect fighting and infrastructure
              damage; they are not casualty counts.
            </p>
          </div>
        </>
      )}
      {tab === "market" && (
        <>
          <div className="section">
            <h3>Supply, demand & prices</h3>
            <p>
              Production creates supply; households and defence create demand.
              Trade moves an exporter’s actual surplus into a partner’s
              shortage.
            </p>
            <table className="market-table">
              <thead>
                <tr>
                  <th>Good</th>
                  <th>Supply</th>
                  <th>Demand</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(GOODS) as Good[]).map((g) => (
                  <tr
                    key={g}
                    className={good === g ? "selected-row" : ""}
                    onClick={() => setGood(g)}
                  >
                    <th>
                      <button onClick={() => setGood(g)}>
                        {GOODS[g].name}
                      </button>
                    </th>
                    <td>{num(n.market[g].supply)}</td>
                    <td>{num(n.market[g].demand)}</td>
                    <td
                      className={
                        n.market[g].price > GOODS[g].base * 1.1
                          ? "danger"
                          : "success"
                      }
                    >
                      {n.market[g].price.toFixed(1)}
                      <small>
                        {num((n.market[g].price / GOODS[g].base - 1) * 100)}%
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              Prices are game credits per unit. The percentage compares with the
              good’s reference price.
            </p>
            <Btn onClick={() => setTab("economy")}>
              Build more domestic production
            </Btn>
          </div>
          <div className="section">
            <h3>Establish a trade route</h3>
            <label className="field">
              Good
              <select
                aria-label="Trade good"
                value={good}
                onChange={(e) => setGood(e.target.value as Good)}
              >
                {Object.entries(GOODS).map(([id, g]) => (
                  <option value={id} key={id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Partner
              <select
                aria-label="Trade partner"
                value={tradePartner}
                onChange={(e) => setPartner(e.target.value)}
              >
                {Object.keys(META)
                  .filter((id) => id !== s.player)
                  .map((id) => (
                    <option key={id} value={id}>
                      {name(id)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Direction
              <select
                aria-label="Trade direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="import">Import into my market</option>
                <option value="export">Export to partner</option>
              </select>
            </label>
            <Stat
              label="Partner price"
              value={
                society(s, tradePartner)?.market[good].price.toFixed(1) ?? "—"
              }
            />
            <Btn
              primary
              why={
                c.treasury < 10
                  ? "Requires 10 credits."
                  : capacity(n) < 6
                    ? "Requires 6 bureaucracy."
                    : null
              }
              onClick={() =>
                send({ type: "trade_route", to: tradePartner, good, direction })
              }
            >
              Open route · 10 credits
            </Btn>
            <p className="hint">
              Routes require a shared border or unblocked ports. War and
              embargoes suspend trade; unprofitable routes may carry no goods.
            </p>
          </div>
          <div className="section">
            <h3>Active routes</h3>
            {!n.routes.length && (
              <p>
                No routes yet. Start with a good whose price is above its
                reference.
              </p>
            )}
            {n.routes.map((r) => (
              <div className="route-row" key={r.id}>
                <div>
                  <b>
                    {GOODS[r.good].name} · {r.direction}
                  </b>
                  <small>
                    {name(r.partner)} ·{" "}
                    {r.active
                      ? `${r.volume.toFixed(1)} units/day`
                      : "Suspended"}
                  </small>
                </div>
                <button
                  aria-label={`Close ${GOODS[r.good].name} route`}
                  onClick={() => send({ type: "close_route", id: r.id })}
                >
                  <Cross1Icon />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "economy" && (
        <>
          <div className="section">
            <h3>Budget & priorities</h3>
            <Stat
              label="Revenue / spending"
              value={`${c.income.toFixed(1)} / ${c.expense.toFixed(1)}`}
            />
            <Stat
              label="Treasury / debt"
              value={`${num(c.treasury)} / ${num(c.debt)}`}
            />
            <label className="field">
              Tax effort · {c.tax}%
              <input
                aria-label="Tax effort"
                type="range"
                min="10"
                max="70"
                step="5"
                value={c.tax}
                onChange={(e) =>
                  send({ type: "policy", key: "tax", value: +e.target.value })
                }
              />
            </label>
            <label className="field">
              Defence allocation · {c.defence}%
              <input
                aria-label="Defence allocation"
                type="range"
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
              High taxes reduce purchasing power and public support. Defence
              competes with civilian production.
            </p>
          </div>
          <div className="section">
            <h3>
              Construction queue{" "}
              <span className="count">{n.queue.length} / 6</span>
            </h3>
            <p className="hint">
              Projects are paid when queued. National capacity builds one
              project at a time; prioritize to change its order.
            </p>
            {!n.queue.length && (
              <p>No projects. Choose a state and add a facility below.</p>
            )}
            {n.queue.map((q, i) => (
              <div className="queue-item" key={q.id}>
                <div>
                  <span className="eyebrow">
                    {i === 0 ? "Under construction" : `Queued · ${i + 1}`}
                  </span>
                  <b>{BUILDINGS[q.kind].name}</b>
                  <small>
                    {
                      map.features.find((f) => f.id === q.province)?.properties
                        .name
                    }{" "}
                    · {Math.ceil(q.remaining)} days remaining
                  </small>
                  <span className="track">
                    <span
                      style={{
                        transform: `scaleX(${1 - q.remaining / q.total})`,
                      }}
                    />
                  </span>
                </div>
                <div>
                  {i > 0 && (
                    <button
                      aria-label={`Prioritize ${BUILDINGS[q.kind].name}`}
                      onClick={() => send({ type: "prioritize", id: q.id })}
                    >
                      <ArrowUpIcon />
                    </button>
                  )}
                  <button
                    aria-label={`Cancel ${BUILDINGS[q.kind].name}`}
                    onClick={() =>
                      send({ type: "cancel_construction", id: q.id })
                    }
                  >
                    <Cross1Icon />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="section">
            <h3>Develop a state</h3>
            <label className="field">
              Construction location
              <select
                aria-label="Construction state"
                value={province}
                onChange={(e) => setLocation(e.target.value)}
              >
                {own.map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.properties.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              Clicking an owned state selects it here. New production lowers
              shortages and creates jobs.
            </p>
            {Object.entries(BUILDINGS).map(([id, b]) => (
              <Btn
                key={id}
                why={
                  c.treasury < b.cost
                    ? `Requires ${b.cost} credits.`
                    : n.queue.length >= 6
                      ? "Queue is full."
                      : null
                }
                onClick={() => send({ type: "construct", kind: id, province })}
              >
                {b.name}
                <span>
                  {b.cost} · {b.days}d
                </span>
              </Btn>
            ))}
          </div>
          <div className="section">
            <h3>Production methods</h3>
            {!n.buildings.length && (
              <p>Complete a facility to manage its production method.</p>
            )}
            {n.buildings.map((b) => (
              <div className="building-row" key={b.id}>
                <b>{BUILDINGS[b.kind].name}</b>
                <small>
                  {
                    map.features.find((f) => f.id === b.province)?.properties
                      .name
                  }
                </small>
                {BUILDINGS[b.kind].output && (
                  <label className="field">
                    Method
                    <select
                      aria-label={`Production method ${b.id}`}
                      value={b.method}
                      onChange={(e) =>
                        send({
                          type: "production",
                          id: b.id,
                          method: e.target.value,
                        })
                      }
                    >
                      <option value="standard">Standard</option>
                      <option
                        value="automated"
                        disabled={
                          !n.research.completed.includes("productivity")
                        }
                      >
                        Automated · +40% output, uses energy
                      </option>
                    </select>
                  </label>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "politics" && (
        <>
          {n.decision && (
            <div className="section decision">
              <span className="eyebrow">A decision awaits</span>
              <h3>{n.decision.title}</h3>
              <p>{n.decision.body}</p>
              <Btn
                why={c.treasury < 20 ? "Requires 20 credits." : null}
                onClick={() => send({ type: "decision", choice: "invest" })}
              >
                Fund energy investment · 20
              </Btn>
              <p className="hint">Energy +15; business approval +2.</p>
              <Btn
                why={c.treasury < 20 ? "Requires 20 credits." : null}
                onClick={() => send({ type: "decision", choice: "relief" })}
              >
                Provide household relief · 20
              </Btn>
              <p className="hint">Radicals −5; living standard +0.4.</p>
              <Btn
                onClick={() => send({ type: "decision", choice: "dismiss" })}
              >
                Decline both requests
              </Btn>
              <p className="hint">Radicals +3; public support −2.</p>
            </div>
          )}
          <div className="section">
            <h3>Interest groups & government</h3>
            <Stat label="Legitimacy" value={`${num(c.legitimacy)}%`} />
            <Stat
              label="Radicals / loyalists"
              value={`${num(n.radicals)}% / ${num(n.loyalists)}%`}
            />
            {(Object.keys(GROUPS) as Group[]).map((k) => (
              <label className="group-row" key={k}>
                <input
                  type="checkbox"
                  checked={(coalition ?? n.government).includes(k)}
                  onChange={(e) =>
                    setCoalition(
                      e.target.checked
                        ? [...(coalition ?? n.government), k]
                        : (coalition ?? n.government).filter((g) => g !== k),
                    )
                  }
                />
                <span>
                  {GROUPS[k]}
                  <small>
                    {num(n.groups[k].clout)}% clout · approval{" "}
                    {n.groups[k].approval.toFixed(1)}
                  </small>
                </span>
                <b className={n.groups[k].approval < 0 ? "danger" : "success"}>
                  {n.groups[k].approval > 0 ? "+" : ""}
                  {n.groups[k].approval.toFixed(0)}
                </b>
              </label>
            ))}
            <Btn
              why={
                (coalition ?? n.government).reduce(
                  (v, k) => v + n.groups[k].clout,
                  0,
                ) < 50
                  ? "A government needs 50% political clout."
                  : null
              }
              onClick={() => {
                send({ type: "government", groups: coalition ?? n.government });
                setCoalition(null);
              }}
            >
              Reform government
            </Btn>
            <p className="hint">
              Clout represents political weight. Policies and living conditions
              change approval. This first society model uses aggregated
              households rather than individual Pops.
            </p>
          </div>
          <LawPanel s={s} send={send} />
          <div className="section">
            <h3>Research & development</h3>
            {n.research.topic && (
              <div className="research-progress">
                <b>{TECH[n.research.topic].name}</b>
                <p>
                  {num(
                    (n.research.progress / TECH[n.research.topic].days) * 100,
                  )}
                  % ·{" "}
                  {Math.ceil(TECH[n.research.topic].days - n.research.progress)}{" "}
                  base days remaining
                </p>
              </div>
            )}
            {(Object.keys(TECH) as Tech[]).map((topic) => (
              <div className="law-row" key={topic}>
                <h4>
                  {TECH[topic].name}{" "}
                  {n.research.completed.includes(topic) && <CheckIcon />}
                </h4>
                <p>{TECH[topic].effect}</p>
                {!n.research.completed.includes(topic) && (
                  <Btn
                    why={
                      n.research.topic
                        ? "Research is already in progress."
                        : null
                    }
                    onClick={() => send({ type: "research", topic })}
                  >
                    Research · {TECH[topic].days} base days
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "journal" && (
        <>
          <div className="section">
            <h3>Campaign records</h3>
            <div className="button-pair">
              <Btn onClick={() => save()}>Save locally</Btn>
              <Btn onClick={() => save(true)}>Export JSON</Btn>
              <Btn onClick={importFile}>Import JSON</Btn>
              <Btn onClick={load} why={!hasSave ? "No local save." : null}>
                Load local save
              </Btn>
            </div>
            <p className="hint">
              Autosave every 10 days. Earlier saves gain the national-management
              model automatically.
            </p>
            <Btn onClick={newGame}>New campaign…</Btn>
          </div>
          <div className="section">
            <h3>Journal entries</h3>
            <Stat label="Living standard" value={n.living.toFixed(1)} />
            <Spark values={n.history.map((h) => h.living)} />
            <Stat label="Economic output" value={num(n.gdp)} />
            <Spark values={n.history.map((h) => h.gdp)} />
            {s.events.map((e, i) => (
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
  );
}
function PlayBuilder({
  s,
  target,
  send,
  crises,
}: {
  s: State;
  target: string;
  send: (c: Command) => void;
  crises: Crisis[];
}) {
  const [additional, setAdditional] = useState<Crisis["demand"]>("reparations");
  const [demand, setDemand] = useState<Crisis["demand"]>("access"),
    [offer, setOffer] = useState(65);
  const c = s.countries[s.player],
    active =
      crises.find(
        (cr) =>
          cr.status === "negotiating" &&
          (cr.to === target || cr.from === target),
      ) ?? crises.find((cr) => cr.to === target || cr.from === target);
  const draft: Crisis = {
    id: "preview",
    from: s.player,
    to: target,
    demand,
    offer,
    day: s.day,
    deadline: s.day + 14,
    status: "negotiating",
    supporters: [],
  };
  const a = acceptance(s, active ?? draft);
  if (active?.status === "war") {
    const enemy = active.from === s.player ? active.to : active.from;
    const leverage = settlementLeverage(s, s.player, enemy);
    const initiating = active.from === s.player;
    return (
      <div className="section">
        <span className="eyebrow">War settlement</span>
        <h3>{DEMANDS[active.demand].name}</h3>
        <p>
          {name(active.from)} vs {name(active.to)}
        </p>
        <p>
          Your war aims:{" "}
          {[
            initiating ? active.demand : (active.counter ?? "humiliation"),
            ...((initiating ? active.extra : active.defenderExtra) ?? []),
          ]
            .map((d) => DEMANDS[d].name)
            .join(", ")}
        </p>
        <p>
          Settlement leverage: {leverage}/100 · requires 60 to enforce victory
        </p>
        <p className="hint">
          Occupation, relative army strength and enemy exhaustion increase
          leverage. Conceding enforces all opposing war aims.
        </p>
        <Btn
          why={leverage < 60 ? "Requires 60 settlement leverage" : null}
          onClick={() =>
            send({ type: "war_settlement", id: active.id, action: "enforce" })
          }
        >
          Enforce war aims
        </Btn>
        <Btn
          why={
            c.treasury < 65
              ? "Requires 65 credits for the initial peace offer"
              : null
          }
          onClick={() =>
            send({ type: "crisis", to: enemy, demand: "ceasefire", offer: 65 })
          }
        >
          Negotiate a ceasefire
        </Btn>
        <Btn
          onClick={() =>
            send({ type: "war_settlement", id: active.id, action: "concede" })
          }
        >
          Concede opposing war aims
        </Btn>
      </div>
    );
  }
  return (
    <div className="section play-builder">
      <span className="eyebrow">
        {active ? "Active diplomatic play" : "Negotiation preview"}
      </span>
      <h3>
        {active
          ? active.demand === "ceasefire"
            ? "Ceasefire negotiations"
            : "Diplomatic pressure"
          : "What do you want to achieve?"}
      </h3>
      {active && (
        <>
          <div className="play-phase">
            <span>{crisisPhase(s, active)}</span>
            <b>{active.deadline - s.day} days left</b>
          </div>
          <div className="phase-track">
            {[
              "Opening demands",
              "Diplomatic bargaining",
              "Final countdown",
            ].map((p) => (
              <span
                className={p === crisisPhase(s, active) ? "active" : ""}
                key={p}
              />
            ))}
          </div>
          <p>
            {name(active.from)} → {name(active.to)} · {active.demand}
          </p>
        </>
      )}
      {!active && (
        <div className="goal-options">
          {Object.entries(DEMANDS).map(([key, goal]) => {
            const id = key as Crisis["demand"],
              label = goal.name;
            return (
              <button
                aria-pressed={demand === id}
                className={demand === id ? "active" : ""}
                onClick={() => setDemand(id)}
                key={id}
              >
                {label}
              </button>
            );
          })}
          <p className="hint">
            {DEMANDS[demand].description} Infamy on opening: +
            {DEMANDS[demand].infamy}.
          </p>
        </div>
      )}
      {active && (
        <div className="play-terms">
          <p>
            <b>Primary demand:</b> {DEMANDS[active.demand].name}
          </p>
          <p>{DEMANDS[active.demand].description}</p>
          <p>
            <b>Counter-demand:</b>{" "}
            {DEMANDS[active.counter ?? "humiliation"].name}
          </p>
          <p>
            Initiator coalition:{" "}
            {[active.from, ...active.supporters].map(name).join(", ")}
          </p>
          <p>
            Defender coalition:{" "}
            {[active.to, ...(active.defenders ?? [])].map(name).join(", ")}
          </p>
          <p className="hint">
            Backing means joining this side if war starts. Backing locks during
            countdown. Backing down concedes the other side’s primary demand.
          </p>
          <p>
            Secondary war aims:{" "}
            {(
              (active.from === s.player
                ? active.extra
                : active.defenderExtra) ?? []
            )
              .map((d) => DEMANDS[d].name)
              .join(", ") || "None"}
          </p>
          {active.demand !== "ceasefire" && (
            <>
              <label className="field">
                Add or revise demands
                <select
                  aria-label="Additional demand"
                  value={additional}
                  onChange={(e) =>
                    setAdditional(e.target.value as Crisis["demand"])
                  }
                >
                  {Object.entries(DEMANDS)
                    .filter(([id]) => id !== "ceasefire")
                    .map(([id, g]) => (
                      <option key={id} value={id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>
              <p>{DEMANDS[additional].description}</p>
              <p>
                {active.from === s.player
                  ? (active.maneuvers ?? 60)
                  : (active.defenderManeuvers ?? 60)}{" "}
                maneuvers remaining · 20 per demand · +
                {DEMANDS[additional].infamy} infamy
              </p>
              <Btn
                why={
                  s.day >= active.day + 10
                    ? "Demands locked during countdown"
                    : null
                }
                onClick={() =>
                  send({
                    type: "play_demand",
                    id: active.id,
                    demand: additional,
                  })
                }
              >
                Add secondary war aim
              </Btn>
              {active.to === s.player && (
                <Btn
                  why={
                    s.day >= active.day + 10
                      ? "Demands locked during countdown"
                      : null
                  }
                  onClick={() =>
                    send({
                      type: "play_demand",
                      id: active.id,
                      demand: additional,
                      primary: true,
                    })
                  }
                >
                  Set primary counter-demand
                </Btn>
              )}
            </>
          )}
        </div>
      )}
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
      <div className="acceptance">
        <span>{active ? "Current acceptance" : "Predicted acceptance"}</span>
        <b className={a.score >= 0 ? "success" : "danger"}>
          {a.score >= 0 ? "+" : ""}
          {a.score} · {a.score >= 0 ? "Will accept" : "Will refuse"}
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
      {!active ? (
        <Btn
          primary
          why={
            crises.length
              ? "Resolve the existing play first."
              : offer > c.treasury
                ? "Compensation exceeds treasury."
                : null
          }
          onClick={() => send({ type: "crisis", to: target, demand, offer })}
        >
          Begin diplomatic play
        </Btn>
      ) : (
        <>
          {active.from === s.player && (
            <>
              <Btn
                why={
                  offer > c.treasury ? "Compensation exceeds treasury." : null
                }
                onClick={() => send({ type: "offer", id: active.id, offer })}
              >
                Update compensation to {offer}
              </Btn>
              <label className="guided obligation">
                <input
                  type="checkbox"
                  checked={!!active.obligation}
                  onChange={(e) =>
                    send({
                      type: "obligation",
                      id: active.id,
                      value: e.target.checked,
                    })
                  }
                />
                Offer an obligation
                <span>Acceptance +20; commits 8 future influence.</span>
              </label>
            </>
          )}
          <div className="button-pair">
            {Object.keys(s.countries)
              .filter((id) => ![active.from, active.to, s.player].includes(id))
              .map((id) => (
                <Btn
                  key={id}
                  why={
                    s.day >= active.day + 10 || relation(s, s.player, id) < 15
                      ? "Not aligned with your government."
                      : [
                            ...active.supporters,
                            ...(active.defenders ?? []),
                          ].includes(id)
                        ? "Already backing this play."
                        : c.treasury < 15
                          ? "Requires 15 credits."
                          : null
                  }
                  onClick={() =>
                    send({ type: "backing", id: active.id, to: id })
                  }
                >
                  Seek {id} backing
                </Btn>
              ))}
          </div>
          <Btn
            primary
            why={
              active.from === s.player && a.score < 0
                ? "Improve terms or backing before concluding."
                : null
            }
            onClick={() =>
              send({ type: "resolve", id: active.id, action: "negotiate" })
            }
          >
            Conclude agreement
          </Btn>
          <div className="button-pair">
            <Btn
              onClick={() =>
                send({ type: "resolve", id: active.id, action: "backdown" })
              }
            >
              Back down
            </Btn>
            {active.from === s.player && active.demand !== "ceasefire" && (
              <Btn
                why={
                  s.day < active.day + 3
                    ? "Available after the 3-day warning."
                    : null
                }
                onClick={() =>
                  send({ type: "resolve", id: active.id, action: "escalate" })
                }
              >
                Escalate to war
              </Btn>
            )}
          </div>
        </>
      )}
      <p className="hint">
        A negotiated agreement enforces the initiating primary demand. Backing
        down enforces the opposing primary demand without compensation.
        Secondary demands require victory in war. Unresolved plays expire
        peacefully; declaring war is an explicit choice.
      </p>
    </div>
  );
}
