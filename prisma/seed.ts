/**
 * Seeds the SQLite database with dummy rows that match the sample content
 * in the wireframes (wireframes/README.md). Safe to re-run: it wipes and
 * reloads every table.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fixed "now" so dates in the UI line up with the wireframes.
const NOW = new Date("2026-11-23T17:00:00Z");
const daysAgo = (d: number, h = 0) => new Date(NOW.getTime() - (d * 24 + h) * 3600 * 1000);
const at = (iso: string) => new Date(iso);

async function main() {
  // Order matters because of foreign keys.
  await prisma.case.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.magniteContract.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.magniteProduct.deleteMany();

  // ---------------------------------------------------------------- Products
  const products = Object.fromEntries(
    await Promise.all(
      [
        ["SPRINGSERVE", "SpringServe", "Ad server", "Video ad serving and routing for CTV and OTT publishers."],
        ["DVPLUS", "DV+", "SSP", "Display, video and mobile exchange for demand partners."],
        ["CLEARLINE", "ClearLine", "Buyer platform", "Self-service buying of premium CTV and video inventory."],
        ["LINK", "Magnite Link", "SSP", "Unified connection that consolidates publisher supply paths."],
        ["STREAMING", "Magnite Streaming", "SSP", "CTV and streaming video supply platform."],
        ["CURATION", "Curation", "Curation", "Packaging and selling of curated deals across the exchange."],
      ].map(async ([code, name, family, description]) => [
        code,
        await prisma.magniteProduct.create({ data: { code, name, family, description } }),
      ]),
    ),
  );

  // ---------------------------------------------------------------- Accounts
  type AccountSeed = Parameters<typeof prisma.account.create>[0]["data"];
  const accountSeeds: AccountSeed[] = [
    { name: "BluePeak Streaming", type: "Publisher", region: "NA", country: "US", industry: "Streaming", website: "bluepeakstreaming.tv", ownerName: "T. Lee", magniteLinkActive: false, streamingLastActiveAt: daysAgo(1), lastContactedAt: daysAgo(20), revenueRank: 12, annualRevenueUsd: 4_800_000 },
    { name: "Orchard TV", type: "Publisher", region: "NA", country: "US", industry: "Streaming", website: "orchardtv.com", ownerName: "A. Nguyen", magniteLinkActive: false, streamingLastActiveAt: daysAgo(2), lastContactedAt: daysAgo(31), revenueRank: 57, annualRevenueUsd: 1_300_000 },
    { name: "Northwind Media", type: "Publisher", region: "NA", country: "CA", industry: "Broadcast", website: "northwindmedia.com", ownerName: "D. Park", magniteLinkActive: true, streamingLastActiveAt: daysAgo(3), lastContactedAt: daysAgo(5), revenueRank: 8, annualRevenueUsd: 7_900_000 },
    { name: "Atlas Buyers", type: "Demand", region: "NA", country: "US", industry: "Trading desk", website: "atlasbuyers.co", ownerName: "M. Okafor", magniteLinkActive: false, lastContactedAt: daysAgo(45), revenueRank: 140, annualRevenueUsd: 620_000 },
    { name: "Harbor Light News", type: "Publisher", region: "NA", country: "US", industry: "News", website: "harborlightnews.com", ownerName: "M. Okafor", magniteLinkActive: false, streamingLastActiveAt: daysAgo(40), lastContactedAt: daysAgo(2), revenueRank: 92, annualRevenueUsd: 880_000 },
    { name: "Kestrel Games", type: "Publisher", region: "EMEA", country: "DE", industry: "Gaming", website: "kestrelgames.io", ownerName: "S. Ruiz", magniteLinkActive: false, streamingLastActiveAt: daysAgo(12), lastContactedAt: daysAgo(9), revenueRank: 65, annualRevenueUsd: 1_100_000 },
    { name: "Meridian Plus KK", type: "Publisher", region: "JP", country: "JP", industry: "Streaming", website: "meridianplus.jp", ownerName: "K. Tanaka", magniteLinkActive: false, streamingLastActiveAt: daysAgo(7), lastContactedAt: daysAgo(60), revenueRank: 33, annualRevenueUsd: 2_400_000 },
    { name: "Sundial Apps", type: "Publisher", region: "EMEA", country: "GB", industry: "Mobile apps", website: "sundialapps.co.uk", ownerName: "S. Ruiz", magniteLinkActive: false, streamingLastActiveAt: daysAgo(80), lastContactedAt: daysAgo(100), revenueRank: 210, annualRevenueUsd: 310_000 },
    { name: "Pacific Reach Media", type: "Publisher", region: "APAC", country: "AU", industry: "Broadcast", website: "pacificreach.com.au", ownerName: "K. Tanaka", magniteLinkActive: true, streamingLastActiveAt: daysAgo(4), lastContactedAt: daysAgo(15), revenueRank: 21, annualRevenueUsd: 3_600_000 },
    { name: "Cobalt Agency Group", type: "Agency", region: "EMEA", country: "FR", industry: "Agency", website: "cobaltagency.fr", ownerName: "M. Okafor", magniteLinkActive: false, lastContactedAt: daysAgo(22), revenueRank: 175, annualRevenueUsd: 450_000 },
    { name: "Magnite (internal)", type: "Internal", region: "NA", country: "US", industry: "Ad tech", website: "magnite.com", ownerName: "J. Belson", magniteLinkActive: true },
  ];
  const accounts: Record<string, { id: string }> = {};
  for (const a of accountSeeds) accounts[a.name] = await prisma.account.create({ data: a });
  const acc = (name: string) => accounts[name].id;

  // ---------------------------------------------------------------- Contacts
  const contactSeeds = [
    { account: "BluePeak Streaming", firstName: "Marcus", lastName: "Hale", email: "adops@bluepeakstreaming.tv", title: "Ad Operations Lead", country: "US", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(20) },
    { account: "BluePeak Streaming", firstName: "Elena", lastName: "Voss", email: "e.voss@bluepeakstreaming.tv", title: "VP Revenue", country: "US", consentOptIn: true, lastContactedAt: daysAgo(48) },
    { account: "Orchard TV", firstName: "Dana", lastName: "Whitfield", email: "tech@orchardtv.com", title: "Head of Technology", country: "US", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(31) },
    { account: "Orchard TV", firstName: "Sam", lastName: "Ortiz", email: "adops@orchardtv.com", title: "Ad Ops Lead", country: "US", consentOptIn: true, lastContactedAt: daysAgo(31) },
    { account: "Northwind Media", firstName: "Rafael", lastName: "Alvarez", email: "ops@northwindmedia.com", title: "Director, Platform Ops", country: "CA", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(5) },
    { account: "Northwind Media", firstName: "R.", lastName: "Alvarez", email: "ralvarez@northwindmedia.com", title: "Platform Ops", country: "CA", consentOptIn: false, duplicateOfEmail: "ops@northwindmedia.com" },
    { account: "Atlas Buyers", firstName: "Jordan", lastName: "Kim", email: "partnerships@atlasbuyers.co", title: "Head of Partnerships", country: "US", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(45) },
    { account: "Harbor Light News", firstName: "Priya", lastName: "Desai", email: "ap@harborlightnews.com", title: "Accounts Payable", country: "US", consentOptIn: false, isPrimary: true, lastContactedAt: daysAgo(2) },
    { account: "Kestrel Games", firstName: "Lukas", lastName: "Fischer", email: "legal@kestrelgames.io", title: "General Counsel", country: "DE", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(9) },
    { account: "Meridian Plus KK", firstName: "Hana", lastName: "Sato", email: "h.sato@meridianplus.jp", title: "Partnerships Manager", country: "JP", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(60) },
    { account: "Sundial Apps", firstName: "Priya", lastName: "Nair", email: "priya@sundialapps.co.uk", title: "Founder", country: "GB", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(100) },
    { account: "Pacific Reach Media", firstName: "Olivia", lastName: "Chen", email: "o.chen@pacificreach.com.au", title: "Programmatic Lead", country: "AU", consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(15) },
    { account: "Cobalt Agency Group", firstName: "Amelie", lastName: "Roux", email: "a.roux@cobaltagency.fr", title: "Trading Director", country: undefined, consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(22) },
    { account: "Magnite (internal)", firstName: "Jordan", lastName: "Reyes", email: "j.reyes@magnite.com", title: "Sales Operations", country: "US", consentOptIn: true, isPrimary: true },
  ];
  const contactsByEmail: Record<string, { id: string }> = {};
  for (const c of contactSeeds) {
    const { account, duplicateOfEmail, ...rest } = c;
    const created = await prisma.contact.create({
      data: { ...rest, accountId: acc(account), duplicateOfId: duplicateOfEmail ? contactsByEmail[duplicateOfEmail].id : undefined },
    });
    contactsByEmail[created.email] = created;
  }
  const contact = (email: string) => contactsByEmail[email]?.id;

  // ---------------------------------------------------------------- Leads
  await prisma.lead.createMany({
    data: [
      { firstName: "Noah", lastName: "Bennett", email: "noah@skylinevod.com", company: "Skyline VOD", title: "COO", status: "New", source: "Webinar", country: "US", consentOptIn: true, createdAt: daysAgo(3) },
      { firstName: "Yuki", lastName: "Mori", email: "y.mori@tokyocast.jp", company: "TokyoCast", title: "Ad Sales Manager", status: "Working", source: "Event", country: "JP", consentOptIn: true, createdAt: daysAgo(11) },
      { firstName: "Clara", lastName: "Jensen", email: "clara@nordicplay.dk", company: "NordicPlay", title: "Head of Monetisation", status: "Qualified", source: "Inbound email", country: "DK", consentOptIn: true, createdAt: daysAgo(18) },
      { firstName: "Ben", lastName: "Walsh", email: "ben.walsh@adbridge.ie", company: "AdBridge", title: "Founder", status: "Unqualified", source: "Website", country: "IE", consentOptIn: false, createdAt: daysAgo(27) },
      { firstName: "Olivia", lastName: "Chen", email: "o.chen@pacificreach.com.au", company: "Pacific Reach Media", title: "Programmatic Lead", status: "Converted", source: "Referral", country: "AU", consentOptIn: true, convertedAccountId: acc("Pacific Reach Media"), convertedContactId: contact("o.chen@pacificreach.com.au"), createdAt: daysAgo(90) },
      { firstName: "Mateo", lastName: "Silva", email: "mateo@riosports.br", company: "Rio Sports TV", title: "Digital Director", status: "New", source: "Webinar", country: "BR", consentOptIn: true, createdAt: daysAgo(1) },
    ],
  });

  // ---------------------------------------------------------------- Opportunities
  await prisma.opportunity.createMany({
    data: [
      { accountId: acc("BluePeak Streaming"), name: "BluePeak · Magnite Link adoption", stage: "Proposal", amountUsd: 420_000, closeDate: at("2026-12-19"), probability: 55, productId: products.LINK.id, renewalRisk: "Low", ownerName: "T. Lee" },
      { accountId: acc("Orchard TV"), name: "Orchard TV · CTV expansion", stage: "Qualification", amountUsd: 180_000, closeDate: at("2027-01-30"), probability: 30, productId: products.STREAMING.id, renewalRisk: "Medium", ownerName: "A. Nguyen" },
      { accountId: acc("Northwind Media"), name: "Northwind · SpringServe renewal FY27", stage: "Negotiation", amountUsd: 960_000, closeDate: at("2026-12-31"), probability: 75, productId: products.SPRINGSERVE.id, renewalRisk: "High", ownerName: "D. Park" },
      { accountId: acc("Atlas Buyers"), name: "Atlas Buyers · DV+ trading desk seat", stage: "Closed Won", amountUsd: 95_000, closeDate: at("2026-11-10"), probability: 100, productId: products.DVPLUS.id, ownerName: "M. Okafor" },
      { accountId: acc("Kestrel Games"), name: "Kestrel · SpringServe MSA", stage: "Negotiation", amountUsd: 240_000, closeDate: at("2026-12-05"), probability: 65, productId: products.SPRINGSERVE.id, renewalRisk: "Low", ownerName: "S. Ruiz" },
      { accountId: acc("Meridian Plus KK"), name: "Meridian Plus · Streaming renewal", stage: "Proposal", amountUsd: 310_000, closeDate: at("2027-02-15"), probability: 50, productId: products.STREAMING.id, renewalRisk: "Medium", ownerName: "K. Tanaka" },
      { accountId: acc("Sundial Apps"), name: "Sundial · DV+ mobile", stage: "Closed Lost", amountUsd: 40_000, closeDate: at("2026-10-01"), probability: 0, productId: products.DVPLUS.id, renewalRisk: "High", ownerName: "S. Ruiz" },
      { accountId: acc("Cobalt Agency Group"), name: "Cobalt · ClearLine curation pilot", stage: "Prospecting", amountUsd: 60_000, closeDate: at("2027-03-31"), probability: 10, productId: products.CURATION.id, ownerName: "M. Okafor" },
    ],
  });

  // ---------------------------------------------------------------- Contracts
  await prisma.magniteContract.createMany({
    data: [
      { contractNumber: "MC-2024-0117", accountId: acc("BluePeak Streaming"), productId: products.STREAMING.id, status: "Active", startDate: at("2024-03-01"), endDate: at("2027-02-28"), feePercent: 14.0, msaVersion: "MSA v3.1", dpaSigned: true },
      { contractNumber: "MC-2025-0042", accountId: acc("Orchard TV"), productId: products.STREAMING.id, status: "Active", startDate: at("2025-01-15"), endDate: at("2026-12-31"), feePercent: 15.0, msaVersion: "MSA v3.1", dpaSigned: true },
      { contractNumber: "MC-2023-0310", accountId: acc("Northwind Media"), productId: products.SPRINGSERVE.id, status: "Active", startDate: at("2023-11-01"), endDate: at("2026-12-31"), feePercent: 12.0, msaVersion: "MSA v2.4", dpaSigned: true, seatId: "SS-NW-001" },
      { contractNumber: "MC-2026-0208", accountId: acc("Northwind Media"), productId: products.SPRINGSERVE.id, status: "Pending signature", startDate: at("2026-11-01"), feePercent: 15.0, msaVersion: "MSA v3.1", dpaSigned: false, seatId: "SS-NW-002" },
      { contractNumber: "MC-2026-0231", accountId: acc("Atlas Buyers"), productId: products.DVPLUS.id, status: "Active", startDate: at("2026-11-10"), endDate: at("2027-11-09"), feePercent: 10.0, msaVersion: "MSA v3.1", dpaSigned: true, seatId: "DV-ATL-017" },
      { contractNumber: "MC-2025-0155", accountId: acc("Harbor Light News"), productId: products.DVPLUS.id, status: "Active", startDate: at("2025-06-01"), endDate: at("2027-05-31"), feePercent: 13.5, msaVersion: "MSA v3.0", dpaSigned: true },
      { contractNumber: "MC-2026-0199", accountId: acc("Kestrel Games"), productId: products.SPRINGSERVE.id, status: "Pending signature", startDate: at("2026-12-01"), feePercent: 12.0, msaVersion: "MSA v3.1 (redlines s.7)", dpaSigned: false },
      { contractNumber: "MC-2024-0088", accountId: acc("Sundial Apps"), productId: products.DVPLUS.id, status: "In termination", startDate: at("2024-05-01"), endDate: at("2026-12-15"), feePercent: 15.0, msaVersion: "MSA v2.4", dpaSigned: true },
      { contractNumber: "MC-2025-0301", accountId: acc("Pacific Reach Media"), productId: products.LINK.id, status: "Active", startDate: at("2025-09-01"), endDate: at("2027-08-31"), feePercent: 11.0, msaVersion: "MSA v3.1", dpaSigned: true },
      { contractNumber: "MC-2022-0410", accountId: acc("Meridian Plus KK"), productId: products.STREAMING.id, status: "Expired", startDate: at("2022-10-01"), endDate: at("2025-09-30"), feePercent: 14.0, msaVersion: "MSA v2.0", dpaSigned: true },
    ],
  });

  // ---------------------------------------------------------------- Cases (the ten rows on wireframe A1 plus the corrections on A2)
  const cases = [
    { caseNumber: "C-10231", subject: "Deal ID not showing in the streaming platform", intent: "Deal activation check", fromEmail: "adops@bluepeakstreaming.tv", account: "BluePeak Streaming", queue: "CTV Tech Ops", confidence: 94, status: "In progress", ownerName: "A. Nguyen", receivedAt: at("2026-11-23T09:12:00-05:00") },
    { caseNumber: "C-10230", subject: "Fill rate dropped to 12% on CTV after tag update", intent: "Ad-serving issue", fromEmail: "tech@orchardtv.com", account: "Orchard TV", queue: "CTV Tech Ops", confidence: 91, status: "New", receivedAt: at("2026-11-23T08:40:00-05:00") },
    { caseNumber: "C-10229", subject: "VAST 303 errors on our preroll router since last night", intent: "Router error", fromEmail: "ops@northwindmedia.com", account: "Northwind Media", queue: "SpringServe Support", confidence: 96, status: "Assigned", ownerName: "D. Park", receivedAt: at("2026-11-23T08:05:00-05:00") },
    { caseNumber: "C-10228", subject: "Fee showing as 15% on new SpringServe seat, contract says 12%", intent: "Fee configuration", fromEmail: "ops@northwindmedia.com", account: "Northwind Media", queue: "Needs review", confidence: 61, status: "Needs review", receivedAt: at("2026-11-23T07:58:00-05:00") },
    { caseNumber: "C-10227", subject: "New seat for our trading desk in DV+", intent: "Seat creation", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "DV+ Support", confidence: 88, status: "New", receivedAt: daysAgo(1, 3) },
    { caseNumber: "C-10226", subject: "Invoice 10422 does not match our report", intent: "Billing discrepancy", fromEmail: "ap@harborlightnews.com", account: "Harbor Light News", queue: "Billing & Finance", confidence: 93, status: "Waiting on client", ownerName: "M. Okafor", receivedAt: daysAgo(1, 5) },
    { caseNumber: "C-10225", subject: "Redlines on MSA section 7 (data processing)", intent: "Contract review", fromEmail: "legal@kestrelgames.io", account: "Kestrel Games", queue: "Legal & Contracts", confidence: 97, status: "Assigned", ownerName: "S. Ruiz", receivedAt: daysAgo(1, 8) },
    { caseNumber: "C-10224", subject: "Question about our contract and an unpaid invoice", intent: "Mixed: legal + billing", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "Needs review", confidence: 58, status: "Needs review", receivedAt: at("2026-10-26T14:20:00-04:00") },
    { caseNumber: "C-10223", subject: 'Can we add a "Renewal Risk" picklist to Opportunity?', intent: "Salesforce field request", fromEmail: "j.reyes@magnite.com", account: "Magnite (internal)", queue: "Salesforce Ops", confidence: 95, status: "Closed", ownerName: "J. Belson", receivedAt: at("2026-10-26T10:05:00-04:00"), closedAt: at("2026-10-28T16:00:00-04:00") },
    { caseNumber: "C-10222", subject: "Who is our account manager now?", intent: "Account contact request", fromEmail: "adops@bluepeakstreaming.tv", account: "BluePeak Streaming", queue: "Client Services", confidence: 83, status: "Closed", ownerName: "T. Lee", receivedAt: at("2026-10-25T11:30:00-04:00"), closedAt: at("2026-10-25T13:10:00-04:00") },
    { caseNumber: "C-10210", subject: "Cannot log in to ClearLine since password reset", intent: "Access issue", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "DV+ Support", confidence: 72, status: "Closed", ownerName: "T. Lee", receivedAt: daysAgo(6), closedAt: daysAgo(5) },
    { caseNumber: "C-10204", subject: "DPA signature request", intent: "Contract review", fromEmail: "legal@kestrelgames.io", account: "Kestrel Games", queue: "Legal & Contracts", confidence: 69, status: "In progress", ownerName: "S. Ruiz", receivedAt: daysAgo(8) },
    { caseNumber: "C-10232", subject: "Reporting API returning 500s for yesterday's data", fromEmail: "o.chen@pacificreach.com.au", account: "Pacific Reach Media", queue: "support@ inbox (unrouted)", status: "New", receivedAt: daysAgo(0, 1) },
    { caseNumber: "C-10233", subject: "Need W-9 for vendor onboarding", fromEmail: "a.roux@cobaltagency.fr", account: "Cobalt Agency Group", queue: "support@ inbox (unrouted)", status: "New", receivedAt: daysAgo(0, 2) },
  ];
  for (const c of cases) {
    const { account, ...rest } = c;
    const routed = rest.confidence != null;
    await prisma.case.create({
      data: {
        ...rest,
        accountId: acc(account),
        contactId: contact(rest.fromEmail),
        routingMode: routed ? "ai" : undefined,
        routedAt: routed ? new Date(rest.receivedAt.getTime() + 4 * 60 * 1000) : undefined,
      },
    });
  }

  const counts = {
    accounts: await prisma.account.count(),
    contacts: await prisma.contact.count(),
    leads: await prisma.lead.count(),
    products: await prisma.magniteProduct.count(),
    opportunities: await prisma.opportunity.count(),
    contracts: await prisma.magniteContract.count(),
    cases: await prisma.case.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
