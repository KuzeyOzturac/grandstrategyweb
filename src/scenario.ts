export type MapFeature = {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    name: string;
    country: string;
    region: string;
    center: [number, number];
  };
  geometry: any;
};
export type MapData = {
  features: MapFeature[];
  regions: { id: string; name: string; country: string }[];
  adjacency: Record<string, string[]>;
};
export const START = Date.UTC(2012, 0, 1);
export const dateLabel = (day: number) =>
  new Date(START + day * 86400000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const META: Record<
  string,
  {
    name: string;
    color: string;
    capital: [number, number];
    port?: [number, number];
    playable?: boolean;
    blurb?: string;
  }
> = {
  TUR: {
    name: "Türkiye",
    color: "#828f73",
    capital: [32.86, 39.93],
    port: [36.17, 36.59],
    playable: true,
    blurb:
      "A border power. Balance domestic support, access negotiations and the cost of intervention.",
  },
  IRN: {
    name: "Iran",
    color: "#987e69",
    capital: [51.39, 35.69],
    port: [56.27, 27.18],
    playable: true,
    blurb:
      "A regional patron. Sustain an overland supply corridor and manage sanctions and escalation.",
  },
  SYR: {
    name: "Syrian government",
    color: "#b99c73",
    capital: [36.29, 33.51],
    port: [35.78, 35.53],
    playable: true,
    blurb:
      "A government under pressure. Keep supply routes open and seek a sustainable political settlement.",
  },
  OPP: {
    name: "Syrian opposition",
    color: "#759e9b",
    capital: [36.63, 35.93],
    blurb:
      "Aggregated opposition forces. A gameplay abstraction of disparate armed groups.",
  },
  IRQ: {
    name: "Iraq",
    color: "#9b9478",
    capital: [44.36, 33.31],
    port: [47.78, 30.5],
  },
  LBN: {
    name: "Lebanon",
    color: "#99a591",
    capital: [35.5, 33.89],
    port: [35.5, 33.89],
  },
  JOR: {
    name: "Jordan",
    color: "#a28a79",
    capital: [35.93, 31.95],
    port: [35, 29.53],
  },
  ISR: {
    name: "Israel",
    color: "#829aa8",
    capital: [35.21, 31.77],
    port: [34.99, 32.81],
  },
  PSE: {
    name: "Palestinian territories",
    color: "#8b9a7f",
    capital: [35.2, 31.9],
  },
  SAU: {
    name: "Saudi Arabia",
    color: "#a59a7d",
    capital: [46.67, 24.71],
    port: [50.1, 26.43],
  },
  KWT: {
    name: "Kuwait",
    color: "#9baf9c",
    capital: [47.98, 29.37],
    port: [47.98, 29.37],
  },
  QAT: {
    name: "Qatar",
    color: "#a18489",
    capital: [51.53, 25.29],
    port: [51.53, 25.29],
  },
  ARE: {
    name: "United Arab Emirates",
    color: "#929e86",
    capital: [54.37, 24.45],
    port: [55.27, 25.2],
  },
  OMN: {
    name: "Oman",
    color: "#a9947e",
    capital: [58.41, 23.59],
    port: [58.41, 23.59],
  },
  BHR: {
    name: "Bahrain",
    color: "#b19795",
    capital: [50.58, 26.22],
    port: [50.58, 26.22],
  },
  EGY: {
    name: "Egypt",
    color: "#9a9175",
    capital: [31.24, 30.04],
    port: [29.92, 31.2],
  },
  CYP: {
    name: "Cyprus",
    color: "#95947c",
    capital: [33.38, 35.18],
    port: [33.04, 34.68],
  },
  USA: { name: "United States", color: "#819ba9", capital: [-77, 39] },
  RUS: { name: "Russia", color: "#a08d7b", capital: [37.6, 55.7] },
};
export const name = (id: string) => META[id]?.name ?? id;
