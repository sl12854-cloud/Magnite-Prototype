/**
 * Deterministic bulk data around the wireframe fixtures. Everything comes
 * from one seeded PRNG, so every reseed produces identical rows and the
 * demo always looks the same.
 *
 * Targets (chosen to match the numbers on the wireframes):
 *   ~50 accounts, ~2,400 contacts (71% with consent + country, ~5% duplicates),
 *   ~60 leads, ~60 opportunities, ~55 contracts.
 */
import { NOW, at } from "./fixtures";

// ------------------------------------------------------------------ PRNG
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float() {
    return this.next();
  }
  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1][0];
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// ------------------------------------------------------------------ Pools
const FIRST = ["Aiden", "Amara", "Ben", "Carla", "Chloe", "Daniel", "Devi", "Elif", "Ethan", "Fatima", "Felix", "Grace", "Hugo", "Ines", "Isaac", "Jonas", "Julia", "Kenji", "Lara", "Leo", "Lina", "Mads", "Maya", "Nadia", "Nikolai", "Omar", "Paula", "Quinn", "Ravi", "Rosa", "Sana", "Soren", "Tariq", "Tessa", "Umar", "Vera", "Wei", "Ximena", "Yara", "Zoe"];
const LAST = ["Abara", "Baker", "Brandt", "Castillo", "Chowdhury", "Dubois", "Eriksen", "Farah", "Garcia", "Haddad", "Ivanova", "Jansen", "Kaur", "Kowalski", "Larsen", "Lindqvist", "Mancini", "Moreau", "Nakamura", "Novak", "Okonkwo", "Ortega", "Petrov", "Quintero", "Rahman", "Rossi", "Schneider", "Silva", "Takahashi", "Tran", "Ueda", "Varga", "Weber", "Xu", "Yamamoto", "Zhang"];
const TITLES = ["Ad Operations Manager", "Head of Programmatic", "VP Revenue", "Director, Ad Tech", "Yield Analyst", "Monetisation Lead", "Partnerships Manager", "Trading Director", "Media Buyer", "Finance Manager", "Legal Counsel", "Product Manager"];
const STEM = ["Aurora", "Beacon", "Cascade", "Delta", "Ember", "Falcon", "Granite", "Horizon", "Iris", "Juniper", "Keystone", "Lumen", "Meridian", "Nimbus", "Orbit", "Pioneer", "Quartz", "Ridge", "Summit", "Tidal", "Umbra", "Vista", "Willow", "Zenith"];
const SUFFIX: Record<string, string[]> = {
  Publisher: ["Media", "TV", "Streaming", "Broadcasting", "Network", "Digital", "Studios", "Play"],
  Demand: ["Buyers", "Trading", "DSP", "Demand"],
  Agency: ["Agency", "Collective", "Group", "Partners"],
};
const COUNTRIES: Record<string, string[]> = {
  NA: ["US", "US", "US", "CA", "MX"],
  EMEA: ["GB", "DE", "FR", "ES", "IT", "NL", "SE"],
  APAC: ["AU", "SG", "KR", "IN"],
  JP: ["JP"],
};
const TLD: Record<string, string> = { US: "com", CA: "ca", MX: "mx", GB: "co.uk", DE: "de", FR: "fr", ES: "es", IT: "it", NL: "nl", SE: "se", AU: "com.au", SG: "sg", KR: "kr", IN: "in", JP: "jp" };
const OWNERS = ["T. Lee", "A. Nguyen", "D. Park", "M. Okafor", "S. Ruiz", "K. Tanaka", "J. Belson"];

// ------------------------------------------------------------------ Types
export type GenAccount = { name: string; type: string; region: string; country: string; industry: string; website: string; ownerName: string; magniteLinkActive: boolean; streamingLastActiveAt?: Date; lastContactedAt?: Date; revenueRank: number; annualRevenueUsd: number };
export type GenContact = { accountName: string; firstName: string; lastName: string; email: string; title: string; country?: string; consentOptIn: boolean; isPrimary: boolean; lastContactedAt?: Date; duplicateOfEmail?: string };
export type GenLead = { firstName: string; lastName: string; email: string; company: string; title: string; status: string; source: string; country: string; consentOptIn: boolean; createdAt: Date };
export type GenOpportunity = { accountName: string; name: string; stage: string; amountUsd: number; closeDate: Date; probability: number; productCode: string; renewalRisk?: string; ownerName: string };
export type GenContract = { contractNumber: string; accountName: string; productCode: string; status: string; startDate: Date; endDate?: Date; feePercent: number; msaVersion: string; dpaSigned: boolean; seatId?: string };

