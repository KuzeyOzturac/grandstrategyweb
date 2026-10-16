import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  createState,
  command,
  tick,
  serialize,
  deserialize,
  validateState,
  relation,
  frontSummary,
} from "../src/engine";
import { society, societyTick, BUILDINGS, lawSupport } from "../src/society";
import type { MapData } from "../src/scenario";
const map: MapData = JSON.parse(
  fs.readFileSync("public/data/provinces.json", "utf8"),
);
const fresh = (p = "TUR") => createState(map, p, true, 2012);
describe("National management", () => {
  it("relations missions cost influence and alter diplomatic relationships over time", () => {
    const s = fresh(),
      before = relation(s, "TUR", "SYR");
    expect(command(s, map, { type: "improve", to: "SYR" }).ok).toBe(true);
    tick(s, map, 10);
    expect(relation(s, "TUR", "SYR")).toBeGreaterThan(before);
    expect(society(s).influence).toBe(48);
    command(s, map, { type: "stop_mission", to: "SYR" });
    tick(s, map);
    expect(society(s).influence).toBe(60);
  });
  it("queues construction, honors priority, refunds unused work and produces completed output", () => {
    const s = fresh(),
      n = society(s),
      pid = s.countries.TUR.capital;
    const initial = n.market.energy.supply;
    command(s, map, { type: "construct", kind: "food", province: pid });
    command(s, map, { type: "construct", kind: "energy", province: pid });
    expect(n.queue).toHaveLength(2);
    command(s, map, { type: "prioritize", id: n.queue[1].id });
    expect(n.queue[0].kind).toBe("energy");
    const treasury = s.countries.TUR.treasury;
    command(s, map, { type: "cancel_construction", id: n.queue[1].id });
    expect(s.countries.TUR.treasury).toBe(
      treasury + BUILDINGS.food.cost * 0.75,
    );
    tick(s, map, 25);
    expect(n.buildings.some((b) => b.kind === "energy")).toBe(true);
    expect(n.market.energy.supply).toBeGreaterThan(initial);
    expect(n.queue).toHaveLength(0);
  });
  it("does not mutate state for invalid construction or insufficient funds", () => {
    const s = fresh();
    s.countries.TUR.treasury = 0;
    const before = serialize(s);
    expect(
      command(s, map, {
        type: "construct",
        kind: "energy",
        province: s.countries.TUR.capital,
      }).ok,
    ).toBe(false);
    expect(serialize(s)).toBe(before);
    expect(
      command(s, map, {
        type: "construct",
        kind: "food",
        province: s.countries.IRN.capital,
      }).ok,
    ).toBe(false);
  });
  it("trades actual surplus, reduces import prices and suspends routes under sanctions", () => {
    const s = fresh(),
      n = society(s),
      initial = n.market.energy.price;
    expect(
      command(s, map, {
        type: "trade_route",
        to: "IRN",
        good: "energy",
        direction: "import",
      }).ok,
    ).toBe(true);
    tick(s, map);
    expect(n.routes[0].volume).toBeGreaterThan(0);
    expect(n.market.energy.price).toBeLessThan(initial);
    const snapshot = serialize(s);
    expect(
      command(s, map, {
        type: "trade_route",
        to: "IRN",
        good: "energy",
        direction: "import",
      }).ok,
    ).toBe(false);
    expect(serialize(s)).toBe(snapshot);
    command(s, map, { type: "sanction", to: "IRN" });
    tick(s, map);
    expect(n.routes[0].active).toBe(false);
    expect(n.routes[0].volume).toBe(0);
  });
  it("reforms require support, take time, incur upkeep and affect living standards", () => {
    const s = fresh(),
      baseline = fresh(),
      n = society(s);
    expect(lawSupport(n, "healthcare")).toBeGreaterThanOrEqual(35);
    expect(command(s, map, { type: "enact", law: "healthcare" }).ok).toBe(true);
    expect(n.laws).not.toContain("healthcare");
    expect(command(s, map, { type: "enact", law: "education" }).ok).toBe(false);
    // Fixed checkpoint seeds exercise successful passage without assuming every bill passes.
    for (let i = 0; i < 3; i++) {
      n.enacting!.progress = 12;
      s.seed = 1;
      societyTick(s, map);
    }
    expect(n.laws).not.toContain("private_health");
    tick(s, map, 80);
    tick(baseline, map, 80);
    expect(n.laws).toContain("healthcare");
    expect(n.living).toBeGreaterThan(society(baseline).living);
    expect(s.countries.TUR.expense).toBeGreaterThan(
      baseline.countries.TUR.expense,
    );
  });
  it("government requires majority clout and research unlocks production methods", () => {
    const s = fresh(),
      n = society(s);
    expect(command(s, map, { type: "government", groups: ["civic"] }).ok).toBe(
      false,
    );
    expect(
      command(s, map, { type: "government", groups: ["workers", "business"] })
        .ok,
    ).toBe(true);
    command(s, map, {
      type: "construct",
      kind: "consumer",
      province: s.countries.TUR.capital,
    });
    tick(s, map, 23);
    const b = n.buildings[0];
    expect(
      command(s, map, { type: "production", id: b.id, method: "automated" }).ok,
    ).toBe(false);
    command(s, map, { type: "research", topic: "productivity" });
    tick(s, map, 80);
    expect(n.research.completed).toContain("productivity");
    expect(
      command(s, map, { type: "production", id: b.id, method: "automated" }).ok,
    ).toBe(true);
  });
  it("decisions produce consequences and cannot be taken twice", () => {
    const s = fresh();
    tick(s, map, 7);
    const n = society(s),
      before = n.radicals;
    expect(n.decision).not.toBeNull();
    expect(command(s, map, { type: "decision", choice: "relief" }).ok).toBe(
      true,
    );
    expect(n.radicals).toBe(before - 5);
    expect(n.decision).toBeNull();
    const after = serialize(s);
    expect(command(s, map, { type: "decision", choice: "relief" }).ok).toBe(
      false,
    );
    expect(serialize(s)).toBe(after);
  });
  it("commanders deploy automatically and obey national front postures", () => {
    const s = fresh("SYR");
    command(s, map, { type: "posture", to: "OPP", posture: "standby" });
    tick(s, map, 4);
    expect(
      s.armies
        .filter((a) => a.country === "SYR")
        .every((a) => a.stance === "hold"),
    ).toBe(true);
    command(s, map, { type: "posture", to: "OPP", posture: "advance" });
    tick(s, map);
    expect(
      s.armies.some((a) => a.country === "SYR" && a.stance === "advance"),
    ).toBe(true);
    expect(frontSummary(s, "SYR", "OPP").posture).toBe("advance");
    command(s, map, { type: "posture", to: "OPP", posture: "defend" });
    tick(s, map);
    expect(
      s.armies
        .filter((a) => a.country === "SYR")
        .every((a) => a.stance !== "advance"),
    ).toBe(true);
  });
  it("successful obligation is recorded once and reserves influence", () => {
    const s = fresh();
    command(s, map, { type: "crisis", to: "SYR", demand: "access", offer: 50 });
    const cr = s.crises[0];
    command(s, map, { type: "obligation", id: cr.id, value: true });
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "negotiate" }).ok,
    ).toBe(true);
    expect(society(s).obligations).toEqual(["SYR"]);
    tick(s, map);
    expect(society(s).influence).toBe(52);
  });
  it("migrates earlier saves and rejects corrupt national references", () => {
    const s = fresh();
    delete s.society;
    const restored = deserialize(serialize(s), map);
    expect(society(restored).market.energy).toBeDefined();
    expect(restored.countries).toEqual(s.countries);
    society(restored).queue.push({
      id: "bad",
      province: "missing",
      kind: "energy",
      remaining: 10,
      total: 10,
      paid: 40,
    });
    expect(() => deserialize(serialize(restored), map)).toThrow();
  });
  it("continues deterministically with queues, trade, reform and research in flight", () => {
    const s = fresh();
    command(s, map, {
      type: "construct",
      kind: "energy",
      province: s.countries.TUR.capital,
    });
    command(s, map, {
      type: "trade_route",
      to: "IRN",
      good: "energy",
      direction: "import",
    });
    command(s, map, { type: "enact", law: "education" });
    command(s, map, { type: "research", topic: "administration" });
    tick(s, map, 12);
    const copy = deserialize(serialize(s), map);
    tick(s, map, 180);
    tick(copy, map, 180);
    expect(copy).toEqual(s);
    expect(() => validateState(s, map)).not.toThrow();
  });
  it("incoming proposals wait for the player rather than being accepted on their behalf", () => {
    const s = fresh();
    command(
      s,
      map,
      { type: "crisis", to: "TUR", demand: "access", offer: 100 },
      "IRQ",
    );
    tick(s, map, 15);
    expect(s.crises[0].status).toBe("rejected");
    expect(
      s.treaties.some(
        (t) => t.a === "IRQ" && t.b === "TUR" && t.kind === "access",
      ),
    ).toBe(false);
  });
  it("regional AI initiates a visible proposal without bypassing resource costs", () => {
    const s = fresh();
    tick(s, map, 42);
    const cr = s.crises.find(
      (c) => c.to === "TUR" && c.status === "negotiating",
    );
    expect(cr).toBeDefined();
    expect(cr?.from).toBe("IRQ");
  });
});
