import { META, name, type MapData } from "./scenario";
export type Country = {
  id: string;
  treasury: number;
  debt: number;
  fuel: number;
  equipment: number;
  energy: number;
  goods: number;
  support: number;
  stability: number;
  legitimacy: number;
  tax: number;
  defence: number;
  mobilized: boolean;
  air: "standby" | "recon" | "support";
  capital: string;
  port: string | null;
  income: number;
  expense: number;
  lostCapitalDays: number;
};
export type Province = {
  id: string;
  owner: string;
  controller: string;
  infra: number;
  industry: number;
  depot: number;
  damage: number;
  population: number;
  terrain: "urban" | "hills" | "plain";
  project: null | { kind: "industry" | "depot" | "equipment"; days: number };
};
export type Army = {
  id: string;
  country: string;
  name: string;
  province: string;
  strength: number;
  org: number;
  supply: number;
  objective: string | null;
  stance: "hold" | "advance" | "move" | "front";
  front: string | null;
  progress: number;
  retreats: number;
};
export type Crisis = {
  id: string;
  from: string;
  to: string;
  demand: "access" | "ceasefire" | "withdrawal";
  offer: number;
  day: number;
  deadline: number;
  status: "negotiating" | "agreed" | "war" | "backdown" | "rejected";
  supporters: string[];
};
export type Treaty = {
  a: string;
  b: string;
  kind:
    "access" | "trade" | "guarantee" | "ceasefire" | "sanction" | "blockade";
  until: number;
};
export type Event = {
  day: number;
  text: string;
  kind: "diplomacy" | "military" | "economy" | "system";
};
export type State = {
  version: 1;
  mapKey: string;
  seed: number;
  day: number;
  player: string;
  guided: boolean;
  observer: boolean;
  defeated: boolean;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  armies: Army[];
  wars: [string, string][];
  treaties: Treaty[];
  crises: Crisis[];
  aid: { from: string; to: string; amount: number; days: number }[];
  events: Event[];
  harm: number;
  displaced: number;
  escalation: number;
  achievements: string[];
  commands: number;
  nextId: number;
};
export type Command = { type: string; [key: string]: any };
export type Result = { ok: boolean; message: string };
const clamp = (x: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, x));
const key = (map: MapData) =>
  `${map.features.length}:${map.features.map((f) => f.id).join("|")}`;
const log = (s: State, text: string, kind: Event["kind"] = "system") => {
  s.events.unshift({ day: s.day, text, kind });
  s.events = s.events.slice(0, 120);
};
const rand = (s: State) => {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
};
export const atWar = (s: State, a: string, b: string) =>
  s.wars.some((w) => w.includes(a) && w.includes(b) && a !== b);
export const treaty = (s: State, a: string, b: string, kind: Treaty["kind"]) =>
  s.treaties.some(
    (t) => t.kind === kind && t.a === a && t.b === b && t.until > s.day,
  );
const mutual = (s: State, a: string, b: string, k: Treaty["kind"]) =>
  treaty(s, a, b, k) || treaty(s, b, a, k);