// ------------------------------------------------------------------ Generators
export function generateAccounts(rng: Rng, count: number, takenRanks: Set<number>): GenAccount[] {
  const out: GenAccount[] = [];
  const used = new Set<string>();
  while (out.length < count) {
    const type = rng.weighted([["Publisher", 60], ["Demand", 25], ["Agency", 15]] as const);
    const name = `${rng.pick(STEM)} ${rng.pick(SUFFIX[type])}`;
    if (used.has(name)) continue;
    used.add(name);
    const region = rng.weighted([["NA", 45], ["EMEA", 30], ["APAC", 15], ["JP", 10]] as const);
    const country = rng.pick(COUNTRIES[region]);
    let rank = rng.int(1, 320);
    while (takenRanks.has(rank)) rank = rng.int(1, 320);
    takenRanks.add(rank);
    const isPub = type === "Publisher";
    out.push({
      name,
      type,
      region,
      country,
      industry: isPub ? rng.pick(["Streaming", "Broadcast", "News", "Gaming", "Mobile apps", "Sports"]) : type === "Demand" ? rng.pick(["Trading desk", "DSP", "Brand"]) : "Agency",
      website: `${name.toLowerCase().replace(/[^a-z]+/g, "")}.${TLD[country]}`,
      ownerName: rng.pick(OWNERS),
      magniteLinkActive: isPub && rng.chance(0.35),
      streamingLastActiveAt: isPub ? daysBefore(rng, rng.int(0, 150)) : undefined,
      lastContactedAt: rng.chance(0.85) ? daysBefore(rng, rng.int(0, 120)) : undefined,
      revenueRank: rank,
      annualRevenueUsd: Math.round((9_000_000 / Math.sqrt(rank)) / 1000) * 1000,
    });
  }
  return out;
}

export function generateContacts(rng: Rng, accounts: { name: string; type: string; country: string }[], total: number, dupShare: number): GenContact[] {
  const out: GenContact[] = [];
  const emails = new Set<string>();
  const pubs = accounts.filter((a) => a.type !== "Internal");
  while (out.length < total) {
    const a = rng.pick(pubs);
    const first = rng.pick(FIRST);
    const last = rng.pick(LAST);
    const domain = a.name.toLowerCase().replace(/[^a-z]+/g, "") + "." + (TLD[a.country] ?? "com");
    const email = `${first[0].toLowerCase()}.${last.toLowerCase()}@${domain}`;
    if (emails.has(email)) continue;
    emails.add(email);
    // 71% have consent AND country; the rest are missing one or both.
    const complete = rng.chance(0.71);
    const consentOptIn = complete ? true : rng.chance(0.4);
    const country = complete ? a.country : rng.chance(0.5) ? a.country : undefined;
    out.push({ accountName: a.name, firstName: first, lastName: last, email, title: rng.pick(TITLES), country, consentOptIn, isPrimary: false, lastContactedAt: rng.chance(0.7) ? daysBefore(rng, rng.int(0, 180)) : undefined });
  }
  // Duplicates: same person, variant email, no consent.
  const dupCount = Math.round(total * dupShare);
  for (let i = 0; i < dupCount; i++) {
    const src = rng.pick(out.filter((c) => !c.duplicateOfEmail));
    const variant = `${src.firstName.toLowerCase()}${src.lastName.toLowerCase()}@${src.email.split("@")[1]}`;
    if (emails.has(variant)) continue;
    emails.add(variant);
    out.push({ ...src, email: variant, consentOptIn: false, isPrimary: false, lastContactedAt: undefined, duplicateOfEmail: src.email });
  }
  return out;
}

