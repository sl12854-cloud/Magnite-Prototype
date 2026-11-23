/**
 * Loads the mock database: wireframe fixtures first, then deterministic bulk
 * rows. Safe to re-run: it wipes and reloads every table.
 *
 *   npm run db:seed        reload rows
 *   npm run db:reset       push schema, then reload rows
 *
 * Accounts, contacts, leads, opportunities and contracts come from
 * ./seed/generator. Case volume comes from ./volume, which is built backwards
 * from wireframe A2 so the routing metrics reproduce its numbers exactly.
 */
import { PrismaClient } from "@prisma/client";
import * as F from "./seed/fixtures";
import * as G from "./seed/generator";
import { seedVolume } from "./volume";

const prisma = new PrismaClient();
const SEED = 20261123;
const BATCH = 500;

async function inBatches<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += BATCH) await write(rows.slice(i, i + BATCH));
}

async function main() {
  const t0 = Date.now();
  const rng = new G.Rng(SEED);

  // Wipe in dependency order.
  await prisma.caseCorrection.deleteMany();
  await prisma.case.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.magniteContract.deleteMany();
  await prisma.contact.updateMany({ data: { duplicateOfId: null } });
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.magniteProduct.deleteMany();

  // ---------------------------------------------------------------- Products
  await prisma.magniteProduct.createMany({ data: F.PRODUCTS });
  const productId = Object.fromEntries((await prisma.magniteProduct.findMany()).map((p) => [p.code, p.id]));
  const productCodes = Object.keys(productId);

  // ---------------------------------------------------------------- Accounts
  const takenRanks = new Set(F.ACCOUNTS.map((a) => a.revenueRank).filter((r): r is number => r != null));
  const genAccounts = G.generateAccounts(rng, 40, takenRanks);
  await prisma.account.createMany({ data: [...F.ACCOUNTS, ...genAccounts] });
  const accounts = await prisma.account.findMany({ select: { id: true, name: true, type: true, country: true, ownerName: true } });
  const accountId = Object.fromEntries(accounts.map((a) => [a.name, a.id]));

  // ---------------------------------------------------------------- Contacts
  const genContacts = G.generateContacts(rng, accounts, 2400, 0.05);
  const fixtureContacts: G.GenContact[] = F.CONTACTS.map(({ account, ...c }) => ({ ...c, accountName: account, isPrimary: c.isPrimary ?? false, title: c.title }));
  const allContacts = [...fixtureContacts, ...genContacts];
  const primaries = allContacts.filter((c) => !c.duplicateOfEmail);
  const dupes = allContacts.filter((c) => c.duplicateOfEmail);
  await inBatches(primaries, (chunk) =>
    prisma.contact.createMany({ data: chunk.map(({ accountName, duplicateOfEmail: _d, ...c }) => ({ ...c, accountId: accountId[accountName] })) }),
  );
  const contactId: Record<string, string> = Object.fromEntries((await prisma.contact.findMany({ select: { id: true, email: true } })).map((c) => [c.email, c.id]));
  await inBatches(dupes, (chunk) =>
    prisma.contact.createMany({ data: chunk.map(({ accountName, duplicateOfEmail, ...c }) => ({ ...c, accountId: accountId[accountName], duplicateOfId: contactId[duplicateOfEmail!] })) }),
  );

  // ---------------------------------------------------------------- Leads
  const fixtureLeads = F.LEADS.map(({ convertedAccount, convertedContactEmail, ...l }) => ({
    ...l,
    convertedAccountId: convertedAccount ? accountId[convertedAccount] : undefined,
    convertedContactId: convertedContactEmail ? contactId[convertedContactEmail] : undefined,
  }));
  await prisma.lead.createMany({ data: [...fixtureLeads, ...G.generateLeads(rng, 54)] });

  // ---------------------------------------------------------------- Opportunities
  const fixtureOpps = F.OPPORTUNITIES.map(({ account, product, ...o }) => ({ ...o, accountId: accountId[account], productId: productId[product] }));
  const genOpps = G.generateOpportunities(rng, accounts, productCodes, 52).map(({ accountName, productCode, ...o }) => ({ ...o, accountId: accountId[accountName], productId: productId[productCode] }));
  await prisma.opportunity.createMany({ data: [...fixtureOpps, ...genOpps] });

  // ---------------------------------------------------------------- Contracts
  const fixtureContracts = F.CONTRACTS.map(({ account, product, ...c }) => ({ ...c, accountId: accountId[account], productId: productId[product] }));
  const genContracts = G.generateContracts(rng, accounts, productCodes, 45, 500).map(({ accountName, productCode, ...c }) => ({ ...c, accountId: accountId[accountName], productId: productId[productCode] }));
  await prisma.magniteContract.createMany({ data: [...fixtureContracts, ...genContracts] });

  // ---------------------------------------------------------------- Cases on wireframe A1
  const fixtureCases = F.CASES.map(({ account, ...c }) => {
    const routed = c.confidence != null;
    return {
      ...c,
      accountId: accountId[account],
      contactId: contactId[c.fromEmail],
      routingMode: routed ? "ai" : undefined,
      // Provenance for the A2 metrics: a case below the 70% threshold was
      // never auto-routed, so its first queue was Needs review.
      initialQueue: routed ? (c.confidence! >= 70 ? c.queue : "Needs review") : undefined,
      attachmentBytes: 1_400_000 + ((c.caseNumber.charCodeAt(4) * 7919) % 2_600_000),
      routedAt: routed ? new Date(c.receivedAt.getTime() + 4 * 60_000) : undefined,
      assignedAt: routed && c.ownerName ? new Date(c.receivedAt.getTime() + 11 * 60_000) : undefined,
    };
  });
  await prisma.case.createMany({ data: fixtureCases });

  // ---------------------------------------------------------------- Case volume behind wireframe A2
  const volume = await seedVolume(prisma);

  const counts = {
    accounts: await prisma.account.count(),
    contacts: await prisma.contact.count(),
    leads: await prisma.lead.count(),
    products: await prisma.magniteProduct.count(),
    opportunities: await prisma.opportunity.count(),
    contracts: await prisma.magniteContract.count(),
    cases: await prisma.case.count(),
    corrections: await prisma.caseCorrection.count(),
  };
  console.log(`Seeded in ${((Date.now() - t0) / 1000).toFixed(1)}s:`, counts, "(volume:", volume, ")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