export function relation(s: State, a: string, b: string) {
  if (a === b) return 100;
  let n = 0;
  if ([a, b].every((x) => ["IRN", "SYR", "RUS"].includes(x))) n = 45;
  if ([a, b].every((x) => ["TUR", "OPP", "USA", "SAU", "QAT"].includes(x)))
    n = 35;
  if ((a === "SYR" && b === "TUR") || (b === "SYR" && a === "TUR")) n = -30;
  if (mutual(s, a, b, "trade")) n += 15;
  if (mutual(s, a, b, "sanction")) n -= 30;
  if (atWar(s, a, b)) n -= 80;
  return clamp(n, -100, 100);
}
export function createState(
  map: MapData,
  player = "TUR",
  guided = true,
  seed = 2012,
): State {
  const s: State = {
    version: 1,
    mapKey: key(map),
    seed,
    day: 0,
    player,
    guided,
    observer: false,
    defeated: false,
    countries: {},
    provinces: {},
    armies: [],
    wars: [["SYR", "OPP"]],
    treaties: [],
    crises: [],
    aid: [],
    events: [],
    harm: 0,
    displaced: 0,
    escalation: 18,
    achievements: [],
    commands: 0,
    nextId: 1,
  };
  for (const f of map.features) {
    const c = f.properties.country;
    s.provinces[f.id] = {
      id: f.id,
      owner: c,
      controller: c,
      infra: 65,
      industry: 1,
      depot: 0,
      damage: 0,
      population: 120 + Math.floor(rand(s) * 650),
      terrain: rand(s) < 0.3 ? "hills" : "plain",
      project: null,
    };
  }
  function nearest(country: string, point: number[]) {
    return (
      map.features
        .filter((f) => f.properties.country === country)
        .sort(
          (a, b) =>
            (a.properties.center[0] - point[0]) ** 2 +
            (a.properties.center[1] - point[1]) ** 2 -
            ((b.properties.center[0] - point[0]) ** 2 +
              (b.properties.center[1] - point[1]) ** 2),
        )[0]?.id ?? ""
    );
  }
  for (const [id, m] of Object.entries(META)) {
    const capital = nearest(id === "OPP" ? "SYR" : id, m.capital);
    s.countries[id] = {
      id,
      capital,
      port: m.port ? nearest(id, m.port) : null,
      treasury:
        id === "TUR" ? 285 : id === "IRN" ? 240 : id === "SYR" ? 108 : 140,
      debt: 0,
      fuel: 85,
      equipment: 90,
      energy: 80,
      goods: 75,
      support: 68,
      stability: 72,
      legitimacy: 65,
      tax: 30,
      defence: 35,
      mobilized: false,
      air: "standby",
      income: 0,
      expense: 0,
      lostCapitalDays: 0,
    };
    if (capital && s.provinces[capital]) {
      s.provinces[capital].terrain = "urban";
      s.provinces[capital].industry = 3;
      s.provinces[capital].depot = 1;
    }
  }
  // Discrete control pockets are abstractions, not a historical January front map.
  const opp = map.features.filter(
    (f) =>
      f.properties.country === "SYR" &&
      ((/Idlib/i.test(f.properties.name) && f.properties.center[1] > 35.65) ||
        (/Dar.*a|Daraa/i.test(f.properties.name) &&
          f.properties.center[0] < 36.3)),
  );
  if (opp.length === 0)
    opp.push(map.features.find((f) => f.id === s.countries.OPP.capital)!);
  for (const f of opp) {
    s.provinces[f.id].controller = "OPP";
    s.provinces[f.id].depot = 1;
  }
  s.countries.OPP.capital = opp[0].id;
  s.countries.OPP.port = null;
  const add = (country: string, province: string, n: string) => {
    if (province)
      s.armies.push({
        id: `a${s.nextId++}`,
        country,
        name: n,
        province,
        strength: country === "OPP" ? 56 : 78,
        org: 82,
        supply: 100,
        objective: null,
        stance: "hold",
        front: null,
        progress: 0,
        retreats: 0,
      });
  };
  for (const id of [
    "TUR",
    "IRN",
    "SYR",
    "OPP",
    "IRQ",
    "JOR",
    "ISR",
    "SAU",
    "LBN",
    "EGY",
  ]) {
    const pool = map.features.filter(
      (f) => s.provinces[f.id].controller === id,
    );
    const border = pool.filter((f) =>
      map.adjacency[f.id].some(
        (n) =>
          s.provinces[n]?.owner === "SYR" && s.provinces[n]?.controller !== id,
      ),
    );
    const positions = [
      ...border,
      ...pool.filter((f) => f.id === s.countries[id].capital),
      ...pool,
    ];
    const used = new Set<string>();
    let count = 0;
    for (const f of positions) {
      if (used.has(f.id)) continue;
      add(
        id,
        f.id,
        `${id === "OPP" ? "Opposition group" : id === "SYR" ? "Syrian army" : name(id) + " army"} ${++count}`,
      );
      used.add(f.id);
      if (count >= (["TUR", "IRN", "SYR", "OPP"].includes(id) ? 3 : 1)) break;
    }
  }
  for (const [a, b] of [
    ["IRN", "IRQ"],
    ["IRN", "SYR"],
    ["IRQ", "SYR"],
    ["TUR", "OPP"],
  ])
    s.treaties.push({ a, b, kind: "access", until: 99999 });
  for (const [a, b] of [
    ["RUS", "SYR"],
    ["USA", "TUR"],
  ])
    s.treaties.push({ a, b, kind: "guarantee", until: 99999 });
  log(
    s,
    "01 January 2012. Arab League observers are in Syria. The next decisions are yours.",
    "diplomacy",
  );
  log(
    s,
    "Scenario values and control pockets are gameplay approximations. See the scenario dossier.",
  );
  updateSupply(s, map);
  return s;
}
export function canEnter(
  s: State,
  country: string,
  pid: string,
  hostile = false,
) {
  const p = s.provinces[pid];
  return (
    !!p &&
    (p.controller === country ||
      treaty(s, country, p.controller, "access") ||
      (hostile && atWar(s, country, p.controller)))
  );
}
export function path(
  s: State,
  map: MapData,
  from: string,
  to: string,
  country: string,
  hostile = false,
): string[] {
  if (!s.provinces[from] || !s.provinces[to]) return [];
  const q = [from],
    prev: Record<string, string> = { [from]: "" };
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (p === to) {
      const a = [];
      for (let n = to; n !== from; n = prev[n]) a.unshift(n);
      return a;
    }
    for (const n of map.adjacency[p] ?? []) {
      if (!(n in prev) && canEnter(s, country, n, hostile)) {
        prev[n] = p;
        q.push(n);
      }
    }
  }
  return [];
}
export function supplyRoutes(s: State, map: MapData, country: string) {
  const c = s.countries[country],
    dist: Record<string, number> = {},
    q: string[] = [];
  const seed = (p: string | null) => {
    if (p && s.provinces[p]?.controller === country && dist[p] === undefined) {
      dist[p] = 0;
      q.push(p);
    }
  };
  seed(c.capital);
  // Opposition border depots model distributed local support. Other depots extend capacity, not create supply.
  if (country === "OPP")
    for (const p of Object.values(s.provinces))
      if (p.controller === country && p.depot > 0) seed(p.id);
  if (
    c.port &&
    !s.treaties.some(
      (t) => t.kind === "blockade" && t.b === country && t.until > s.day,
    ) &&
    c.equipment > 10
  )
    seed(c.port);
  for (let i = 0; i < q.length; i++) {
    let p = q[i];
    for (const n of map.adjacency[p] ?? [])
      if (dist[n] === undefined && canEnter(s, country, n)) {
        dist[n] = dist[p] + 1;
        q.push(n);
      }
  }
  return dist;
}
export function updateSupply(s: State, map: MapData) {
  const routes: Record<string, Record<string, number>> = {};
  for (const a of s.armies) {
    routes[a.country] ??= supplyRoutes(s, map, a.country);
    const d = routes[a.country][a.province],
      p = s.provinces[a.province],
      c = s.countries[a.country];
    a.supply =
      d === undefined
        ? 8
        : clamp(
            100 -
              d * 3 +
              p.depot * 12 -
              (100 - p.infra + p.damage) * 0.35 -
              (c.fuel < 10 ? 35 : 0) -
              (c.equipment < 10 ? 25 : 0),
          );
  }
}
export function aidRoute(s: State, map: MapData, from: string, to: string) {
  const a = s.countries[from],
    b = s.countries[to];
  if (from === to || !a || !b || !a.capital || !b.capital || atWar(s, from, to))
    return false;
  // Route can traverse recipient territory, donor territory and countries granting donor access.
  const q = [a.capital],
    seen = new Set(q);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (s.provinces[p]?.controller === to) return true;
    for (const n of map.adjacency[p] ?? [])
      if (
        !seen.has(n) &&
        (canEnter(s, from, n) || s.provinces[n].controller === to)
      ) {
        seen.add(n);
        q.push(n);
      }
  }
  return !!(
    a.port &&
    b.port &&
    s.provinces[a.port].controller === from &&
    s.provinces[b.port].controller === to &&
    !s.treaties.some(
      (t) =>
        t.kind === "blockade" && [from, to].includes(t.b) && t.until > s.day,
    )
  );
}
export function acceptance(s: State, c: Crisis) {
  const target = s.countries[c.to];
  const reasons = [
    { label: "Base reluctance", value: -45 },
    { label: "Relations", value: Math.round(relation(s, c.from, c.to) * 0.35) },
    { label: "Compensation", value: Math.round(c.offer * 0.8) },
    {
      label: "Domestic exhaustion",
      value: Math.round((100 - target.support) * 0.3),
    },
    { label: "International backing", value: c.supporters.length * 15 },
  ];
  if (c.demand === "ceasefire")
    reasons.push({
      label: "Cost of continued conflict",
      value: 25 + Math.min(35, Math.floor(s.day / 8)),
    });
  if (c.demand === "withdrawal")
    reasons.push({ label: "Territorial concession", value: -25 });
  return { score: reasons.reduce((a, r) => a + r.value, 0), reasons };
}
const addTreaty = (
  s: State,
  a: string,
  b: string,
  kind: Treaty["kind"],
  days = 180,
) => {
  s.treaties = s.treaties.filter(
    (t) => !(t.a === a && t.b === b && t.kind === kind),
  );
  s.treaties.push({ a, b, kind, until: s.day + days });
};
function peace(s: State, a: string, b: string) {
  s.wars = s.wars.filter((w) => !(w.includes(a) && w.includes(b)));
  addTreaty(s, a, b, "ceasefire", 90);
  for (const army of s.armies)
    if ([a, b].includes(army.country)) {
      army.objective = null;
      army.stance = "hold";
    }
  log(
    s,
    `${name(a)} and ${name(b)} agree to a 90-day ceasefire along current lines.`,
    "diplomacy",
  );
  if (!s.achievements.includes("settlement")) s.achievements.push("settlement");
}
function war(s: State, a: string, b: string) {
  if (atWar(s, a, b)) return;
  s.wars.push([a, b]);
  s.escalation = clamp(s.escalation + 14);
  log(s, `${name(a)} and ${name(b)} are at war.`, "military");
  for (const t of [...s.treaties])
    if (
      t.kind === "guarantee" &&
      t.b === b &&
      t.until > s.day &&
      s.countries[t.a].treasury >= 25
    ) {
      s.countries[t.a].treasury -= 25;
      s.countries[b].equipment += 15;
      s.escalation = clamp(s.escalation + 5);
      log(
        s,
        `${name(t.a)} honours its guarantee with equipment and diplomatic backing.`,
        "diplomacy",
      );
    }
}
export function command(
  s: State,
  map: MapData,
  cmd: Command,
  actor?: string,
): Result {
  const external = actor === undefined;
  actor ??= s.player;
  const fail = (message: string) => ({ ok: false, message }),
    ok = (message: string) => {
      s.commands++;
      return { ok: true, message };
    };
  const c = s.countries[actor];
  if (!c) return fail("Unknown country.");
  if (external && (s.observer || s.defeated) && !["observe"].includes(cmd.type))
    return fail("Observer mode: national orders are disabled.");
  switch (cmd.type) {
    case "policy": {
      if (!["tax", "defence", "mobilized", "air"].includes(cmd.key))
        return fail("Unknown policy.");
      if (
        ["tax", "defence"].includes(cmd.key) &&
        (!Number.isFinite(cmd.value) || cmd.value < 10 || cmd.value > 70)
      )
        return fail("Policy must be between 10 and 70.");
      if (
        cmd.key === "air" &&
        !["standby", "recon", "support"].includes(cmd.value)
      )
        return fail("Invalid air mission.");
      if (cmd.key === "mobilized" && typeof cmd.value !== "boolean")
        return fail("Invalid mobilization.");
      (c as any)[cmd.key] = cmd.value;
      return ok("Policy updated.");
    }
    case "build": {
      const p = s.provinces[cmd.province];
      if (!p || p.controller !== actor || p.owner !== actor)
        return fail("Build in an owned province you control.");
      if (p.project) return fail("Construction already in progress.");
      if (!["industry", "depot", "equipment"].includes(cmd.kind))
        return fail("Unknown investment.");
      const cost =
        cmd.kind === "industry" ? 35 : cmd.kind === "depot" ? 20 : 25;
      if (c.treasury < cost) return fail("Insufficient treasury.");
      c.treasury -= cost;
      p.project = { kind: cmd.kind, days: cmd.kind === "industry" ? 25 : 15 };
      log(s, `${name(actor)} starts ${cmd.kind} investment.`, "economy");
      return ok("Investment funded.");
    }
    case "order": {
      const a = s.armies.find((a) => a.id === cmd.army && a.country === actor);
      if (!a) return fail("Select one of your armies.");
      if (cmd.stance === "hold") {
        a.objective = null;
        a.stance = "hold";
        a.progress = 0;
        return ok("Army halted.");
      }
      if (!["advance", "move", "front"].includes(cmd.stance))
        return fail("Unknown order.");
      const target = s.provinces[cmd.province];
      if (!target) return fail("Select a province.");
      if (cmd.stance === "front") {
        if (
          target.controller !== actor ||
          !map.adjacency[target.id].some(
            (n) => s.provinces[n].controller !== actor,
          )
        )
          return fail("Select a friendly border province.");
        a.front = target.id;
      }
      if (
        target.id !== a.province &&
        !path(s, map, a.province, target.id, actor, cmd.stance === "advance")
          .length
      )
        return fail(
          "No legal route. Negotiate access or resolve the crisis before crossing a border.",
        );
      a.objective = target.id;
      a.stance = cmd.stance;
      a.progress = 0;
      return ok(
        cmd.stance === "advance"
          ? "Army objective assigned."
          : "Movement order assigned.",
      );
    }
    case "trade":
    case "access": {
      const to = cmd.to;
      if (!s.countries[to] || to === actor || atWar(s, actor, to))
        return fail("Choose a country at peace with you.");
      if (mutual(s, actor, to, cmd.type))
        return fail("Agreement already active.");
      if (relation(s, actor, to) < 10)
        return fail(
          "Relations too low for a direct agreement. Use a compensated crisis proposal.",
        );
      if (c.treasury < 10 || s.countries[to].treasury < 10)
        return fail("Both countries need 10 credits.");
      c.treasury -= 10;
      s.countries[to].treasury -= 10;
      addTreaty(s, actor, to, cmd.type);
      if (cmd.type === "trade") addTreaty(s, to, actor, "trade");
      log(
        s,
        `${name(actor)} and ${name(to)} sign a ${cmd.type} agreement.`,
        "diplomacy",
      );
      s.achievements.includes("agreement") || s.achievements.push("agreement");
      return ok("Agreement signed for 180 days.");
    }
    case "sanction":
    case "blockade":
    case "guarantee": {
      const to = cmd.to;
      if (!s.countries[to] || to === actor)
        return fail("Choose another country.");
      if (treaty(s, actor, to, cmd.type)) return fail("Policy already active.");
      if (c.treasury < 15) return fail("Requires 15 credits.");
      if (cmd.type === "blockade" && !c.port) return fail("Requires a port.");
      c.treasury -= 15;
      addTreaty(s, actor, to, cmd.type, 90);
      if (cmd.type !== "guarantee") s.escalation = clamp(s.escalation + 5);
      log(
        s,
        `${name(actor)} applies ${cmd.type === "blockade" ? "maritime pressure" : cmd.type} to ${name(to)}.`,
        "diplomacy",
      );
      return ok("Policy active for 90 days; upkeep applies.");
    }
    case "aid": {
      const to = cmd.to,
        amount = 20;
      if (!aidRoute(s, map, actor, to))
        return fail(
          "No valid land-access or unblocked port route to recipient.",
        );
      if (c.treasury < amount || c.equipment < amount)
        return fail("Aid requires 20 credits and 20 equipment.");
      c.treasury -= amount;
      c.equipment -= amount;
      s.aid.push({ from: actor, to, amount, days: 5 });
      log(
        s,
        `${name(actor)} dispatches equipment aid to ${name(to)}.`,
        "diplomacy",
      );
      return ok(
        "Aid convoy dispatched. Delivery in 5 days if route remains open.",
      );
    }
    case "crisis": {
      const to = cmd.to;
      if (!s.countries[to] || to === actor)
        return fail("Choose another country.");
      if (!["access", "ceasefire", "withdrawal"].includes(cmd.demand))
        return fail("Unknown demand.");
      if (
        !Number.isFinite(cmd.offer) ||
        cmd.offer < 0 ||
        cmd.offer > 150 ||
        c.treasury < cmd.offer
      )
        return fail("Compensation must be affordable (0–150).");
      if (
        s.crises.some(
          (x) => x.status === "negotiating" && [x.from, x.to].includes(actor),
        )
      )
        return fail("Resolve your existing crisis first.");
      s.crises.push({
        id: `c${s.nextId++}`,
        from: actor,
        to,
        demand: cmd.demand,
        offer: cmd.offer,
        day: s.day,
        deadline: s.day + 14,
        status: "negotiating",
        supporters: [],
      });
      log(
        s,
        `${name(actor)} opens a ${cmd.demand} crisis with ${name(to)}. Negotiations last 14 days.`,
        "diplomacy",
      );
      return ok("Crisis opened. Compensation is paid only on agreement.");
    }
    case "offer": {
      const cr = s.crises.find(
        (x) =>
          x.id === cmd.id && x.from === actor && x.status === "negotiating",
      );
      if (!cr) return fail("No active proposal.");
      if (
        !Number.isFinite(cmd.offer) ||
        cmd.offer < 0 ||
        cmd.offer > 150 ||
        c.treasury < cmd.offer
      )
        return fail("Offer must be affordable (0–150).");
      cr.offer = cmd.offer;
      return ok("Compensation revised.");
    }
    case "resolve": {
      const cr = s.crises.find(
        (x) =>
          x.id === cmd.id &&
          x.status === "negotiating" &&
          (x.from === actor || x.to === actor),
      );
      if (!cr) return fail("No negotiable crisis.");
      if (cmd.action === "backdown") {
        cr.status = "backdown";
        c.support = clamp(c.support - 4);
        log(s, `${name(actor)} backs down from the crisis.`, "diplomacy");
        return ok("Crisis ended without war.");
      }
      if (cmd.action === "escalate") {
        if (cr.from !== actor) return fail("Only the initiator may escalate.");
        if (s.day < cr.day + 3)
          return fail("Mobilization warning requires 3 days.");
        if (mutual(s, cr.from, cr.to, "ceasefire"))
          return fail("A ceasefire currently prevents escalation.");
        if (cr.demand === "ceasefire")
          return fail("A mediation proposal cannot be used to declare war.");
        if (
          cr.demand === "withdrawal" &&
          !Object.values(s.provinces).some(
            (p) => p.owner === actor && p.controller === cr.to,
          )
        )
          return fail(
            "No occupied national territory to reclaim. Use an access crisis for intervention.",
          );
        cr.status = "war";
        war(s, cr.from, cr.to);
        return ok("Crisis escalated into war.");
      }
      if (cmd.action !== "negotiate") return fail("Unknown resolution.");
      if (cr.to !== actor && acceptance(s, cr).score < 0)
        return fail(
          "Target will refuse. Improve compensation or obtain backing.",
        );
      const payer = s.countries[cr.from];
      if (payer.treasury < cr.offer)
        return fail("Proposer can no longer afford compensation.");
      payer.treasury -= cr.offer;
      s.countries[cr.to].treasury += cr.offer;
      cr.status = "agreed";
      if (cr.demand === "ceasefire") {
        if (atWar(s, cr.from, cr.to)) peace(s, cr.from, cr.to);
        else if (["SYR", "OPP"].includes(cr.to)) peace(s, "SYR", "OPP");
        else {
          cr.status = "rejected";
          payer.treasury += cr.offer;
          s.countries[cr.to].treasury -= cr.offer;
          return fail("Target is not party to a supported conflict.");
        }
      } else if (cr.demand === "access") addTreaty(s, cr.from, cr.to, "access");
      else {
        for (const p of Object.values(s.provinces))
          if (p.owner === cr.from && p.controller === cr.to)
            p.controller = cr.from;
        peace(s, cr.from, cr.to);
      }
      log(
        s,
        `${name(cr.from)} and ${name(cr.to)} reach agreement on ${cr.demand}.`,
        "diplomacy",
      );
      if (!s.achievements.includes("agreement"))
        s.achievements.push("agreement");
      return ok("Agreement implemented.");
    }
    case "backing": {
      const cr = s.crises.find(
        (x) =>
          x.id === cmd.id && x.status === "negotiating" && x.from === actor,
      );
      if (!cr) return fail("No active crisis.");
      const supporter = cmd.to;
      if (
        !s.countries[supporter] ||
        [cr.from, cr.to].includes(supporter) ||
        cr.supporters.includes(supporter)
      )
        return fail("Choose an eligible supporter.");
      if (relation(s, actor, supporter) < 15)
        return fail("Supporter is not aligned with your government.");
      if (c.treasury < 15 || s.countries[supporter].treasury < 10)
        return fail("Backing requires 15 credits; supporter needs 10.");
      c.treasury -= 15;
      s.countries[supporter].treasury -= 10;
      cr.supporters.push(supporter);
      s.escalation = clamp(s.escalation + 3);
      return ok("International backing secured.");
    }
    case "mediate": {
      if (!atWar(s, actor, cmd.to)) return fail("No war with this actor.");
      return command(
        s,
        map,
        {
          type: "crisis",
          to: cmd.to,
          demand: "ceasefire",
          offer: cmd.offer ?? 35,
        },
        actor,
      );
    }
    case "observe":
      s.observer = true;
      return ok("Observer mode enabled.");
    default:
      return fail("Unknown command.");
  }
}
function economy(s: State) {
  for (const c of Object.values(s.countries)) {
    const ps = Object.values(s.provinces).filter((p) => p.controller === c.id),
      external = !c.capital;
    const industry =
        ps.reduce((n, p) => n + p.industry * (1 - p.damage / 150), 0) *
        (0.45 + Math.min(1, c.energy / 60) * 0.55),
      sanctions = s.treaties.filter(
        (t) => t.kind === "sanction" && t.b === c.id && t.until > s.day,
      ).length,
      block = s.treaties.some(
        (t) => t.kind === "blockade" && t.b === c.id && t.until > s.day,
      ),
      trades = s.treaties.filter(
        (t) => t.a === c.id && t.kind === "trade" && t.until > s.day,
      ).length;
    c.income =
      (external ? 3 : Math.min(9, industry * 0.09 + 1.5)) *
        (c.tax / 30) *
        (1 - Math.min(0.6, sanctions * 0.18)) +
      trades * 0.35;
    c.expense =
      0.65 +
      c.defence * 0.015 +
      (c.mobilized ? 1.2 : 0) +
      s.armies.filter((a) => a.country === c.id).length * 0.18 +
      s.treaties.filter(
        (t) =>
          t.a === c.id &&
          ["sanction", "blockade", "guarantee"].includes(t.kind) &&
          t.until > s.day,
      ).length *
        0.12;
    c.treasury += c.income - c.expense;
    if (c.treasury < 0) {
      c.debt -= c.treasury;
      c.treasury = 0;
      c.support = clamp(c.support - 0.15);
    }
    c.debt *= 1.0003;
    c.fuel = clamp(
      c.fuel +
        (block ? 0.05 : 0.9) * (1 - Math.min(0.8, sanctions * 0.25)) -
        (c.air === "standby" ? 0 : 0.35),
      0,
      200,
    );
    c.equipment = clamp(
      c.equipment +
        c.defence *
          0.018 *
          (1 - Math.min(0.8, sanctions * 0.2)) *
          (0.4 + Math.min(1, c.energy / 50) * 0.6),
      0,
      250,
    );
    c.energy = clamp(
      c.energy + (block ? -0.45 : 0.08) - sanctions * 0.12,
      0,
      150,
    );
    c.goods = clamp(
      c.goods + (0.4 - c.defence * 0.006) - (c.mobilized ? 0.15 : 0),
    );
    c.support = clamp(
      c.support +
        0.035 -
        (c.tax > 40 ? (c.tax - 40) * 0.004 : 0) -
        (c.mobilized ? 0.05 : 0) -
        (c.goods < 20 ? 0.1 : 0),
    );
    c.stability = clamp(
      c.stability + (c.support - 50) * 0.001 - (c.debt > 200 ? 0.04 : 0),
    );
    if (c.capital && s.provinces[c.capital]?.controller !== c.id)
      c.lostCapitalDays++;
    else c.lostCapitalDays = 0;
  }
  for (const p of Object.values(s.provinces)) {
    p.damage = Math.max(0, p.damage - 0.04);
    if (p.project && p.controller === p.owner) {
      p.project.days--;
      if (p.project.days <= 0) {
        if (p.project.kind === "industry") p.industry++;
        else if (p.project.kind === "depot") {
          p.depot++;
          p.infra = clamp(p.infra + 15);
        } else s.countries[p.controller].equipment += 35;
        log(s, `${p.project.kind} investment completed.`, "economy");
        p.project = null;
      }
    }
  }
}
function armies(s: State, map: MapData) {
  updateSupply(s, map);
  const removed = new Set<string>();
  for (const a of s.armies) {
    if (removed.has(a.id)) continue;
    const c = s.countries[a.country];
    a.org = clamp(a.org + (a.supply > 40 ? 1.1 : -2.2));
    if (a.supply < 25) a.strength = clamp(a.strength - 0.3);
    if (a.supply > 50 && a.strength < 90 && c.equipment > 0.2) {
      const gain = Math.min(c.equipment, c.mobilized ? 0.3 : 0.15);
      a.strength += gain;
      c.equipment -= gain;
    }
    if (a.stance === "front" && (!a.objective || a.objective === a.province)) {
      const n = map.adjacency[a.province].find((p) =>
        atWar(s, a.country, s.provinces[p].controller),
      );
      if (n) {
        a.objective = n;
        a.stance = "advance";
      }
    }
    if (!a.objective || a.objective === a.province) {
      if (a.stance !== "front") a.objective = null;
      continue;
    }
    const route = path(
      s,
      map,
      a.province,
      a.objective,
      a.country,
      a.stance === "advance",
    );
    if (!route.length) {
      a.objective = null;
      a.stance = "hold";
      continue;
    }
    if (c.fuel < 0.22) continue;
    const next = route[0],
      p = s.provinces[next],
      hostile = atWar(s, a.country, p.controller);
    c.fuel = Math.max(0, c.fuel - 0.22);
    if (hostile) {
      const defenders = s.armies.filter(
        (b) =>
          b.province === next &&
          atWar(s, a.country, b.country) &&
          !removed.has(b.id),
      );
      const power =
        a.strength *
        (0.25 + a.org / 100) *
        (0.15 + a.supply / 100) *
        (c.air === "support" && c.fuel > 5 ? 1.18 : 1);
      const defence =
        defenders.reduce(
          (v, b) =>
            v + b.strength * (0.3 + b.org / 100) * (0.2 + b.supply / 100),
          0,
        ) * (p.terrain === "hills" ? 1.3 : p.terrain === "urban" ? 1.2 : 1);
      a.org = clamp(a.org - 3);
      a.strength = clamp(
        a.strength - (defenders.length ? Math.min(4, defence / 80) : 0.25),
      );
      c.equipment = Math.max(0, c.equipment - 0.5);
      p.damage = clamp(p.damage + 1.2);
      s.harm += 0.04 + p.population * 0.00002;
      s.displaced += p.population * 0.002;
      s.countries[p.owner].support = clamp(s.countries[p.owner].support - 0.05);
      s.countries[a.country].legitimacy = clamp(
        s.countries[a.country].legitimacy - 0.02,
      );
      for (const b of defenders) {
        b.org = clamp(b.org - Math.max(1, power / 22));
        b.strength = clamp(b.strength - Math.max(0.5, power / 100));
        if (b.org < 16 || b.strength < 18) {
          const escape = map.adjacency[next].find(
            (n) => n !== a.province && canEnter(s, b.country, n),
          );
          if (escape) {
            b.province = escape;
            b.retreats++;
            b.org = Math.max(20, b.org);
            b.objective = null;
            log(s, `${b.name} retreats.`, "military");
          } else {
            removed.add(b.id);
            log(s, `${b.name} is encircled and disbands.`, "military");
          }
        }
      }
      if (a.org < 15 || a.strength < 18) {
        a.objective = null;
        a.stance = "hold";
        a.retreats++;
        log(s, `${a.name} abandons its offensive to reorganize.`, "military");
        continue;
      }
      const left = s.armies.some(
        (b) =>
          b.province === next &&
          atWar(s, a.country, b.country) &&
          !removed.has(b.id),
      );
      a.progress += left ? Math.max(0.05, (power - defence) / 250) : 0.65;
      if (!left && a.progress >= 1) {
        p.controller = a.country;
        a.province = next;
        a.progress = 0;
        log(
          s,
          `${a.name} takes control of ${map.features.find((f) => f.id === next)?.properties.name}.`,
          "military",
        );
        if (a.country === s.player && !s.achievements.includes("territory"))
          s.achievements.push("territory");
      }
    } else {
      a.progress +=
        (p.terrain === "hills" ? 0.28 : 0.42) * (0.35 + a.supply / 100);
      if (a.progress >= 1) {
        a.province = next;
        a.progress = 0;
      }
    }
    if (a.province === a.objective) {
      a.objective = null;
      if (a.stance !== "front") a.stance = "hold";
    }
  }
  s.armies = s.armies.filter((a) => !removed.has(a.id) && a.strength > 0);
}
function ai(s: State, map: MapData) {
  for (const c of Object.values(s.countries)) {
    if (c.id === s.player && !s.observer) continue;
    if (s.day % 7 === 0) {
      const fighting = s.wars.some((w) => w.includes(c.id));
      if (c.support < 45 && c.tax > 25)
        command(s, map, { type: "policy", key: "tax", value: c.tax - 5 }, c.id);
      if (c.income < c.expense && c.tax < 45 && c.support > 55)
        command(s, map, { type: "policy", key: "tax", value: c.tax + 5 }, c.id);
      if (c.mobilized !== fighting)
        command(
          s,
          map,
          { type: "policy", key: "mobilized", value: fighting },
          c.id,
        );
      if (c.treasury > 90 && s.day % 28 === 0) {
        const p = Object.values(s.provinces).find(
          (p) =>
            p.owner === c.id &&
            p.controller === c.id &&
            !p.project &&
            p.industry < 4,
        );
        if (p)
          command(
            s,
            map,
            { type: "build", province: p.id, kind: "industry" },
            c.id,
          );
      }
      const active = s.crises.find(
        (x) => x.status === "negotiating" && x.from === c.id,
      );
      if (active && acceptance(s, active).score >= 0)
        command(
          s,
          map,
          { type: "resolve", id: active.id, action: "negotiate" },
          c.id,
        );
      // AI diplomacy is intentionally bounded; avoids making every peaceful neighbor a conqueror.
      if (
        !active &&
        ["SYR", "OPP"].includes(c.id) &&
        c.support < 52 &&
        atWar(s, "SYR", "OPP")
      )
        command(
          s,
          map,
          { type: "mediate", to: c.id === "SYR" ? "OPP" : "SYR", offer: 40 },
          c.id,
        );
      if (s.day % 28 === 0) {
        const to = c.id === "IRN" ? "SYR" : c.id === "TUR" ? "OPP" : null;
        if (to && c.equipment > 45 && c.treasury > 45)
          command(s, map, { type: "aid", to }, c.id);
      }
    }
    for (const a of s.armies.filter(
      (a) => a.country === c.id && !a.objective && a.org > 45,
    )) {
      const candidates = Object.values(s.provinces).filter((p) =>
        atWar(s, a.country, p.controller),
      );
      const options = candidates
        .map((p) => ({
          p,
          path: path(s, map, a.province, p.id, a.country, true),
        }))
        .filter((v) => v.path.length)
        .sort((a, b) => a.path.length - b.path.length);
      if (options.length)
        command(
          s,
          map,
          {
            type: "order",
            army: a.id,
            province: options[0].p.id,
            stance: "advance",
          },
          c.id,
        );
    }
  }
}
export function tick(s: State, map: MapData, days = 1) {
  for (let i = 0; i < days; i++) {
    s.day++;
    s.treaties = s.treaties.filter((t) => t.until > s.day);
    economy(s);
    ai(s, map);
    armies(s, map);
    for (const a of s.aid) {
      a.days--;
      if (a.days <= 0) {
        if (aidRoute(s, map, a.from, a.to)) {
          s.countries[a.to].equipment = clamp(
            s.countries[a.to].equipment + a.amount,
            0,
            250,
          );
          s.countries[a.to].support = clamp(s.countries[a.to].support + 1);
          log(
            s,
            `Equipment aid from ${name(a.from)} reaches ${name(a.to)}.`,
            "diplomacy",
          );
          if (a.from === s.player && !s.achievements.includes("aid"))
            s.achievements.push("aid");
        } else
          log(
            s,
            `Aid from ${name(a.from)} to ${name(a.to)} lost: route interrupted.`,
            "diplomacy",
          );
      }
    }
    s.aid = s.aid.filter((a) => a.days > 0);
    for (const cr of s.crises.filter(
      (c) => c.status === "negotiating" && c.deadline <= s.day,
    )) {
      if (
        acceptance(s, cr).score >= 0 &&
        s.countries[cr.from].treasury >= cr.offer
      )
        command(
          s,
          map,
          { type: "resolve", id: cr.id, action: "negotiate" },
          cr.from,
        );
      else {
        cr.status = "rejected";
        log(
          s,
          `${name(cr.to)} refuses ${name(cr.from)}'s demands. The crisis expires without war.`,
          "diplomacy",
        );
      }
    }
    s.escalation = clamp(s.escalation - 0.025);
    if (s.day % 30 === 0) {
      for (const c of Object.values(s.countries)) {
        if (atWar(s, c.id, "SYR") || atWar(s, c.id, "OPP")) {
          c.support = clamp(c.support - s.harm * 0.02);
          c.stability = clamp(c.stability - s.displaced * 0.0005);
        }
      }
    }
    const c = s.countries[s.player];
    if (
      !s.defeated &&
      (c.lostCapitalDays >= 30 ||
        c.stability <= 0 ||
        !Object.values(s.provinces).some((p) => p.controller === s.player))
    ) {
      s.defeated = true;
      log(
        s,
        `${name(s.player)} can no longer sustain its government. Continue as observer or reload.`,
      );
    }
    if (s.day === 365)
      log(
        s,
        "One year has passed. The sandbox continues; review your national position.",
      );
  }
  return s;
}
export function validateState(input: unknown, map: MapData): State {
  if (!input || typeof input !== "object")
    throw Error("Save is not an object.");
  const s = input as State;
  if (s.version !== 1 || s.mapKey !== key(map))
    throw Error("Save version or map does not match this build.");
  if (
    !Number.isInteger(s.day) ||
    s.day < 0 ||
    s.day > 365000 ||
    !Number.isInteger(s.seed) ||
    !META[s.player] ||
    !META[s.player].playable
  )
    throw Error("Invalid campaign header.");
  if (
    !s.countries ||
    !s.provinces ||
    !Array.isArray(s.armies) ||
    !Array.isArray(s.crises) ||
    !Array.isArray(s.treaties) ||
    !Array.isArray(s.wars) ||
    !Array.isArray(s.events) ||
    !Array.isArray(s.aid) ||
    !Array.isArray(s.achievements)
  )
    throw Error("Missing campaign data.");
  for (const id of Object.keys(META)) {
    const c = s.countries[id];
    if (!c || c.id !== id) throw Error("Missing country.");
    for (const k of [
      "treasury",
      "debt",
      "fuel",
      "equipment",
      "energy",
      "goods",
      "support",
      "stability",
      "legitimacy",
      "tax",
      "defence",
      "income",
      "expense",
      "lostCapitalDays",
    ])
      if (!Number.isFinite((c as any)[k]))
        throw Error("Invalid country value.");
    if (
      c.treasury < 0 ||
      c.fuel < 0 ||
      c.equipment < 0 ||
      c.support < 0 ||
      c.support > 100 ||
      c.tax < 10 ||
      c.tax > 70 ||
      c.defence < 10 ||
      c.defence > 70 ||
      typeof c.mobilized !== "boolean" ||
      !["standby", "recon", "support"].includes(c.air)
    )
      throw Error("Country values out of range.");
    if (c.capital && !s.provinces[c.capital]) throw Error("Invalid capital.");
  }
  if (Object.keys(s.provinces).length !== map.features.length)
    throw Error("Province count mismatch.");
  for (const f of map.features) {
    const p = s.provinces[f.id];
    if (!p || p.id !== f.id || !META[p.owner] || !META[p.controller])
      throw Error("Invalid province reference.");
    for (const k of ["infra", "industry", "depot", "damage", "population"])
      if (!Number.isFinite((p as any)[k]) || (p as any)[k] < 0)
        throw Error("Invalid province value.");
    if (
      p.project &&
      (!["industry", "depot", "equipment"].includes(p.project.kind) ||
        !Number.isFinite(p.project.days) ||
        p.project.days < 0)
    )
      throw Error("Invalid construction.");
  }
  const ids = new Set<string>();
  for (const a of s.armies) {
    if (
      ids.has(a.id) ||
      !s.provinces[a.province] ||
      !META[a.country] ||
      (a.objective && !s.provinces[a.objective]) ||
      !["hold", "move", "front", "advance"].includes(a.stance)
    )
      throw Error("Invalid army.");
    ids.add(a.id);
    for (const n of ["strength", "org", "supply", "progress", "retreats"])
      if (!Number.isFinite((a as any)[n]) || (a as any)[n] < 0)
        throw Error("Invalid army value.");
  }
  for (const w of s.wars)
    if (
      !Array.isArray(w) ||
      w.length !== 2 ||
      w[0] === w[1] ||
      !w.every((x) => META[x])
    )
      throw Error("Invalid war.");
  for (const t of s.treaties)
    if (
      !META[t.a] ||
      !META[t.b] ||
      ![
        "access",
        "trade",
        "guarantee",
        "ceasefire",
        "sanction",
        "blockade",
      ].includes(t.kind) ||
      !Number.isFinite(t.until)
    )
      throw Error("Invalid treaty.");
  for (const c of s.crises)
    if (
      !META[c.from] ||
      !META[c.to] ||
      !["access", "ceasefire", "withdrawal"].includes(c.demand) ||
      !["negotiating", "agreed", "war", "backdown", "rejected"].includes(
        c.status,
      ) ||
      !Number.isFinite(c.offer) ||
      c.offer < 0 ||
      c.offer > 150 ||
      !Number.isFinite(c.day) ||
      !Number.isFinite(c.deadline) ||
      !Array.isArray(c.supporters) ||
      !c.supporters.every((x) => META[x])
    )
      throw Error("Invalid crisis.");
  for (const a of s.aid)
    if (
      !META[a.from] ||
      !META[a.to] ||
      !Number.isFinite(a.amount) ||
      a.amount < 0 ||
      !Number.isFinite(a.days)
    )
      throw Error("Invalid aid.");
  for (const v of ["harm", "displaced", "escalation", "commands", "nextId"])
    if (!Number.isFinite((s as any)[v]) || (s as any)[v] < 0)
      throw Error("Invalid simulation value.");
  if (
    s.events.length > 120 ||
    s.events.some(
      (e) => typeof e.text !== "string" || !Number.isFinite(e.day),
    ) ||
    typeof s.guided !== "boolean" ||
    typeof s.observer !== "boolean" ||
    typeof s.defeated !== "boolean"
  )
    throw Error("Invalid campaign metadata.");
  return s;
}
export const serialize = (s: State) =>
  JSON.stringify({ format: "fault-lines", version: 1, state: s });
export function deserialize(text: string, map: MapData) {
  if (text.length > 8_000_000) throw Error("Save file is too large.");
  const e = JSON.parse(text);
  if (e.format !== "fault-lines" || e.version !== 1)
    throw Error("Not a supported Fault Lines save.");
  return validateState(e.state, map);
}
