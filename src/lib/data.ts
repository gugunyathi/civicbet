export type ServiceKind =
  | "water" | "roads" | "electricity" | "refuse" | "safety" | "billing" | "parks" | "other";

export const SERVICES: Record<ServiceKind, { label: string; emoji: string; color: string }> = {
  water:       { label: "Water",       emoji: "🚰", color: "#38bdf8" },
  roads:       { label: "Roads",       emoji: "🛣️", color: "#f59e0b" },
  electricity: { label: "Electricity", emoji: "⚡", color: "#facc15" },
  refuse:      { label: "Refuse",      emoji: "🗑️", color: "#84cc16" },
  safety:      { label: "Safety",      emoji: "🛡️", color: "#ef4444" },
  billing:     { label: "Billing",     emoji: "💳", color: "#a78bfa" },
  parks:       { label: "Parks",       emoji: "🌿", color: "#22c55e" },
  other:       { label: "Other",       emoji: "📋", color: "#94a3b8" },
};

export const CITIES = [
  { id: "jhb", name: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473, activeMarkets: 47, resolved: 312 },
  { id: "cpt", name: "Cape Town",    country: "ZA", lat: -33.9249, lng: 18.4241, activeMarkets: 33, resolved: 289 },
  { id: "dbn", name: "Durban",       country: "ZA", lat: -29.8587, lng: 31.0218, activeMarkets: 21, resolved: 154 },
  { id: "pta", name: "Pretoria",     country: "ZA", lat: -25.7479, lng: 28.2293, activeMarkets: 18, resolved: 121 },
  { id: "pe",  name: "Gqeberha",     country: "ZA", lat: -33.9608, lng: 25.6022, activeMarkets: 9,  resolved: 74 },
  { id: "bfn", name: "Bloemfontein", country: "ZA", lat: -29.0852, lng: 26.1596, activeMarkets: 6,  resolved: 52 },
];

export type BetOption = {
  label: string;
  yesOdds: number; // decimal e.g. 1.85
  noOdds: number;
  yesPool: number; // simulated pool size
  noPool: number;
  yesPct: number;  // implied prob
};

export type Market = {
  id: string;
  ref: string;
  service: ServiceKind;
  city: string;      // city id
  suburb: string;
  address: string;
  title: string;
  loggedAt: string;  // ISO
  status: "open" | "settling" | "resolved";
  reporter: string;
  scoutsOnSite: number;
  historicalAvgFixHours: number; // for smarter bets
  options: BetOption[];
  volume: number; // total volume in points
  coords: { lat: number; lng: number };
};

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