export function generateLeads(rng: Rng, count: number): GenLead[] {
  const out: GenLead[] = [];
  for (let i = 0; i < count; i++) {
    const first = rng.pick(FIRST);
    const last = rng.pick(LAST);
    const company = `${rng.pick(STEM)} ${rng.pick(["Labs", "Vision", "Cast", "Reach", "Wave"])}`;
    const region = rng.weighted([["NA", 45], ["EMEA", 30], ["APAC", 15], ["JP", 10]] as const);
    const country = rng.pick(COUNTRIES[region]);
    out.push({
      firstName: first,
      lastName: last,
      email: `${first.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.${TLD[country]}`,
      company,
      title: rng.pick(TITLES),
      status: rng.weighted([["New", 4], ["Working", 3], ["Qualified", 2], ["Unqualified", 2]] as const),
      source: rng.pick(["Webinar", "Inbound email", "Referral", "Event", "Website"]),
      country,
      consentOptIn: rng.chance(0.8),
      createdAt: daysBefore(rng, rng.int(0, 60)),
    });
  }
  return out;
}

export function generateOpportunities(rng: Rng, accounts: { name: string; type: string; ownerName: string }[], productCodes: string[], count: number): GenOpportunity[] {
  const out: GenOpportunity[] = [];
  const pool = accounts.filter((a) => a.type !== "Internal");
  for (let i = 0; i < count; i++) {
    const a = rng.pick(pool);
    const product = rng.pick(productCodes);
    const stage = rng.weighted([["Prospecting", 2], ["Qualification", 3], ["Proposal", 3], ["Negotiation", 2], ["Closed Won", 3], ["Closed Lost", 1]] as const);
    const probability = { Prospecting: 10, Qualification: 30, Proposal: 50, Negotiation: 75, "Closed Won": 100, "Closed Lost": 0 }[stage];
    const kind = rng.pick(["renewal", "expansion", "new business", "upsell"]);
    out.push({
      accountName: a.name,
      name: `${a.name.split(" ")[0]} · ${product} ${kind}`,
      stage,
      amountUsd: rng.int(2, 90) * 10_000,
      closeDate: stage.startsWith("Closed") ? daysBefore(rng, rng.int(1, 90)) : daysAfter(rng, rng.int(5, 150)),
      probability,
      productCode: product,
      renewalRisk: kind === "renewal" ? rng.pick(["Low", "Medium", "High"]) : undefined,
      ownerName: a.ownerName,
    });
  }
  return out;
}

export function generateContracts(rng: Rng, accounts: { name: string; type: string }[], productCodes: string[], count: number, startSeq: number): GenContract[] {
  const out: GenContract[] = [];
  const pool = accounts.filter((a) => a.type !== "Internal");
  for (let i = 0; i < count; i++) {
    const a = rng.pick(pool);
    const product = rng.pick(productCodes);
    const status = rng.weighted([["Active", 7], ["Pending signature", 1], ["In termination", 1], ["Expired", 2]] as const);
    const startYear = status === "Expired" ? rng.int(2021, 2023) : rng.int(2023, 2026);
    const start = at(`${startYear}-${String(rng.int(1, 12)).padStart(2, "0")}-01`);
    const end = status === "Pending signature" ? undefined : new Date(start.getTime() + rng.int(12, 36) * 30 * 24 * 3600 * 1000);
    out.push({
      contractNumber: `MC-${startYear}-${String(startSeq + i).padStart(4, "0")}`,
      accountName: a.name,
      productCode: product,
      status,
      startDate: start,
      endDate: end,
      feePercent: rng.pick([10, 11, 12, 12.5, 13, 13.5, 14, 15]),
      msaVersion: rng.pick(["MSA v2.4", "MSA v3.0", "MSA v3.1"]),
      dpaSigned: status !== "Pending signature" && rng.chance(0.9),
      seatId: product === "SPRINGSERVE" || product === "DVPLUS" ? `${product === "SPRINGSERVE" ? "SS" : "DV"}-${a.name.slice(0, 3).toUpperCase()}-${String(rng.int(1, 99)).padStart(3, "0")}` : undefined,
    });
  }
  return out;
}

// ------------------------------------------------------------------ Helpers
function daysBefore(rng: Rng, d: number) {
  return new Date(NOW.getTime() - d * 86_400_000 - rng.int(0, 86_399) * 1000);
}
function daysAfter(rng: Rng, d: number) {
  return new Date(NOW.getTime() + d * 86_400_000 + rng.int(0, 86_399) * 1000);
}
