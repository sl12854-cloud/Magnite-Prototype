/**
 * Runs the generator without a database and checks the constraints the
 * schema enforces (unique emails, contract numbers) plus the demo ratios.
 * Case volume is not covered here: it comes from prisma/volume.ts and is
 * pinned by tests/metrics.test.ts. `npx tsx prisma/seed/dry-run.ts`
 */
import * as F from "./fixtures";
import * as G from "./generator";

function run(seed: number) {
  const rng = new G.Rng(seed);
  const taken = new Set(F.ACCOUNTS.map((a) => a.revenueRank).filter((r): r is number => r != null));
  const accounts = [...F.ACCOUNTS, ...G.generateAccounts(rng, 40, taken)].map((a) => ({ name: a.name, type: a.type, country: a.country, ownerName: a.ownerName }));
  const contacts = [...F.CONTACTS.map((c) => ({ ...c, accountName: c.account })), ...G.generateContacts(rng, accounts, 2400, 0.05)];
  const leads = [...F.LEADS, ...G.generateLeads(rng, 54)];
  const opps = [...F.OPPORTUNITIES, ...G.generateOpportunities(rng, accounts, F.PRODUCTS.map((p) => p.code), 52)];
  const contracts = [...F.CONTRACTS.map((c) => c.contractNumber), ...G.generateContracts(rng, accounts, F.PRODUCTS.map((p) => p.code), 45, 500).map((c) => c.contractNumber)];
  return { accounts, contacts, leads, opps, contracts };
}

function assertUnique(label: string, values: string[]) {
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  if (dupes.length) throw new Error(`${label}: ${dupes.length} duplicates, e.g. ${dupes.slice(0, 3).join(", ")}`);
  console.log(`ok  ${label}: ${values.length} unique`);
}

const a = run(20261123);
const b = run(20261123);
if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("generator is not deterministic");
console.log("ok  deterministic across two runs");

assertUnique("account names", a.accounts.map((x) => x.name));
assertUnique("contact emails", a.contacts.map((x) => x.email));
assertUnique("contract numbers", a.contracts);
assertUnique("fixture case numbers", F.CASES.map((c) => c.caseNumber));
assertUnique("product codes", F.PRODUCTS.map((p) => p.code));

const dupTargets = a.contacts.filter((c) => c.duplicateOfEmail).map((c) => c.duplicateOfEmail!);
const emails = new Set(a.contacts.map((c) => c.email));
const missing = dupTargets.filter((e) => !emails.has(e));
if (missing.length) throw new Error(`duplicate targets missing: ${missing.slice(0, 3).join(", ")}`);
console.log(`ok  ${dupTargets.length} duplicate contacts all point at existing rows`);

const complete = a.contacts.filter((c) => c.consentOptIn && c.country).length;
console.log("counts", { accounts: a.accounts.length, contacts: a.contacts.length, leads: a.leads.length, opportunities: a.opps.length, contracts: a.contracts.length, fixtureCases: F.CASES.length });
console.log(`contacts with consent+country: ${((complete / a.contacts.length) * 100).toFixed(1)}% (target ~71%)`);