export const MARKETS: Market[] = [
  {
    id: "m1", ref: "CSDFMC0666261", service: "water", city: "jhb",
    suburb: "Fourways", address: "Cedar Road, Fourways",
    title: "Water outage — Cedar Road, Fourways",
    loggedAt: hoursAgo(11), status: "open", reporter: "@thabo",
    scoutsOnSite: 3, historicalAvgFixHours: 4.2, volume: 12_450,
    coords: { lat: -26.017, lng: 28.010 },
    options: [
      { label: "Restored within 1 hour",        yesOdds: 4.20, noOdds: 1.22, yesPool: 1200, noPool: 5400, yesPct: 24 },
      { label: "Restored within 2 hours",       yesOdds: 2.10, noOdds: 1.75, yesPool: 3100, noPool: 2600, yesPct: 48 },
      { label: "Takes more than 2 hours",       yesOdds: 1.45, noOdds: 2.65, yesPool: 4800, noPool: 1900, yesPct: 69 },
    ],
  },
  {
    id: "m2", ref: "CSDFMC0666188", service: "electricity", city: "cpt",
    suburb: "Sea Point", address: "Main Road, Sea Point",
    title: "Load-shed extended — Main Road, Sea Point",
    loggedAt: hoursAgo(3), status: "open", reporter: "@zanele",
    scoutsOnSite: 1, historicalAvgFixHours: 6.5, volume: 8_720,
    coords: { lat: -33.917, lng: 18.383 },
    options: [
      { label: "Power back within 2 hours",     yesOdds: 3.80, noOdds: 1.28, yesPool: 900, noPool: 3800, yesPct: 27 },
      { label: "Power back within 4 hours",     yesOdds: 2.05, noOdds: 1.80, yesPool: 2400, noPool: 2100, yesPct: 49 },
      { label: "Takes more than 4 hours",       yesOdds: 1.55, noOdds: 2.40, yesPool: 3200, noPool: 1500, yesPct: 65 },
    ],
  },
  {
    id: "m3", ref: "CSDFMC0666149", service: "roads", city: "jhb",
    suburb: "Sandton", address: "Rivonia Road pothole cluster",
    title: "Pothole cluster — Rivonia Rd, Sandton",
    loggedAt: hoursAgo(28), status: "open", reporter: "@nomsa",
    scoutsOnSite: 0, historicalAvgFixHours: 72, volume: 5_120,
    coords: { lat: -26.107, lng: 28.056 },
    options: [
      { label: "Fixed within 24 hours",         yesOdds: 6.50, noOdds: 1.10, yesPool: 600, noPool: 4200, yesPct: 15 },
      { label: "Fixed within 3 days",           yesOdds: 2.40, noOdds: 1.60, yesPool: 1800, noPool: 2100, yesPct: 42 },
      { label: "Takes more than 3 days",        yesOdds: 1.35, noOdds: 2.90, yesPool: 3900, noPool: 1200, yesPct: 74 },
    ],
  },
  {
    id: "m4", ref: "CSDFMC0665999", service: "refuse", city: "dbn",
    suburb: "Umhlanga", address: "Lagoon Drive",
    title: "Refuse not collected — Lagoon Drive",
    loggedAt: hoursAgo(48), status: "open", reporter: "@sipho",
    scoutsOnSite: 2, historicalAvgFixHours: 36, volume: 3_310,
    coords: { lat: -29.727, lng: 31.087 },
    options: [
      { label: "Collected within 12 hours",     yesOdds: 3.10, noOdds: 1.38, yesPool: 700, noPool: 1800, yesPct: 32 },
      { label: "Collected within 24 hours",     yesOdds: 1.85, noOdds: 1.95, yesPool: 1400, noPool: 1300, yesPct: 54 },
      { label: "Takes more than 24 hours",      yesOdds: 1.60, noOdds: 2.30, yesPool: 1600, noPool: 900, yesPct: 63 },
    ],
  },
  {
    id: "m5", ref: "CSDFMC0665812", service: "safety", city: "cpt",
    suburb: "Woodstock", address: "Albert Rd — streetlights out",
    title: "Streetlights out — Albert Rd, Woodstock",
    loggedAt: hoursAgo(6), status: "open", reporter: "@lerato",
    scoutsOnSite: 4, historicalAvgFixHours: 18, volume: 6_040,
    coords: { lat: -33.925, lng: 18.446 },
    options: [
      { label: "Repaired within 6 hours",       yesOdds: 4.80, noOdds: 1.18, yesPool: 500, noPool: 2800, yesPct: 21 },
      { label: "Repaired within 24 hours",      yesOdds: 1.95, noOdds: 1.85, yesPool: 1900, noPool: 1700, yesPct: 51 },
      { label: "Takes more than 24 hours",      yesOdds: 1.50, noOdds: 2.55, yesPool: 2500, noPool: 1100, yesPct: 67 },
    ],
  },
  {
    id: "m6", ref: "CSDFMC0665700", service: "parks", city: "pta",
    suburb: "Brooklyn", address: "Magnolia Dell — irrigation broken",
    title: "Irrigation broken — Magnolia Dell",
    loggedAt: hoursAgo(72), status: "open", reporter: "@kagiso",
    scoutsOnSite: 0, historicalAvgFixHours: 96, volume: 1_780,
    coords: { lat: -25.769, lng: 28.230 },
    options: [
      { label: "Fixed within 48 hours",         yesOdds: 5.20, noOdds: 1.14, yesPool: 300, noPool: 1500, yesPct: 19 },
      { label: "Fixed within 1 week",           yesOdds: 2.10, noOdds: 1.72, yesPool: 800, noPool: 900, yesPct: 47 },
      { label: "Takes more than 1 week",        yesOdds: 1.40, noOdds: 2.75, yesPool: 1400, noPool: 500, yesPct: 71 },
    ],
  },
];

export const HISTORICAL_FIX_HOURS: Record<ServiceKind, number[]> = {
  water:       [3, 5, 2, 7, 4, 6, 3, 5, 8, 4, 3, 2],
  roads:       [48, 96, 72, 120, 60, 168, 72, 96, 48, 120, 72, 96],
  electricity: [2, 4, 8, 6, 3, 5, 12, 4, 6, 3, 5, 4],
  refuse:      [24, 36, 12, 48, 24, 18, 36, 24, 30, 24, 18, 12],
  safety:      [12, 24, 18, 36, 24, 12, 18, 24, 30, 18, 24, 12],
  billing:     [72, 48, 96, 120, 72, 48, 96, 72, 48, 72, 96, 48],
  parks:       [72, 96, 120, 168, 96, 72, 120, 168, 96, 72, 120, 96],
  other:       [24, 48, 36, 72, 24, 48, 36, 24, 48, 36, 24, 48],
};

export const LEADERBOARD = [
  { rank: 1, handle: "@thabo",   points: 24_500, role: "Reporter",  streak: 18 },
  { rank: 2, handle: "@zanele",  points: 21_300, role: "Scout",     streak: 22 },
  { rank: 3, handle: "@nomsa",   points: 19_040, role: "Predictor", streak: 11 },
  { rank: 4, handle: "@sipho",   points: 15_720, role: "Reporter",  streak: 7 },
  { rank: 5, handle: "@lerato",  points: 12_610, role: "Scout",     streak: 9 },
  { rank: 6, handle: "@kagiso",  points: 10_200, role: "Predictor", streak: 5 },
];

export function cityById(id: string) { return CITIES.find(c => c.id === id)!; }
export function marketById(id: string) { return MARKETS.find(m => m.id === id); }
