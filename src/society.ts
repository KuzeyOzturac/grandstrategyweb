/** National management: a small connected model, not Victoria 3's implementation. */
import type { State, Command, Result } from "./engine";
import type { MapData } from "./scenario";
import { name } from "./scenario";
export const GOODS = {
  food: { name: "Food", base: 20 },
  energy: { name: "Energy", base: 25 },
  consumer: { name: "Consumer goods", base: 30 },
  arms: { name: "Military supplies", base: 40 },
} as const;
export type Good = keyof typeof GOODS;
export const BUILDINGS = {
  food: {
    name: "Agricultural complex",
    cost: 30,
    days: 18,
    output: "food",
    units: 10,
    jobs: 4,
  },
  energy: {
    name: "Power & fuel complex",
    cost: 40,
    days: 24,
    output: "energy",
    units: 12,
    jobs: 3,
  },
  consumer: {
    name: "Manufacturing district",
    cost: 35,
    days: 22,
    output: "consumer",
    units: 10,
    jobs: 6,
  },
  arms: {
    name: "Defence works",
    cost: 40,
    days: 25,
    output: "arms",
    units: 8,
    jobs: 4,
  },
  administration: {
    name: "Administration offices",
    cost: 25,
    days: 16,
    output: null,
    units: 0,
    jobs: 2,
  },
  university: {
    name: "Research institute",
    cost: 35,
    days: 24,
    output: null,
    units: 0,
    jobs: 3,
  },
} as const;
export type BuildingKind = keyof typeof BUILDINGS;
export const GROUPS = {
  business: "Business owners",
  workers: "Workers & households",
  security: "Armed forces",
  civic: "Civil society",
} as const;
export type Group = keyof typeof GROUPS;
export { LAWS, LAW_GROUPS, lawEffects, currentLaw, lawChances } from "./laws";
import {
  LAWS,
  LAW_GROUPS,
  lawEffects,
  currentLaw,
  lawChances,
  type Law,
} from "./laws";
export type { Law } from "./laws";
export const TECH = {
  productivity: {
    name: "Industrial automation",
    effect: "Production +15% and construction +20%.",
    days: 70,
  },
  logistics: {
    name: "Integrated logistics",
    effect: "Army supply +10 and trade capacity +25%.",
    days: 55,
  },
  administration: {
    name: "Digital administration",
    effect: "Bureaucracy +20; tax revenue +8%.",
    days: 60,
  },
} as const;
export type Tech = keyof typeof TECH;
export type Society = {
  living: number;
  employment: number;
  radicals: number;
  loyalists: number;
  gdp: number;
  bureaucracy: number;
  influence: number;
  infamy: number;
  market: Record<
    Good,
    { supply: number; demand: number; price: number; net: number }
  >;
  groups: Record<Group, { clout: number; approval: number }>;
  government: Group[];
  laws: Law[];
  enacting: null | {
    law: Law;
    progress: number;
    stage?: number;
    setbacks?: number;
    outcome?: string;
  };
  lawCooldowns?: Record<string, number>;
  research: { topic: Tech | null; progress: number; completed: Tech[] };
  buildings: {
    id: string;
    province: string;
    kind: BuildingKind;
    level: number;
    method: "standard" | "automated";
  }[];
  queue: {
    id: string;
    province: string;
    kind: BuildingKind;
    remaining: number;
    total: number;
    paid: number;
  }[];
  routes: {
    id: string;
    partner: string;
    good: Good;
    direction: "import" | "export";
    volume: number;
    active: boolean;
  }[];
  missions: Record<string, "improve" | "rival">;
  relations: Record<string, number>;
  postures: Record<string, "advance" | "defend" | "standby">;
  obligations: string[];
  history: { day: number; living: number; gdp: number; radicals: number }[];
  decision: null | {
    id: number;
    kind: "energy" | "social";
    title: string;
    body: string;
  };
};
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const log = (
  s: State,
  text: string,
  kind: "economy" | "diplomacy" | "system" = "system",
) => {
  s.events.unshift({ day: s.day, text, kind });
  s.events = s.events.slice(0, 120);
};
export function ensureSociety(s: State) {
  if (s.society) {
    for (const n of Object.values(s.society)) {
      for (const g of Object.values(LAW_GROUPS))
        if (!n.laws.some((l) => g.choices.includes(l)))
          n.laws.push(g.choices[0]);
    }
    return;
  }
  s.society = {};
  for (const id of Object.keys(s.countries)) s.society[id] = initial(id);
}
function initial(id: string): Society {
  return {
    living: id === "SYR" ? 11.8 : id === "TUR" ? 15.2 : 14.1,
    employment: 78,
    radicals: id === "SYR" ? 27 : 13,
    loyalists: 22,
    gdp: 100,
    bureaucracy: 65,
    influence: 60,
    infamy: 0,
    market: Object.fromEntries(
      Object.keys(GOODS).map((g) => [
        g,
        { supply: 30, demand: 35, price: 25, net: 0 },
      ]),
    ) as Society["market"],
    groups: {
      business: { clout: 30, approval: 2 },
      workers: { clout: 30, approval: -1 },
      security: { clout: 25, approval: 3 },
      civic: { clout: 15, approval: 0 },
    },
    government: ["business", "security"],
    laws: Object.values(LAW_GROUPS).map((g) => g.choices[0]),
    enacting: null,
    research: { topic: null, progress: 0, completed: [] },
    buildings: [],
    queue: [],
    routes: [],
    missions: {},
    relations: {},
    postures: {},
    obligations: [],
    history: [],
    decision: null,
  };
}
export const society = (s: State, id = s.player) => s.society![id];
export function lawSupport(n: Society, law: Law) {
  return Object.entries(n.groups).reduce(
    (v, [k, g]) =>
      v +
      (LAWS[law].support[k as Group] > 0
        ? g.clout
        : LAWS[law].support[k as Group] < 0
          ? -g.clout * 0.2
          : 0),
    0,
  );
}
export function capacity(n: Society) {
  return Math.max(
    0,
    80 +
      n.buildings.filter((b) => b.kind === "administration").length * 20 +
      (n.research.completed.includes("administration") ? 20 : 0) -
      lawEffects(n).bureaucracy -
      n.routes.length * 6,
  );
}
export function influence(n: Society) {
  return Math.max(
    0,
    60 - Object.keys(n.missions).length * 12 - n.obligations.length * 8,
  );
}
export function power(s: State, id: string) {
  return s.armies
    .filter((a) => a.country === id)
    .reduce(
      (v, a) => v + a.strength * (0.3 + a.org / 100) * (0.2 + a.supply / 100),
      0,
    );
}
export function eligible(
  s: State,
  id: string,
  type: string,
  to?: string,
): string | null {
  const c = s.countries[id],
    n = s.society?.[id];
  if (!n) return "National model unavailable.";
  if (s.observer || s.defeated)
    return "National orders unavailable in observer mode.";
  if (to === id) return "Select another country.";
  if (to && !s.countries[to]) return "Outside the active campaign.";
  if (type === "improve" || type === "rival") {
    if (n.missions[to!] === type) return "Mission already active.";
    if (influence(n) < 12 && !n.missions[to!])
      return "Requires 12 free influence.";
    if (c.treasury < 5) return "Requires 5 credits.";
  }
  return null;
}
export function societyCommand(
  s: State,
  map: MapData,
  cmd: Command,
  actor: string,
): Result | null {
  const types = [
    "construct",
    "cancel_construction",
    "prioritize",
    "production",
    "trade_route",
    "close_route",
    "improve",
    "rival",
    "stop_mission",
    "enact",
    "cancel_law",
    "government",
    "research",
    "posture",
    "decision",
  ];
  if (!types.includes(cmd.type)) return null;
  ensureSociety(s);
  const n = society(s, actor),
    c = s.countries[actor];
  const fail = (message: string) => ({ ok: false, message }),
    ok = (message: string) => {
      s.commands++;
      return { ok: true, message };
    };
  if (cmd.type === "construct") {
    const b = BUILDINGS[cmd.kind as BuildingKind],
      p = s.provinces[cmd.province];
    if (!b) return fail("Unknown building.");
    if (!p || p.owner !== actor || p.controller !== actor)
      return fail("Choose an owned state you control.");
    if (n.queue.length >= 6)
      return fail("Construction queue is full (6 projects).");
    if (c.treasury < b.cost) return fail(`Requires ${b.cost} credits.`);
    c.treasury -= b.cost;
    n.queue.push({
      id: `q${s.nextId++}`,
      province: p.id,
      kind: cmd.kind,
      remaining: b.days,
      total: b.days,
      paid: b.cost,
    });
    log(s, `${name(actor)} queues ${b.name}.`, "economy");
    return ok(
      "Construction queued. The first project receives national capacity.",
    );
  }
  if (cmd.type === "cancel_construction") {
    const i = n.queue.findIndex((q) => q.id === cmd.id);
    if (i < 0) return fail("Project not found.");
    const q = n.queue[i];
    c.treasury += q.paid * (q.remaining / q.total) * 0.75;
    n.queue.splice(i, 1);
    return ok("Project cancelled; 75% of its unbuilt share refunded.");
  }
  if (cmd.type === "prioritize") {
    const i = n.queue.findIndex((q) => q.id === cmd.id);
    if (i < 1) return fail("Project is already first or unavailable.");
    n.queue.unshift(n.queue.splice(i, 1)[0]);
    return ok("Project moved to the front of the queue.");
  }
  if (cmd.type === "production") {
    const b = n.buildings.find((b) => b.id === cmd.id);
    if (!b || !["standard", "automated"].includes(cmd.method))
      return fail("Unknown production method or building.");
    if (
      cmd.method === "automated" &&
      !n.research.completed.includes("productivity")
    )
      return fail("Research industrial automation first.");
    b.method = cmd.method;
    return ok(
      "Production method changed. Automated facilities produce more and consume energy.",
    );
  }
  if (cmd.type === "trade_route") {
    if (
      !s.countries[cmd.to] ||
      cmd.to === actor ||
      !GOODS[cmd.good as Good] ||
      !["import", "export"].includes(cmd.direction)
    )
      return fail("Select a valid partner, good and direction.");
    if (s.wars.some((w) => w.includes(actor) && w.includes(cmd.to)))
      return fail("Cannot trade with a wartime enemy.");
    if (
      s.treaties.some(
        (t) =>
          t.kind === "sanction" &&
          [actor, cmd.to].includes(t.a) &&
          [actor, cmd.to].includes(t.b) &&
          t.until > s.day,
      )
    )
      return fail("An embargo blocks this partner.");
    if (
      n.routes.some(
        (r) =>
          r.partner === cmd.to &&
          r.good === cmd.good &&
          r.direction === cmd.direction,
      )
    )
      return fail("This route already exists.");
    if (capacity(n) < 6) return fail("Requires 6 bureaucracy.");
    if (c.treasury < 10) return fail("Requires 10 credits.");
    c.treasury -= 10;
    n.routes.push({
      id: `r${s.nextId++}`,
      partner: cmd.to,
      good: cmd.good,
      direction: cmd.direction,
      volume: 0,
      active: true,
    });
    return ok(
      "Trade route opened. Volume responds to surplus, demand and access.",
    );
  }
  if (cmd.type === "close_route") {
    const i = n.routes.findIndex((r) => r.id === cmd.id);
    if (i < 0) return fail("Route not found.");
    n.routes.splice(i, 1);
    return ok("Trade route closed.");
  }
  if (["improve", "rival"].includes(cmd.type)) {
    const why = eligible(s, actor, cmd.type, cmd.to);
    if (why) return fail(why);
    n.missions[cmd.to] = cmd.type as "improve" | "rival";
    c.treasury -= 5;
    return ok(
      `${cmd.type === "improve" ? "Improving" : "Damaging"} relations over time; 12 influence committed.`,
    );
  }
  if (cmd.type === "stop_mission") {
    delete n.missions[cmd.to];
    return ok("Diplomatic mission recalled.");
  }
  if (cmd.type === "enact") {
    if (!LAWS[cmd.law as Law]) return fail("Unknown reform.");
    if (n.laws.includes(cmd.law)) return fail("Law already enacted.");
    const proposed = LAWS[cmd.law as Law];
    if ((n.lawCooldowns?.[proposed.group] ?? 0) > s.day)
      return fail(
        "This policy area is cooling down after an abandoned reform.",
      );
    if (c.legitimacy < 25)
      return fail("Legitimacy must reach 25 to introduce a reform.");
    if (n.enacting) return fail("A reform is already being debated.");
    if (lawSupport(n, cmd.law) < 35)
      return fail("Insufficient political support (35 required).");
    if (capacity(n) < 15) return fail("Requires 15 bureaucracy to administer.");
    if (c.treasury < 15) return fail("Requires 15 credits to begin reform.");
    c.treasury -= 15;
    n.enacting = {
      law: cmd.law,
      progress: 0,
      stage: 0,
      setbacks: 0,
      outcome: "Drafting begins",
    };
    log(s, `${name(actor)} begins debate on ${LAWS[cmd.law as Law].name}.`);
    return ok(
      "Reform debate started. Support and legitimacy determine progress.",
    );
  }
  if (cmd.type === "cancel_law") {
    if (!n.enacting) return fail("No reform to abandon.");
    n.lawCooldowns ??= {};
    n.lawCooldowns[LAWS[n.enacting.law].group] = s.day + 60;
    n.radicals = clamp(n.radicals + lawSupport(n, n.enacting.law) * 0.04);
    n.enacting = null;
    return ok(
      "Reform abandoned: supporters radicalize; this policy area has a 60-day cooldown.",
    );
  }
  if (cmd.type === "government") {
    const ids = cmd.groups as Group[];
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      new Set(ids).size !== ids.length ||
      ids.some((k) => !GROUPS[k])
    )
      return fail("Select valid government groups.");
    const clout = ids.reduce((a, k) => a + n.groups[k].clout, 0);
    if (clout < 50)
      return fail("Government needs at least 50% political clout.");
    n.government = ids;
    c.legitimacy = clamp(
      35 + clout * 0.5 + ids.reduce((v, k) => v + n.groups[k].approval, 0),
    );
    return ok("Government coalition reformed.");
  }
  if (cmd.type === "research") {
    if (!TECH[cmd.topic as Tech]) return fail("Unknown research.");
    if (n.research.completed.includes(cmd.topic))
      return fail("Technology already researched.");
    if (n.research.topic)
      return fail("Finish current research before starting another project.");
    n.research.topic = cmd.topic;
    n.research.progress = 0;
    return ok(
      "Research started. Universities and education accelerate progress.",
    );
  }
  if (cmd.type === "posture") {
    if (
      !s.countries[cmd.to] ||
      !["advance", "defend", "standby"].includes(cmd.posture)
    )
      return fail("Choose a front and posture.");
    if (!s.wars.some((w) => w.includes(actor) && w.includes(cmd.to)))
      return fail("No active front with this country.");
    n.postures[cmd.to] = cmd.posture;
    for (const a of s.armies.filter((a) => a.country === actor)) {
      a.objective = null;
      a.stance = "hold";
      a.manualUntil = 0;
    }
    return ok(
      `Commanders ordered to ${cmd.posture}; deployments and battles are automatic.`,
    );
  }
  if (cmd.type === "decision") {
    if (!n.decision) return fail("No pending decision.");
    if (!["invest", "relief", "dismiss"].includes(cmd.choice))
      return fail("Unknown decision.");
    if (cmd.choice !== "dismiss" && c.treasury < 20)
      return fail("Requires 20 credits.");
    if (cmd.choice !== "dismiss") c.treasury -= 20;
    if (cmd.choice === "invest") {
      c.energy = clamp(c.energy + 15, 0, 150);
      n.groups.business.approval = clamp(
        n.groups.business.approval + 2,
        -10,
        10,
      );
    } else if (cmd.choice === "relief") {
      n.radicals = clamp(n.radicals - 5);
      n.living += 0.4;
    } else {
      n.radicals = clamp(n.radicals + 3);
      c.support = clamp(c.support - 2);
    }
    log(
      s,
      `${name(actor)} resolves ${n.decision.title.toLowerCase()}: ${cmd.choice}.`,
    );
    n.decision = null;
    return ok("Decision implemented.");
  }
  return null;
}
export function societyTick(s: State, map: MapData) {
  ensureSociety(s);
  const ids = Object.keys(s.countries),
    base: Record<string, Record<Good, { supply: number; demand: number }>> = {};
  for (const id of ids) {
    const c = s.countries[id],
      n = society(s, id);
    const ps = Object.values(s.provinces).filter((p) => p.controller === id),
      size = Math.max(0.6, ps.reduce((v, p) => v + p.population, 0) / 6000);
    const damage = ps.length
      ? ps.reduce((v, p) => v + p.damage, 0) / ps.length
      : 0;
    const mix =
      id === "IRN"
        ? { food: 0.85, energy: 1.7, consumer: 0.75, arms: 1.1 }
        : id === "TUR"
          ? { food: 1.15, energy: 0.62, consumer: 1.05, arms: 0.9 }
          : id === "SYR" || id === "OPP"
            ? { food: 0.78, energy: 0.7, consumer: 0.65, arms: 0.65 }
            : { food: 1.05, energy: 1.1, consumer: 1, arms: 1 };
    base[id] = {} as (typeof base)[string];
    for (const good of Object.keys(GOODS) as Good[]) {
      const demand =
        (good === "arms"
          ? 8 + c.defence * 0.3 + (c.mobilized ? 8 : 0)
          : good === "food"
            ? 28
            : good === "energy"
              ? 25
              : 23) * size;
      let supply =
        demand *
        mix[good] *
        (1 - damage / 160) *
        (n.research.completed.includes("productivity") ? 1.15 : 1) *
        (1 + lawEffects(n).output / 100);
      for (const b of n.buildings) {
        if (BUILDINGS[b.kind].output === good)
          supply +=
            BUILDINGS[b.kind].units *
            b.level *
            (b.method === "automated" ? 1.4 : 1);
        if (good === "energy" && b.method === "automated")
          supply -= 2 * b.level;
      }
      base[id][good] = { supply: Math.max(0, supply), demand };
    }
  }
  // Routes consume an exporter's real surplus. Reserving it prevents duplicated supply across routes.
  const available = structuredClone(base);
  const flows: Record<string, Record<Good, number>> = Object.fromEntries(
    ids.map((id) => [id, { food: 0, energy: 0, consumer: 0, arms: 0 }]),
  );
  for (const id of ids)
    for (const r of society(s, id).routes) {
      const from = r.direction === "import" ? r.partner : id,
        to = r.direction === "import" ? id : r.partner;
      const war = s.wars.some((w) => w.includes(from) && w.includes(to));
      const embargo = s.treaties.some(
        (t) =>
          t.kind === "sanction" &&
          [from, to].includes(t.a) &&
          [from, to].includes(t.b) &&
          t.until > s.day,
      );
      const sea = s.countries[from].port && s.countries[to].port;
      const adjacent = map.features.some(
        (f) =>
          f.properties.country === from &&
          map.adjacency[f.id].some((p) => s.provinces[p].controller === to),
      );
      const blocked =
        sea &&
        s.treaties.some(
          (t) =>
            t.kind === "blockade" &&
            [from, to].includes(t.b) &&
            t.until > s.day,
        );
      r.active = !war && !embargo && (adjacent || (!!sea && !blocked));
      const surplus = Math.max(
          0,
          available[from][r.good].supply - available[from][r.good].demand,
        ),
        need = Math.max(
          0,
          base[to][r.good].demand - base[to][r.good].supply - flows[to][r.good],
        );
      r.volume = r.active
        ? Math.min(
            surplus,
            need,
            12 *
              (society(s, id).laws.includes("free_trade") ? 1.4 : 1) *
              (society(s, id).research.completed.includes("logistics")
                ? 1.25
                : 1),
          )
        : 0;
      available[from][r.good].supply -= r.volume;
      flows[from][r.good] -= r.volume;
      flows[to][r.good] += r.volume;
    }
  for (const id of ids) {
    const c = s.countries[id],
      n = society(s, id);
    let output = 0;
    for (const good of Object.keys(GOODS) as Good[]) {
      const b = base[id][good],
        net = flows[id][good],
        supply = b.supply + net;
      const price =
        GOODS[good].base * clamp(b.demand / Math.max(1, supply), 0.5, 1.75);
      n.market[good] = { supply, demand: b.demand, price, net };
      output += (b.supply * GOODS[good].base) / 20;
    }
    n.gdp = output;
    const weights = {
      business:
        30 +
        Math.min(
          10,
          n.buildings.filter((b) =>
            ["consumer", "arms", "energy"].includes(b.kind),
          ).length * 1.2,
        ),
      workers:
        30 +
        Math.min(5, n.buildings.filter((b) => b.kind === "food").length * 0.5),
      security: 25 + (c.mobilized ? 5 : 0),
      civic:
        15 +
        Math.min(
          10,
          n.buildings.filter((b) => b.kind === "university").length * 2,
        ),
    };
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(GROUPS) as Group[])
      n.groups[k].clout = (weights[k] / total) * 100;
    n.employment = clamp(
      76 +
        n.buildings.reduce((v, b) => v + BUILDINGS[b.kind].jobs * b.level, 0) *
          0.35 -
        (c.mobilized ? 3 : 0),
      0,
      98,
    );
    n.bureaucracy = capacity(n);
    n.influence = influence(n);
    n.infamy = Math.max(0, n.infamy - 0.03);
    const basket =
      (n.market.food.price / 20 +
        n.market.consumer.price / 30 +
        n.market.energy.price / 25) /
      3;
    const target = clamp(
      13.5 +
        (n.employment - 75) * 0.09 +
        lawEffects(n).living -
        (basket - 1) * 5 -
        (c.tax - 30) * 0.035,
      5,
      30,
    );
    n.living += clamp(target - n.living, -0.035, 0.035);
    n.radicals = clamp(
      n.radicals +
        (n.living < 12 ? 0.045 : -0.018) +
        (c.tax > 45 ? 0.025 : 0) -
        lawEffects(n).calm / 1000,
    );
    n.loyalists = clamp(n.loyalists + (n.living > 15 ? 0.025 : -0.01));
    c.energy = clamp(
      c.energy + (n.market.energy.supply / n.market.energy.demand - 1) * 0.4,
      0,
      150,
    );
    c.goods = clamp(
      c.goods + (n.market.consumer.supply / n.market.consumer.demand - 1) * 0.4,
    );
    c.legitimacy = clamp(
      c.legitimacy +
        (n.government.reduce((v, k) => v + n.groups[k].clout, 0) < 50
          ? -0.1
          : 0.01),
    );
    c.support = clamp(
      c.support + (n.living - 13) * 0.006 - n.radicals * 0.0004,
    );
    const cost = lawEffects(n).cost + Object.keys(n.missions).length * 0.08;
    const revenue =
      n.routes.reduce((v, r) => v + r.volume * 0.01, 0) *
        (n.laws.includes("free_trade") ? 0.5 : 1) +
      output *
        0.0015 *
        (n.research.completed.includes("administration") ? 1.08 : 1);
    c.income += revenue;
    c.expense += cost;
    c.treasury += revenue - cost;
    if (c.treasury < 0) {
      c.debt -= c.treasury;
      c.treasury = 0;
    }
    for (const [to, mission] of Object.entries(n.missions)) {
      n.relations[to] = clamp(
        (n.relations[to] ?? 0) + (mission === "improve" ? 0.4 : -0.4),
        -60,
        60,
      );
    }
    const approvals = {
      business:
        2 + (c.tax < 35 ? 1 : -2) + (n.laws.includes("free_trade") ? 2 : 0),
      workers:
        (n.living - 13) * 1.2 +
        (n.laws.includes("labor") ? 3 : 0) +
        (n.laws.includes("healthcare") ? 2 : 0) -
        (c.tax > 40 ? 2 : 0),
      security: c.defence / 12 - 1 + (c.mobilized ? 1 : 0),
      civic:
        (c.legitimacy - 60) / 12 +
        (n.laws.includes("education") ? 3 : 0) -
        (s.escalation > 60 ? 2 : 0),
    };
    for (const k of Object.keys(GROUPS) as Group[])
      n.groups[k].approval = clamp(
        n.groups[k].approval +
          clamp(approvals[k] - n.groups[k].approval, -0.08, 0.08),
        -10,
        10,
      );
    const q = n.queue[0];
    if (q && s.provinces[q.province]?.controller === id) {
      q.remaining -=
        1 *
        (n.research.completed.includes("productivity") ? 1.2 : 1) *
        (n.bureaucracy > 0 ? 1 : 0.5);
      if (q.remaining <= 0) {
        n.buildings.push({
          id: `b${s.nextId++}`,
          province: q.province,
          kind: q.kind,
          level: 1,
          method: "standard",
        });
        s.provinces[q.province].industry++;
        log(s, `${name(id)} completes ${BUILDINGS[q.kind].name}.`, "economy");
        n.queue.shift();
      }
    }
    if (n.enacting && c.legitimacy >= 25) {
      const e = n.enacting;
      e.progress += Math.max(0.25, c.legitimacy / 75);
      if (e.progress >= 12) {
        e.progress = 0;
        const chances = lawChances(n, e.law);
        s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
        const roll = (s.seed / 4294967296) * 100;
        if (roll < chances.advance) {
          e.stage = (e.stage ?? 0) + 1;
          e.outcome = "Advance: legislative stage approved";
        } else if (roll < chances.advance + chances.debate) {
          e.outcome = "Debate: another hearing required";
          n.groups.civic.approval = clamp(
            n.groups.civic.approval + 0.5,
            -20,
            20,
          );
        } else {
          e.setbacks = (e.setbacks ?? 0) + 1;
          e.outcome = "Setback: opposition blocks the bill";
          n.radicals = clamp(n.radicals + 1);
        }
        log(s, `${name(id)}: ${LAWS[e.law].name} — ${e.outcome}.`);
        if ((e.stage ?? 0) >= 3) {
          const law = e.law,
            group = LAWS[law].group;
          const previous = currentLaw(n, group);
          n.laws = n.laws.filter((l) => LAWS[l].group !== group);
          n.laws.push(law);
          for (const k of Object.keys(GROUPS) as Group[])
            n.groups[k].approval = clamp(
              n.groups[k].approval +
                LAWS[law].support[k] -
                LAWS[previous].support[k],
              -20,
              20,
            );
          n.enacting = null;
          log(
            s,
            `${name(id)} enacts ${LAWS[law].name}, replacing ${LAWS[previous].name}.`,
          );
        } else if ((e.setbacks ?? 0) >= 3) {
          n.lawCooldowns ??= {};
          n.lawCooldowns[LAWS[e.law].group] = s.day + 60;
          n.radicals = clamp(n.radicals + 2);
          n.enacting = null;
          log(s, `${name(id)}'s reform fails after three setbacks.`);
        }
      }
    }
    if (n.research.topic) {
      n.research.progress +=
        (1 + n.buildings.filter((b) => b.kind === "university").length * 0.35) *
        (1 + lawEffects(n).research / 100);
      if (n.research.progress >= TECH[n.research.topic].days) {
        log(s, `${name(id)} completes ${TECH[n.research.topic].name}.`);
        n.research.completed.push(n.research.topic);
        n.research.topic = null;
        n.research.progress = 0;
      }
    }
    if (s.day % 7 === 0) {
      n.history.push({
        day: s.day,
        living: n.living,
        gdp: n.gdp,
        radicals: n.radicals,
      });
      n.history = n.history.slice(-52);
    }
    if (s.day % 30 === 7 && !n.decision) {
      const energy = n.market.energy.supply < n.market.energy.demand;
      n.decision = {
        id: s.day,
        kind: energy ? "energy" : "social",
        title: energy
          ? "Energy prices under pressure"
          : "Households demand investment",
        body: energy
          ? "Businesses request energy investment while households ask for relief. Both compete for the national budget."
          : "Households want public relief; business groups argue for productive investment.",
      };
      if (id === s.player) log(s, `Decision available: ${n.decision.title}.`);
    }
    // Basic AI uses the same priced management commands.
    if (s.day > 0 && (id !== s.player || s.observer) && s.day % 21 === 0) {
      if (n.queue.length < 2 && c.treasury > 100 && c.capital) {
        const shortage = (Object.keys(GOODS) as Good[]).sort(
          (a, b) =>
            n.market[b].price / GOODS[b].base -
            n.market[a].price / GOODS[a].base,
        )[0];
        societyCommand(
          s,
          map,
          { type: "construct", kind: shortage, province: c.capital },
          id,
        );
      }
      if (n.routes.length < 2 && c.treasury > 60) {
        const good = (Object.keys(GOODS) as Good[]).find(
          (g) => n.market[g].price > GOODS[g].base * 1.1,
        );
        if (good) {
          const partner = ids.find(
            (to) =>
              to !== id &&
              society(s, to).market[good].supply >
                society(s, to).market[good].demand &&
              !n.routes.some((r) => r.partner === to && r.good === good),
          );
          if (partner)
            societyCommand(
              s,
              map,
              { type: "trade_route", to: partner, good, direction: "import" },
              id,
            );
        }
      }
      if (!n.research.topic) {
        const topic = (Object.keys(TECH) as Tech[]).find(
          (t) => !n.research.completed.includes(t),
        );
        if (topic) societyCommand(s, map, { type: "research", topic }, id);
      }
      if (n.decision)
        societyCommand(
          s,
          map,
          { type: "decision", choice: c.treasury > 50 ? "relief" : "dismiss" },
          id,
        );
    }
  }
}
export function validateSociety(s: State) {
  ensureSociety(s);
  for (const id of Object.keys(s.countries)) {
    const n = s.society![id];
    if (
      !n ||
      !Array.isArray(n.queue) ||
      !Array.isArray(n.buildings) ||
      !Array.isArray(n.routes) ||
      !Array.isArray(n.laws) ||
      !Array.isArray(n.government) ||
      !Array.isArray(n.history) ||
      !Array.isArray(n.obligations) ||
      !n.research ||
      !Array.isArray(n.research.completed) ||
      !n.market ||
      !n.groups ||
      !n.relations ||
      !n.missions ||
      !n.postures
    )
      throw Error("Invalid national management data.");
    for (const k of [
      "living",
      "employment",
      "radicals",
      "loyalists",
      "gdp",
      "bureaucracy",
      "influence",
      "infamy",
    ] as const)
      if (!Number.isFinite(n[k]) || n[k] < 0)
        throw Error("Invalid national indicator.");
    for (const g of Object.keys(GOODS) as Good[]) {
      const m = n.market[g];
      if (
        !m ||
        ![m.supply, m.demand, m.price, m.net].every(Number.isFinite) ||
        m.supply < 0 ||
        m.price <= 0
      )
        throw Error("Invalid market data.");
    }
    for (const k of Object.keys(GROUPS) as Group[]) {
      const g = n.groups[k];
      if (
        !g ||
        !Number.isFinite(g.clout) ||
        g.clout < 0 ||
        !Number.isFinite(g.approval)
      )
        throw Error("Invalid interest group.");
    }
    if (
      n.laws.some((l) => !LAWS[l]) ||
      n.government.some((g) => !GROUPS[g]) ||
      n.research.completed.some((t) => !TECH[t]) ||
      (n.research.topic && !TECH[n.research.topic]) ||
      !Number.isFinite(n.research.progress)
    )
      throw Error("Invalid law, research or government.");
    for (const [group, def] of Object.entries(LAW_GROUPS)) {
      if (n.laws.filter((l) => def.choices.includes(l)).length !== 1)
        throw Error("Each law group requires exactly one law: " + group);
    }
    if (
      n.lawCooldowns &&
      Object.entries(n.lawCooldowns).some(
        ([g, d]) => !LAW_GROUPS[g] || !Number.isFinite(d) || d < 0,
      )
    )
      throw Error("Invalid reform cooldown.");
    if (
      n.enacting &&
      (![n.enacting.stage ?? 0, n.enacting.setbacks ?? 0].every(
        Number.isInteger,
      ) ||
        (n.enacting.stage ?? 0) < 0 ||
        (n.enacting.stage ?? 0) > 2 ||
        (n.enacting.setbacks ?? 0) < 0 ||
        (n.enacting.setbacks ?? 0) > 2)
    )
      throw Error("Invalid legislative stage.");
    if (
      n.enacting &&
      (!LAWS[n.enacting.law] || !Number.isFinite(n.enacting.progress))
    )
      throw Error("Invalid law debate.");
    for (const q of n.queue)
      if (
        !s.provinces[q.province] ||
        !BUILDINGS[q.kind] ||
        ![q.remaining, q.total, q.paid].every(Number.isFinite) ||
        q.remaining < 0 ||
        q.total <= 0
      )
        throw Error("Invalid construction queue.");
    for (const b of n.buildings)
      if (
        !s.provinces[b.province] ||
        !BUILDINGS[b.kind] ||
        !["standard", "automated"].includes(b.method) ||
        !Number.isFinite(b.level) ||
        b.level < 1
      )
        throw Error("Invalid building.");
    for (const r of n.routes)
      if (
        !s.countries[r.partner] ||
        !GOODS[r.good] ||
        !["import", "export"].includes(r.direction) ||
        !Number.isFinite(r.volume) ||
        r.volume < 0
      )
        throw Error("Invalid trade route.");
    for (const [to, v] of Object.entries(n.relations))
      if (!s.countries[to] || !Number.isFinite(v))
        throw Error("Invalid relationship.");
    for (const [to, v] of Object.entries(n.missions))
      if (!s.countries[to] || !["improve", "rival"].includes(v))
        throw Error("Invalid diplomatic mission.");
    for (const [to, v] of Object.entries(n.postures))
      if (!s.countries[to] || !["advance", "defend", "standby"].includes(v))
        throw Error("Invalid front posture.");
    if (
      n.obligations.some((to) => !s.countries[to]) ||
      n.history.some(
        (h) => ![h.day, h.living, h.gdp, h.radicals].every(Number.isFinite),
      )
    )
      throw Error("Invalid obligations or history.");
    if (
      n.decision &&
      (!Number.isInteger(n.decision.id) ||
        !["energy", "social"].includes(n.decision.kind))
    )
      throw Error("Invalid decision.");
  }
}
