import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { geoArea } from "d3-geo";
import {
  createState,
  command,
  tick,
  acceptance,
  atWar,
  path,
  updateSupply,
  aidRoute,
  serialize,
  deserialize,
  validateState,
} from "../src/engine";
import type { MapData } from "../src/scenario";
const map: MapData = JSON.parse(
  fs.readFileSync("public/data/provinces.json", "utf8"),
);
const fresh = (player = "TUR", seed = 2012) =>
  createState(map, player, true, seed);
describe("Geographic integrity", () => {
  it("ships real geometries, unique IDs, reciprocal valid adjacency and no self edges", () => {
    const ids = new Set(map.features.map((f) => f.id));
    expect(ids.size).toBe(map.features.length);
    expect(ids.size).toBeGreaterThan(250);
    for (const f of map.features) {
      expect(f.geometry.coordinates.length).toBeGreaterThan(0);
      for (const n of map.adjacency[f.id]) {
        expect(ids.has(n)).toBe(true);
        expect(n).not.toBe(f.id);
        expect(map.adjacency[n]).toContain(f.id);
      }
    }
  });
  it("renders polygons as bounded areas rather than inverted oceans", () => {
    for (const f of map.features) expect(geoArea(f as any)).toBeLessThan(0.5);
    const world = JSON.parse(fs.readFileSync("public/data/world.json", "utf8"));
    for (const f of world.features)
      expect(geoArea(f)).toBeLessThan(2 * Math.PI);
  });
  it("starts each government with controlled territory and legal army locations", () => {
    for (const player of ["TUR", "IRN", "SYR"]) {
      const s = fresh(player);
      expect(s.provinces[s.countries[player].capital].controller).toBe(player);
      expect(s.armies.filter((a) => a.country === player)).toHaveLength(3);
      expect(() => validateState(s, map)).not.toThrow();
    }
  });
});
describe("Diplomacy and command validation", () => {
  it("cannot cross a closed border, forge an army or spend unaffordable resources", () => {
    const s = fresh();
    const a = s.armies.find((a) => a.country === "TUR")!;
    const target = map.features.find(
      (f) =>
        f.properties.country === "SYR" &&
        s.provinces[f.id].controller === "SYR",
    )!.id;
    expect(
      command(s, map, {
        type: "order",
        army: a.id,
        province: target,
        stance: "advance",
      }).ok,
    ).toBe(false);
    const before = serialize(s);
    expect(command(s, map, { type: "aid", to: "RUS" }).ok).toBe(false);
    expect(serialize(s)).toBe(before);
    expect(
      command(s, map, { type: "order", army: "bogus", stance: "hold" }).ok,
    ).toBe(false);
    s.countries.TUR.treasury = 0;
    expect(
      command(s, map, { type: "build", province: a.province, kind: "industry" })
        .ok,
    ).toBe(false);
  });
  it("negotiates a compensated agreement, charges it once and permits access", () => {
    const s = fresh();
    expect(
      command(s, map, {
        type: "crisis",
        to: "SYR",
        demand: "access",
        offer: 100,
      }).ok,
    ).toBe(true);
    const cr = s.crises[0];
    expect(acceptance(s, cr).score).toBeGreaterThanOrEqual(0);
    const budget = s.countries.TUR.treasury;
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "negotiate" }).ok,
    ).toBe(true);
    expect(s.countries.TUR.treasury).toBe(budget - 100);
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "negotiate" }).ok,
    ).toBe(false);
    const a = s.armies.find((a) => a.country === "TUR")!;
    expect(
      path(s, map, a.province, s.countries.SYR.capital, "TUR").length,
    ).toBeGreaterThan(0);
  });
  it("refuses weak offers, enforces warning period, then escalates and honours guarantees", () => {
    const s = fresh();
    command(s, map, { type: "crisis", to: "SYR", demand: "access", offer: 0 });
    const cr = s.crises[0];
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "negotiate" }).ok,
    ).toBe(false);
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "escalate" }).ok,
    ).toBe(false);
    tick(s, map, 3);
    const stock = s.countries.SYR.equipment;
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "escalate" }).ok,
    ).toBe(true);
    expect(atWar(s, "TUR", "SYR")).toBe(true);
    expect(s.countries.SYR.equipment).toBeGreaterThan(stock);
    expect(s.events.some((e) => e.text.includes("honours its guarantee"))).toBe(
      true,
    );
  });
  it("expires rejected crises and completes accepted crises without stuck phases", () => {
    const s = fresh();
    command(s, map, { type: "crisis", to: "SYR", demand: "access", offer: 0 });
    tick(s, map, 15);
    expect(s.crises[0].status).toBe("rejected");
    command(s, map, {
      type: "crisis",
      to: "SYR",
      demand: "access",
      offer: 100,
    });
    tick(s, map, 15);
    expect(s.crises[1].status).toBe("agreed");
  });
  it("ceasefire stops fighting and prevents immediate renewed escalation", () => {
    const s = fresh("SYR");
    command(s, map, {
      type: "crisis",
      to: "OPP",
      demand: "ceasefire",
      offer: 100,
    });
    expect(
      command(s, map, {
        type: "resolve",
        id: s.crises[0].id,
        action: "negotiate",
      }).ok,
    ).toBe(true);
    expect(atWar(s, "SYR", "OPP")).toBe(false);
    const h = s.harm,
      control = Object.values(s.provinces).map((p) => p.controller);
    tick(s, map, 12);
    expect(s.harm).toBe(h);
    expect(Object.values(s.provinces).map((p) => p.controller)).toEqual(
      control,
    );
    command(s, map, { type: "crisis", to: "OPP", demand: "access", offer: 0 });
    tick(s, map, 3);
    expect(
      command(s, map, {
        type: "resolve",
        id: s.crises.at(-1)!.id,
        action: "escalate",
      }).ok,
    ).toBe(false);
  });
});
describe("Military and supply", () => {
  it("moves along a legal objective and halts on command", () => {
    const s = fresh();
    const a = s.armies.find((a) => a.country === "TUR")!;
    const next = map.adjacency[a.province].find(
      (n) => s.provinces[n].controller === "TUR",
    )!;
    const from = a.province;
    expect(
      command(s, map, {
        type: "order",
        army: a.id,
        province: next,
        stance: "move",
      }).ok,
    ).toBe(true);
    tick(s, map, 8);
    expect(a.province).toBe(next);
    expect(a.province).not.toBe(from);
    command(s, map, { type: "order", army: a.id, stance: "hold" });
    expect(a.objective).toBe(null);
  });
  it("isolates an army from capital and ports and degrades organization", () => {
    const s = fresh("SYR");
    const a = s.armies.find((a) => a.country === "SYR")!;
    a.objective = null;
    const isolated = map.features.find(
      (f) =>
        f.properties.country === "SYR" &&
        f.id !== s.countries.SYR.capital &&
        f.id !== s.countries.SYR.port,
    )!.id;
    a.province = isolated;
    updateSupply(s, map);
    const supplied = a.supply;
    for (const n of map.adjacency[isolated]) s.provinces[n].controller = "OPP";
    s.countries.SYR.port = null;
    updateSupply(s, map);
    expect(a.supply).toBeLessThan(supplied);
    const org = a.org;
    tick(s, map, 3);
    expect(a.org).toBeLessThan(org);
  });
  it("combat forces retreat and transfers control, leaving ownership intact", () => {
    const s = fresh("SYR");
    const edge = map.features
      .flatMap((f) => map.adjacency[f.id].map((n) => [f.id, n]))
      .find(
        ([a, b]) =>
          s.provinces[a].controller === "SYR" &&
          s.provinces[b].controller === "OPP",
      )!;
    expect(edge).toBeTruthy();
    const a = s.armies.find((a) => a.country === "SYR")!;
    a.province = edge[0];
    a.strength = 100;
    a.org = 100;
    const b = s.armies.find((a) => a.country === "OPP")!;
    b.province = edge[1];
    b.org = 17;
    b.strength = 20;
    s.armies = s.armies.filter((x) => x.id === a.id || x.id === b.id);
    const owner = s.provinces[edge[1]].owner;
    command(s, map, {
      type: "order",
      army: a.id,
      province: edge[1],
      stance: "advance",
    });
    tick(s, map, 15);
    expect(b.retreats > 0 || !s.armies.includes(b)).toBe(true);
    expect(s.provinces[edge[1]].controller).toBe("SYR");
    expect(s.provinces[edge[1]].owner).toBe(owner);
    expect(s.harm).toBeGreaterThan(0);
  });
  it("encircled weak defenders disband rather than teleporting through hostile territory", () => {
    const s = fresh("SYR");
    const edge = map.features
      .flatMap((f) => map.adjacency[f.id].map((n) => [f.id, n]))
      .find(
        ([a, b]) =>
          s.provinces[a].controller === "SYR" &&
          s.provinces[b].controller === "OPP",
      )!;
    const a = s.armies.find((x) => x.country === "SYR")!,
      b = s.armies.find((x) => x.country === "OPP")!;
    a.province = edge[0];
    b.province = edge[1];
    b.org = 10;
    b.strength = 15;
    for (const n of map.adjacency[b.province])
      s.provinces[n].controller = "SYR";
    s.armies = [a, b];
    command(s, map, {
      type: "order",
      army: a.id,
      province: b.province,
      stance: "advance",
    });
    tick(s, map, 4);
    expect(s.armies.some((x) => x.id === b.id)).toBe(false);
  });
});
describe("Economy and aid", () => {
  it("delivers aid only on an open route and deducts resources", () => {
    const s = fresh("IRN");
    expect(aidRoute(s, map, "IRN", "SYR")).toBe(true);
    const before = s.countries.IRN.equipment;
    expect(command(s, map, { type: "aid", to: "SYR" }).ok).toBe(true);
    expect(s.countries.IRN.equipment).toBe(before - 20);
    tick(s, map, 5);
    expect(s.achievements).toContain("aid");
    expect(
      s.events.some((e) => e.text.includes("reaches Syrian government")),
    ).toBe(true);
  });
  it("interrupts a convoy if both land access and maritime delivery are closed", () => {
    const s = fresh("IRN");
    command(s, map, { type: "aid", to: "SYR" });
    s.treaties = s.treaties.filter((t) => t.kind !== "access");
    s.treaties.push({ a: "TUR", b: "SYR", kind: "blockade", until: 90 });
    tick(s, map, 5);
    expect(s.events.some((e) => e.text.includes("route interrupted"))).toBe(
      true,
    );
    expect(s.achievements).not.toContain("aid");
  });
  it("finishes investment, applies sanctions, and charges mobilization costs", () => {
    const s = fresh();
    const p = s.countries.TUR.capital;
    command(s, map, { type: "build", province: p, kind: "industry" });
    const industry = s.provinces[p].industry;
    tick(s, map, 25);
    expect(s.provinces[p].industry).toBe(industry + 1);
    const a = fresh(),
      b = fresh();
    command(b, map, { type: "sanction", to: "IRN" });
    command(b, map, { type: "policy", key: "mobilized", value: true });
    tick(a, map, 10);
    tick(b, map, 10);
    expect(b.countries.IRN.fuel).toBeLessThan(a.countries.IRN.fuel);
    expect(b.countries.TUR.expense).toBeGreaterThan(a.countries.TUR.expense);
    expect(b.countries.TUR.support).toBeLessThan(a.countries.TUR.support);
  });
});
describe("Resource boundaries", () => {
  it("never spends more equipment than remains during mobilized reinforcement", () => {
    const s = fresh();
    s.countries.TUR.equipment = 0.21;
    s.countries.TUR.defence = 10;
    s.countries.TUR.mobilized = true;
    for (const a of ["IRN", "SYR", "IRQ", "SAU"])
      s.treaties.push({ a, b: "TUR", kind: "sanction", until: 90 });
    tick(s, map, 1);
    expect(s.countries.TUR.equipment).toBeGreaterThanOrEqual(0);
    expect(() => validateState(s, map)).not.toThrow();
  });
});

