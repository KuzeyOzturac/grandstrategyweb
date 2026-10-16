import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  createState,
  command,
  tick,
  serialize,
  deserialize,
  validateState,
  atWar,
  settlementLeverage,
} from "../src/engine";
import { society, societyTick } from "../src/society";
import {
  LAWS,
  LAW_GROUPS,
  currentLaw,
  lawEffects,
  lawChances,
} from "../src/laws";
import type { MapData } from "../src/scenario";
const map: MapData = JSON.parse(
  fs.readFileSync("public/data/provinces.json", "utf8"),
);
const fresh = () => createState(map, "TUR", true, 2012);
const start = (demand = "reparations") => {
  const s = fresh();
  expect(
    command(s, map, { type: "crisis", to: "IRN", demand, offer: 150 }).ok,
  ).toBe(true);
  return s;
};
describe("Legislative policy areas", () => {
  it("has one active law in all 16 groups and every option changes material effects", () => {
    const s = fresh(),
      n = society(s);
    expect(Object.keys(LAW_GROUPS)).toHaveLength(16);
    for (const [id, g] of Object.entries(LAW_GROUPS)) {
      expect(n.laws.filter((l) => LAWS[l].group === id)).toHaveLength(1);
      expect(
        new Set(g.choices.map((l) => JSON.stringify(LAWS[l].effects))).size,
      ).toBe(g.choices.length);
      for (const l of g.choices) {
        const c = lawChances(n, l);
        expect(c.advance + c.debate + c.stall).toBe(100);
        expect(c.debate).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("freezes at low legitimacy, can fail at three setbacks and preserves the old law", () => {
    const s = fresh(),
      n = society(s);
    command(s, map, { type: "enact", law: "healthcare" });
    s.countries.TUR.legitimacy = 10;
    societyTick(s, map);
    expect(n.enacting!.progress).toBe(0);
    s.countries.TUR.legitimacy = 75;
    for (let i = 0; i < 3; i++) {
      n.enacting!.progress = 12;
      s.seed = 1900;
      societyTick(s, map);
    }
    expect(n.enacting).toBeNull();
    expect(currentLaw(n, "health")).toBe("private_health");
    expect(command(s, map, { type: "enact", law: "healthcare" }).ok).toBe(
      false,
    );
    expect(n.lawCooldowns!.health).toBe(60);
    expect(n.radicals).toBeGreaterThan(13);
  });
  it("abandonment has political costs and migration fills policy areas without losing old enacted reforms", () => {
    const s = fresh(),
      n = society(s);
    command(s, map, { type: "enact", law: "education" });
    const before = n.radicals;
    command(s, map, { type: "cancel_law" });
    expect(n.radicals).toBeGreaterThan(before);
    n.laws = ["healthcare", "free_trade"];
    n.enacting = null;
    const loaded = deserialize(serialize(s), map);
    expect(society(loaded).laws).toHaveLength(16);
    expect(currentLaw(society(loaded), "health")).toBe("healthcare");
    expect(lawEffects(society(loaded)).living).toBeGreaterThan(1);
    const corrupt = structuredClone(loaded);
    society(corrupt).laws.push("private_health");
    expect(() => validateState(corrupt, map)).toThrow();
  });
});
describe("Two-sided diplomatic plays", () => {
  it("enforces reparations and arms limits, including policy restrictions and treaty expiry", () => {
    const s = start();
    const cr = s.crises.at(-1)!;
    expect(
      command(s, map, { type: "resolve", id: cr.id, action: "negotiate" }).ok,
    ).toBe(true);
    expect(
      s.treaties.some((t) => t.kind === "reparations" && t.b === "IRN"),
    ).toBe(true);
    const baseline = structuredClone(s);
    baseline.treaties = baseline.treaties.filter(
      (t) => t.kind !== "reparations",
    );
    tick(s, map);
    tick(baseline, map);
    expect(
      s.countries.TUR.treasury - baseline.countries.TUR.treasury,
    ).toBeCloseTo(0.6);
    const d = start("disarm"),
      play = d.crises.at(-1)!;
    expect(
      command(d, map, { type: "resolve", id: play.id, action: "negotiate" }).ok,
    ).toBe(true);
    expect(
      command(d, map, { type: "policy", key: "mobilized", value: true }, "IRN")
        .ok,
    ).toBe(false);
    expect(
      command(d, map, { type: "policy", key: "defence", value: 50 }, "IRN").ok,
    ).toBe(false);
    tick(d, map, 181);
    expect(
      command(d, map, { type: "policy", key: "mobilized", value: true }, "IRN")
        .ok,
    ).toBe(true);
  });
  it("allows defender counter-demands and concessions apply only the primary demand", () => {
    const s = start("access"),
      cr = s.crises.at(-1)!;
    expect(
      command(
        s,
        map,
        {
          type: "play_demand",
          id: cr.id,
          demand: "reparations",
          primary: true,
        },
        "IRN",
      ).ok,
    ).toBe(true);
    expect(
      command(
        s,
        map,
        { type: "play_demand", id: cr.id, demand: "disarm" },
        "IRN",
      ).ok,
    ).toBe(true);
    expect(cr.defenderManeuvers).toBe(20);
    command(s, map, { type: "resolve", id: cr.id, action: "backdown" });
    expect(
      s.treaties.some((t) => t.kind === "reparations" && t.b === "TUR"),
    ).toBe(true);
    expect(s.treaties.some((t) => t.kind === "disarm")).toBe(false);
  });
  it("locks demands and backing in countdown without charging rejected commands", () => {
    const s = start("access"),
      cr = s.crises.at(-1)!;
    s.day = 10;
    const before = serialize(s);
    expect(
      command(s, map, { type: "play_demand", id: cr.id, demand: "disarm" }).ok,
    ).toBe(false);
    expect(command(s, map, { type: "backing", id: cr.id, to: "USA" }).ok).toBe(
      false,
    );
    expect(serialize(s)).toBe(before);
  });
  it("coalitions fight and a concession settles all opposing war aims and ends coalition wars", () => {
    const s = start("access"),
      cr = s.crises.at(-1)!;
    expect(command(s, map, { type: "backing", id: cr.id, to: "USA" }).ok).toBe(
      true,
    );
    expect(
      command(s, map, { type: "backing", id: cr.id, to: "RUS" }, "IRN").ok,
    ).toBe(true);
    expect(
      command(
        s,
        map,
        { type: "play_demand", id: cr.id, demand: "reparations" },
        "IRN",
      ).ok,
    ).toBe(true);
    s.day = 3;
    command(s, map, { type: "resolve", id: cr.id, action: "escalate" });
    expect(atWar(s, "USA", "RUS")).toBe(true);
    expect(atWar(s, "TUR", "IRN")).toBe(true);
    expect(settlementLeverage(s, "TUR", "IRN")).toBeLessThan(60);
    expect(
      command(s, map, { type: "war_settlement", id: cr.id, action: "enforce" })
        .ok,
    ).toBe(false);
    expect(
      command(s, map, { type: "war_settlement", id: cr.id, action: "concede" })
        .ok,
    ).toBe(true);
    expect(atWar(s, "USA", "RUS")).toBe(false);
    expect(atWar(s, "TUR", "IRN")).toBe(false);
    expect(
      s.treaties.some((t) => t.kind === "reparations" && t.b === "TUR"),
    ).toBe(true);
    expect(deserialize(serialize(s), map)).toEqual(s);
  });
});

it("enforces a victorious settlement after occupation and preserves a single promoted demand", () => {
  const s = start("access"),
    cr = s.crises.at(-1)!;
  command(
    s,
    map,
    { type: "play_demand", id: cr.id, demand: "reparations" },
    "IRN",
  );
  command(
    s,
    map,
    { type: "play_demand", id: cr.id, demand: "reparations", primary: true },
    "IRN",
  );
  expect(cr.defenderExtra).not.toContain("reparations");
  command(s, map, { type: "play_demand", id: cr.id, demand: "disarm" });
  s.day = 3;
  command(s, map, { type: "resolve", id: cr.id, action: "escalate" });
  for (const p of Object.values(s.provinces))
    if (p.owner === "IRN") p.controller = "TUR";
  expect(settlementLeverage(s, "TUR", "IRN")).toBeGreaterThanOrEqual(60);
  expect(
    command(s, map, { type: "war_settlement", id: cr.id, action: "enforce" })
      .ok,
  ).toBe(true);
  expect(s.treaties.some((t) => t.kind === "disarm" && t.b === "IRN")).toBe(
    true,
  );
  expect(atWar(s, "TUR", "IRN")).toBe(false);
});
it("a ceasefire mediation closes the related play war and coalition hostilities", () => {
  const s = start("access"),
    cr = s.crises.at(-1)!;
  command(s, map, { type: "backing", id: cr.id, to: "USA" });
  s.day = 3;
  command(s, map, { type: "resolve", id: cr.id, action: "escalate" });
  expect(
    command(s, map, {
      type: "crisis",
      to: "IRN",
      demand: "ceasefire",
      offer: 150,
    }).ok,
  ).toBe(true);
  const mediation = s.crises.at(-1)!;
  expect(
    command(s, map, { type: "resolve", id: mediation.id, action: "negotiate" })
      .ok,
  ).toBe(true);
  expect(cr.status).toBe("agreed");
  expect(atWar(s, "USA", "IRN")).toBe(false);
});
