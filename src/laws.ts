import type { Society, Group } from "./society";
export type Law = string;
type Effects = {
  living: number;
  output: number;
  research: number;
  cost: number;
  bureaucracy: number;
  calm: number;
};
type Policy = {
  name: string;
  group: string;
  description: string;
  support: Record<Group, number>;
  effects: Effects;
};
export const LAWS: Record<string, Policy> = Object.create(null);
export const LAW_GROUPS: Record<
  string,
  { name: string; category: string; choices: string[] }
> = Object.create(null);
type Choice = [string, string, number[], Partial<Effects>];
function group(id: string, name: string, category: string, choices: Choice[]) {
  LAW_GROUPS[id] = { name, category, choices: choices.map((c) => c[0]) };
  for (const [key, title, positions, values] of choices) {
    const effects = {
      living: 0,
      output: 0,
      research: 0,
      cost: 0,
      bureaucracy: 0,
      calm: 0,
      ...values,
    };
    const labels = {
      living: " living standards",
      output: "% production",
      research: "% research",
      cost: " credits/day upkeep",
      bureaucracy: " bureaucracy used",
      calm: " radical reduction / 1,000 per day",
    };
    LAWS[key] = {
      name: title,
      group: id,
      effects,
      support: Object.fromEntries(
        ["business", "workers", "security", "civic"].map((g, i) => [
          g,
          positions[i],
        ]),
      ) as Record<Group, number>,
      description: Object.entries(effects)
        .filter(([, v]) => v)
        .map(([k, v]) =>
          k === "calm"
            ? `${v > 0 ? "−" : "+"}${Math.abs(v / 1000)} radicals/day`
            : `${v > 0 ? "+" : ""}${v}${labels[k as keyof Effects]}`,
        )
        .join(" · "),
    };
  }
}
group("governance", "Governance principles", "Power structure", [
  [
    "executive",
    "Executive presidency",
    [2, -1, 4, -3],
    { output: 2, calm: -8 },
  ],
  [
    "parliament",
    "Parliamentary republic",
    [2, 3, -3, 6],
    { research: 8, cost: 0.1 },
  ],
  [
    "monarchy",
    "Hereditary monarchy",
    [3, -3, 5, -5],
    { cost: -0.1, calm: -12 },
  ],
]);
group("franchise", "Distribution of power", "Power structure", [
  [
    "managed_vote",
    "Managed elections",
    [2, -2, 4, -4],
    { output: 2, calm: -8 },
  ],
  [
    "universal_vote",
    "Universal suffrage",
    [-1, 6, -4, 6],
    { living: 0.3, calm: 10 },
  ],
  [
    "military_rule",
    "Military administration",
    [-1, -4, 8, -7],
    { output: 5, research: -15, calm: -20 },
  ],
]);
group("religion", "Church and state", "Power structure", [
  [
    "religious_recognition",
    "Recognized religion",
    [1, 1, 2, -2],
    { calm: 2, cost: 0.05 },
  ],
  [
    "secular",
    "Secular institutions",
    [2, 2, -2, 6],
    { research: 10, bureaucracy: 5 },
  ],
  [
    "religious_state",
    "Religious government",
    [-1, 1, 5, -6],
    { research: -10, calm: 6 },
  ],
]);
group("bureaucracy", "Bureaucracy", "Power structure", [
  [
    "appointed",
    "Political appointments",
    [3, -1, 3, -4],
    { cost: -0.1, research: -5 },
  ],
  [
    "merit",
    "Merit civil service",
    [3, 2, -3, 6],
    { output: 5, research: 5, cost: 0.2 },
  ],
  [
    "local_councils",
    "Elected local councils",
    [-2, 5, -3, 5],
    { living: 0.4, cost: 0.25, bureaucracy: 10 },
  ],
]);
group("army", "Army model", "Power structure", [
  [
    "professional",
    "Professional military",
    [3, 0, 5, 1],
    { cost: 0.15, output: 2 },
  ],
  [
    "conscription",
    "National conscription",
    [-3, -3, 7, -3],
    { output: -5, cost: -0.1, calm: -10 },
  ],
  [
    "reserves",
    "Territorial reserves",
    [-1, 4, -4, 4],
    { output: 3, cost: 0.05 },
  ],
]);
group("economy", "Economic system", "Economy", [
  ["mixed", "Mixed economy", [2, 2, 1, 1], { output: 2, cost: 0.1 }],
  [
    "market_economy",
    "Market liberalism",
    [7, -4, -1, 2],
    { output: 12, living: -0.5, calm: -10 },
  ],
  [
    "planned",
    "State planning",
    [-7, 5, 4, -2],
    { output: 5, living: 0.5, bureaucracy: 20, cost: 0.3 },
  ],
]);
group("trade", "Trade policy", "Economy", [
  ["protectionism", "Protectionism", [1, 3, 3, -1], { output: 2, cost: 0.05 }],
  ["free_trade", "Open trade policy", [6, -1, -2, 3], { living: 0.2 }],
  ["isolation", "Economic isolation", [-6, 1, 6, -4], { output: -12, calm: 4 }],
]);
group("taxation", "Tax distribution", "Economy", [
  ["flat_tax", "Flat taxation", [5, -4, 1, -2], { living: -0.2, cost: -0.1 }],
  [
    "progressive_tax",
    "Progressive taxation",
    [-5, 6, -1, 4],
    { living: 0.7, bureaucracy: 10, cost: 0.15 },
  ],
  [
    "consumption_tax",
    "Consumption taxation",
    [6, -6, 2, -3],
    { living: -0.8, output: 4, cost: -0.2 },
  ],
]);
group("education", "Education", "Economy", [
  ["private_education", "Private education", [5, -3, 0, -2], { research: 5 }],
  [
    "education",
    "Public education",
    [2, 4, -1, 6],
    { research: 40, cost: 0.35, bureaucracy: 15 },
  ],
  [
    "religious_schools",
    "Religious schools",
    [-1, 2, 3, -5],
    { research: 15, cost: 0.15, bureaucracy: 5 },
  ],
]);
group("health", "Health system", "Economy", [
  ["private_health", "Private healthcare", [5, -4, 0, -2], { output: 2 }],
  [
    "healthcare",
    "Public healthcare",
    [-2, 6, 0, 4],
    { living: 1.2, cost: 0.45, bureaucracy: 15 },
  ],
  [
    "universal_health",
    "Universal coverage",
    [-5, 8, -1, 6],
    { living: 1.8, cost: 0.8, bureaucracy: 25, calm: 10 },
  ],
]);
group("police", "Policing", "Economy", [
  ["local_police", "Local police", [2, 1, 1, 2], { calm: 3, cost: 0.05 }],
  [
    "national_police",
    "National police",
    [2, -2, 6, -3],
    { calm: 15, cost: 0.25, bureaucracy: 10 },
  ],
  [
    "accountable_police",
    "Independent police oversight",
    [-1, 4, -5, 7],
    { calm: 10, cost: 0.3, bureaucracy: 15 },
  ],
]);
group("speech", "Speech and assembly", "Human rights", [
  ["censorship", "Censored press", [1, -3, 5, -7], { research: -10, calm: 8 }],
  [
    "free_speech",
    "Protected speech",
    [-1, 5, -5, 8],
    { research: 15, calm: -5 },
  ],
  ["assembly", "Right of assembly", [-2, 6, -4, 6], { living: 0.3, calm: 7 }],
]);
group("labor", "Labor rights", "Human rights", [
  [
    "unregulated",
    "Unregulated workplaces",
    [7, -7, 1, -3],
    { output: 5, calm: -8 },
  ],
  [
    "labor",
    "Workplace protections",
    [-4, 7, 0, 3],
    { living: 0.8, output: -5, calm: 15 },
  ],
  [
    "unions",
    "Collective bargaining",
    [-7, 9, -3, 5],
    { living: 1.1, output: -8, calm: 25, bureaucracy: 5 },
  ],
]);
group("welfare", "Social security", "Human rights", [
  ["family_support", "Family support", [3, -3, 1, -1], { cost: 0 }],
  [
    "pensions",
    "Public pensions",
    [-3, 6, 2, 4],
    { living: 0.7, cost: 0.35, bureaucracy: 10 },
  ],
  [
    "income_support",
    "Income assistance",
    [-6, 8, -1, 5],
    { living: 1.2, cost: 0.6, bureaucracy: 20, calm: 15 },
  ],
]);
group("citizenship", "Citizenship", "Human rights", [
  [
    "national_preference",
    "National preference",
    [1, -1, 4, -4],
    { calm: -6, output: 2 },
  ],
  [
    "equal_citizenship",
    "Equal citizenship",
    [2, 4, -4, 7],
    { output: 4, living: 0.3, bureaucracy: 10 },
  ],
  [
    "residency_rights",
    "Residency-based rights",
    [3, 2, -6, 6],
    { output: 7, cost: 0.2, calm: -5 },
  ],
]);
group("migration", "Migration and refugees", "Human rights", [
  [
    "controlled_borders",
    "Controlled migration",
    [2, 1, 3, -2],
    { output: 1, cost: 0.1 },
  ],
  [
    "open_migration",
    "Open migration",
    [6, -2, -5, 6],
    { output: 8, cost: 0.25, bureaucracy: 10 },
  ],
  [
    "refugee_asylum",
    "Protected asylum",
    [1, 3, -5, 8],
    { living: 0.3, cost: 0.4, bureaucracy: 15, calm: 5 },
  ],
]);
export function currentLaw(n: Pick<Society, "laws">, group: string): Law {
  return (
    n.laws.find((l) => LAWS[l]?.group === group) ?? LAW_GROUPS[group].choices[0]
  );
}
export function lawEffects(n: Pick<Society, "laws">): Effects {
  const result: Effects = {
    living: 0,
    output: 0,
    research: 0,
    cost: 0,
    bureaucracy: 0,
    calm: 0,
  };
  for (const l of n.laws)
    if (LAWS[l])
      for (const k of Object.keys(result) as (keyof Effects)[])
        result[k] += LAWS[l].effects[k];
  return result;
}
export function lawChances(n: Society, law: Law) {
  const old = LAWS[currentLaw(n, LAWS[law].group)];
  let support = 0,
    opposition = 0;
  for (const [g, v] of Object.entries(n.groups)) {
    const delta = LAWS[law].support[g as Group] - old.support[g as Group];
    if (delta > 0) support += v.clout;
    else if (delta < 0) opposition += v.clout;
  }
  const advance = Math.round(
    Math.max(20, Math.min(85, 50 + support * 0.5 - opposition * 0.35)),
  );
  const stall = Math.round(
    Math.max(5, Math.min(45, 10 + opposition * 0.4 - support * 0.15)),
  );
  return { advance, debate: 100 - advance - stall, stall, support, opposition };
}