describe("Saves and sustained simulation", () => {
  it("roundtrips exact state and produces identical continuation", () => {
    const s = fresh();
    tick(s, map, 20);
    const r = deserialize(serialize(s), map);
    expect(r).toEqual(s);
    tick(s, map, 30);
    tick(r, map, 30);
    expect(r).toEqual(s);
  });
  it("rejects corrupt saves, unknown references and non-finite values", () => {
    for (const mutate of [
      (s: any) => (s.version = 2),
      (s: any) => (s.countries.TUR.fuel = -20),
      (s: any) => (s.armies[0].province = "missing"),
      (s: any) => (s.crises = [{ from: "fake" }]),
      (s: any) => (s.day = null),
    ]) {
      const s = fresh();
      mutate(s);
      expect(() => deserialize(serialize(s), map)).toThrow();
    }
    expect(() => deserialize("broken", map)).toThrow();
  });
  it("runs seeded observer campaigns and three playable one-year campaigns without invalid state", () => {
    for (const player of ["TUR", "IRN", "SYR"])
      for (const seed of [7, 2012]) {
        const s = fresh(player, seed);
        if (seed === 7) s.observer = true;
        tick(s, map, 400);
        expect(() => validateState(s, map)).not.toThrow();
        expect(
          s.crises.every(
            (c) => c.status !== "negotiating" || c.deadline > s.day,
          ),
        ).toBe(true);
        expect(s.day).toBe(400);
      }
  }, 30000);
  it("defeat enables observer continuation but blocks national commands", () => {
    const s = fresh("SYR");
    for (const p of Object.values(s.provinces))
      if (p.controller === "SYR") p.controller = "OPP";
    tick(s, map);
    expect(s.defeated).toBe(true);
    expect(command(s, map, { type: "policy", key: "tax", value: 40 }).ok).toBe(
      false,
    );
    expect(command(s, map, { type: "observe" }).ok).toBe(true);
    tick(s, map, 2);
    expect(s.day).toBe(3);
  });
});
