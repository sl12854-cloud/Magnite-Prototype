/**
 * Hand-written rows that appear verbatim on the wireframes
 * (wireframes/README.md). The generator in ./generator.ts adds volume
 * around these; nothing here should be changed without checking the designs.
 */

// Fixed "now" so dates line up with the wireframes regardless of when the seed runs.
export const NOW = new Date("2026-11-23T17:00:00Z");
export const daysAgo = (d: number, h = 0) => new Date(NOW.getTime() - (d * 24 + h) * 3600 * 1000);
export const at = (iso: string) => new Date(iso);

export const PRODUCTS = [
  { code: "SPRINGSERVE", name: "SpringServe", family: "Ad server", description: "Video ad serving and routing for CTV and OTT publishers." },
  { code: "DVPLUS", name: "DV+", family: "SSP", description: "Display, video and mobile exchange for demand partners." },
  { code: "CLEARLINE", name: "ClearLine", family: "Buyer platform", description: "Self-service buying of premium CTV and video inventory." },
  { code: "LINK", name: "Magnite Link", family: "SSP", description: "Unified connection that consolidates publisher supply paths." },
  { code: "STREAMING", name: "Magnite Streaming", family: "SSP", description: "CTV and streaming video supply platform." },
  { code: "CURATION", name: "Curation", family: "Curation", description: "Packaging and selling of curated deals across the exchange." },
];

export const ACCOUNTS = [
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

/** `account` is the account name; `duplicateOfEmail` marks a suspected duplicate of an earlier row. */
export const CONTACTS = [
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
  { account: "Cobalt Agency Group", firstName: "Amelie", lastName: "Roux", email: "a.roux@cobaltagency.fr", title: "Trading Director", country: undefined as string | undefined, consentOptIn: true, isPrimary: true, lastContactedAt: daysAgo(22) },
  { account: "Magnite (internal)", firstName: "Jordan", lastName: "Reyes", email: "j.reyes@magnite.com", title: "Sales Operations", country: "US", consentOptIn: true, isPrimary: true },
];

/** `convertedAccount` / `convertedContactEmail` are resolved to ids by the seed. */
export const LEADS = [
  { firstName: "Noah", lastName: "Bennett", email: "noah@skylinevod.com", company: "Skyline VOD", title: "COO", status: "New", source: "Webinar", country: "US", consentOptIn: true, createdAt: daysAgo(3) },
  { firstName: "Yuki", lastName: "Mori", email: "y.mori@tokyocast.jp", company: "TokyoCast", title: "Ad Sales Manager", status: "Working", source: "Event", country: "JP", consentOptIn: true, createdAt: daysAgo(11) },
  { firstName: "Clara", lastName: "Jensen", email: "clara@nordicplay.dk", company: "NordicPlay", title: "Head of Monetisation", status: "Qualified", source: "Inbound email", country: "DK", consentOptIn: true, createdAt: daysAgo(18) },
  { firstName: "Ben", lastName: "Walsh", email: "ben.walsh@adbridge.ie", company: "AdBridge", title: "Founder", status: "Unqualified", source: "Website", country: "IE", consentOptIn: false, createdAt: daysAgo(27) },
  { firstName: "Olivia", lastName: "Chen", email: "o.chen@pacificreach.com.au", company: "Pacific Reach Media", title: "Programmatic Lead", status: "Converted", source: "Referral", country: "AU", consentOptIn: true, convertedAccount: "Pacific Reach Media", convertedContactEmail: "o.chen@pacificreach.com.au", createdAt: daysAgo(90) },
  { firstName: "Mateo", lastName: "Silva", email: "mateo@riosports.br", company: "Rio Sports TV", title: "Digital Director", status: "New", source: "Webinar", country: "BR", consentOptIn: true, createdAt: daysAgo(1) },
];

/** `account` is the account name, `product` the product code. */
export const OPPORTUNITIES = [
  { account: "BluePeak Streaming", name: "BluePeak · Magnite Link adoption", stage: "Proposal", amountUsd: 420_000, closeDate: at("2026-12-19"), probability: 55, product: "LINK", renewalRisk: "Low", ownerName: "T. Lee" },
  { account: "Orchard TV", name: "Orchard TV · CTV expansion", stage: "Qualification", amountUsd: 180_000, closeDate: at("2027-01-30"), probability: 30, product: "STREAMING", renewalRisk: "Medium", ownerName: "A. Nguyen" },
  { account: "Northwind Media", name: "Northwind · SpringServe renewal FY27", stage: "Negotiation", amountUsd: 960_000, closeDate: at("2026-12-31"), probability: 75, product: "SPRINGSERVE", renewalRisk: "High", ownerName: "D. Park" },
  { account: "Atlas Buyers", name: "Atlas Buyers · DV+ trading desk seat", stage: "Closed Won", amountUsd: 95_000, closeDate: at("2026-11-10"), probability: 100, product: "DVPLUS", renewalRisk: undefined as string | undefined, ownerName: "M. Okafor" },
  { account: "Kestrel Games", name: "Kestrel · SpringServe MSA", stage: "Negotiation", amountUsd: 240_000, closeDate: at("2026-12-05"), probability: 65, product: "SPRINGSERVE", renewalRisk: "Low", ownerName: "S. Ruiz" },
  { account: "Meridian Plus KK", name: "Meridian Plus · Streaming renewal", stage: "Proposal", amountUsd: 310_000, closeDate: at("2027-02-15"), probability: 50, product: "STREAMING", renewalRisk: "Medium", ownerName: "K. Tanaka" },
  { account: "Sundial Apps", name: "Sundial · DV+ mobile", stage: "Closed Lost", amountUsd: 40_000, closeDate: at("2026-10-01"), probability: 0, product: "DVPLUS", renewalRisk: "High", ownerName: "S. Ruiz" },
  { account: "Cobalt Agency Group", name: "Cobalt · ClearLine curation pilot", stage: "Prospecting", amountUsd: 60_000, closeDate: at("2027-03-31"), probability: 10, product: "CURATION", renewalRisk: undefined, ownerName: "M. Okafor" },
];

export const CONTRACTS = [
  { contractNumber: "MC-2024-0117", account: "BluePeak Streaming", product: "STREAMING", status: "Active", startDate: at("2024-03-01"), endDate: at("2027-02-28"), feePercent: 14.0, msaVersion: "MSA v3.1", dpaSigned: true, seatId: undefined as string | undefined },
  { contractNumber: "MC-2025-0042", account: "Orchard TV", product: "STREAMING", status: "Active", startDate: at("2025-01-15"), endDate: at("2026-12-31"), feePercent: 15.0, msaVersion: "MSA v3.1", dpaSigned: true, seatId: undefined },
  { contractNumber: "MC-2023-0310", account: "Northwind Media", product: "SPRINGSERVE", status: "Active", startDate: at("2023-11-01"), endDate: at("2026-12-31"), feePercent: 12.0, msaVersion: "MSA v2.4", dpaSigned: true, seatId: "SS-NW-001" },
  { contractNumber: "MC-2026-0208", account: "Northwind Media", product: "SPRINGSERVE", status: "Pending signature", startDate: at("2026-11-01"), endDate: undefined as Date | undefined, feePercent: 15.0, msaVersion: "MSA v3.1", dpaSigned: false, seatId: "SS-NW-002" },
  { contractNumber: "MC-2026-0231", account: "Atlas Buyers", product: "DVPLUS", status: "Active", startDate: at("2026-11-10"), endDate: at("2027-11-09"), feePercent: 10.0, msaVersion: "MSA v3.1", dpaSigned: true, seatId: "DV-ATL-017" },
  { contractNumber: "MC-2025-0155", account: "Harbor Light News", product: "DVPLUS", status: "Active", startDate: at("2025-06-01"), endDate: at("2027-05-31"), feePercent: 13.5, msaVersion: "MSA v3.0", dpaSigned: true, seatId: undefined },
  { contractNumber: "MC-2026-0199", account: "Kestrel Games", product: "SPRINGSERVE", status: "Pending signature", startDate: at("2026-12-01"), endDate: undefined, feePercent: 12.0, msaVersion: "MSA v3.1 (redlines s.7)", dpaSigned: false, seatId: undefined },
  { contractNumber: "MC-2024-0088", account: "Sundial Apps", product: "DVPLUS", status: "In termination", startDate: at("2024-05-01"), endDate: at("2026-12-15"), feePercent: 15.0, msaVersion: "MSA v2.4", dpaSigned: true, seatId: undefined },
  { contractNumber: "MC-2025-0301", account: "Pacific Reach Media", product: "LINK", status: "Active", startDate: at("2025-09-01"), endDate: at("2027-08-31"), feePercent: 11.0, msaVersion: "MSA v3.1", dpaSigned: true, seatId: undefined },
  { contractNumber: "MC-2022-0410", account: "Meridian Plus KK", product: "STREAMING", status: "Expired", startDate: at("2022-10-01"), endDate: at("2025-09-30"), feePercent: 14.0, msaVersion: "MSA v2.0", dpaSigned: true, seatId: undefined },
];

/** The ten rows on wireframe A1, the corrections on A2, and six unrouted emails waiting in support@. */
export const CASES = [
  { caseNumber: "C-10231", subject: "Deal ID not showing in the streaming platform", intent: "Deal activation check", fromEmail: "adops@bluepeakstreaming.tv", account: "BluePeak Streaming", queue: "CTV Tech Ops", confidence: 94, status: "In progress", ownerName: "A. Nguyen", receivedAt: at("2026-11-23T09:12:00-05:00") },
  { caseNumber: "C-10230", subject: "Fill rate dropped to 12% on CTV after tag update", intent: "Ad-serving issue", fromEmail: "tech@orchardtv.com", account: "Orchard TV", queue: "CTV Tech Ops", confidence: 91, status: "New", ownerName: undefined as string | undefined, receivedAt: at("2026-11-23T08:40:00-05:00") },
  { caseNumber: "C-10229", subject: "VAST 303 errors on our preroll router since last night", intent: "Router error", fromEmail: "ops@northwindmedia.com", account: "Northwind Media", queue: "SpringServe Support", confidence: 96, status: "Assigned", ownerName: "D. Park", receivedAt: at("2026-11-23T08:05:00-05:00") },
  { caseNumber: "C-10228", subject: "Fee showing as 15% on new SpringServe seat, contract says 12%", intent: "Fee configuration", fromEmail: "ops@northwindmedia.com", account: "Northwind Media", queue: "Needs review", confidence: 61, status: "Needs review", ownerName: undefined, receivedAt: at("2026-11-23T07:58:00-05:00") },
  { caseNumber: "C-10227", subject: "New seat for our trading desk in DV+", intent: "Seat creation", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "DV+ Support", confidence: 88, status: "New", ownerName: undefined, receivedAt: at("2026-11-22T23:30:00Z") },
  { caseNumber: "C-10226", subject: "Invoice 10422 does not match our report", intent: "Billing discrepancy", fromEmail: "ap@harborlightnews.com", account: "Harbor Light News", queue: "Billing & Finance", confidence: 93, status: "Waiting on client", ownerName: "M. Okafor", receivedAt: at("2026-11-22T23:15:00Z") },
  { caseNumber: "C-10225", subject: "Redlines on MSA section 7 (data processing)", intent: "Contract review", fromEmail: "legal@kestrelgames.io", account: "Kestrel Games", queue: "Legal & Contracts", confidence: 97, status: "Assigned", ownerName: "S. Ruiz", receivedAt: at("2026-11-22T23:00:00Z") },
  { caseNumber: "C-10224", subject: "Question about our contract and an unpaid invoice", intent: "Mixed: legal + billing", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "Needs review", confidence: 58, status: "Needs review", ownerName: undefined, receivedAt: at("2026-10-26T14:20:00-04:00") },
  { caseNumber: "C-10223", subject: 'Can we add a "Renewal Risk" picklist to Opportunity?', intent: "Salesforce field request", fromEmail: "j.reyes@magnite.com", account: "Magnite (internal)", queue: "Salesforce Ops", confidence: 95, status: "Closed", ownerName: "J. Belson", receivedAt: at("2026-10-26T10:05:00-04:00"), closedAt: at("2026-10-28T16:00:00-04:00") },
  { caseNumber: "C-10222", subject: "Who is our account manager now?", intent: "Account contact request", fromEmail: "adops@bluepeakstreaming.tv", account: "BluePeak Streaming", queue: "Client Services", confidence: 83, status: "Closed", ownerName: "T. Lee", receivedAt: at("2026-10-25T11:30:00-04:00"), closedAt: at("2026-10-25T13:10:00-04:00") },
  { caseNumber: "C-10210", subject: "Cannot log in to ClearLine since password reset", intent: "Access issue", fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "DV+ Support", confidence: 72, status: "Closed", ownerName: "T. Lee", receivedAt: daysAgo(6), closedAt: daysAgo(5) },
  { caseNumber: "C-10204", subject: "DPA signature request", intent: "Contract review", fromEmail: "legal@kestrelgames.io", account: "Kestrel Games", queue: "Legal & Contracts", confidence: 69, status: "In progress", ownerName: "S. Ruiz", receivedAt: daysAgo(8) },
  { caseNumber: "C-10232", subject: "Reporting API returning 500s for yesterday's data", intent: undefined as string | undefined, fromEmail: "o.chen@pacificreach.com.au", account: "Pacific Reach Media", queue: "support@ inbox (unrouted)", confidence: undefined as number | undefined, status: "New", ownerName: undefined, receivedAt: daysAgo(0, 1) },
  { caseNumber: "C-10233", subject: "Need W-9 for vendor onboarding", intent: undefined, fromEmail: "a.roux@cobaltagency.fr", account: "Cobalt Agency Group", queue: "support@ inbox (unrouted)", confidence: undefined, status: "New", ownerName: undefined, receivedAt: daysAgo(0, 2) },
  { caseNumber: "C-10234", subject: "Fwd: deal 88213 paused on the streaming platform?", intent: undefined, fromEmail: "e.voss@bluepeakstreaming.tv", account: "BluePeak Streaming", queue: "support@ inbox (unrouted)", confidence: undefined, status: "New", ownerName: undefined, receivedAt: at("2026-11-23T16:35:00Z") },
  { caseNumber: "C-10235", subject: "Add two traders to our DV+ seat", intent: undefined, fromEmail: "partnerships@atlasbuyers.co", account: "Atlas Buyers", queue: "support@ inbox (unrouted)", confidence: undefined, status: "New", ownerName: undefined, receivedAt: at("2026-11-23T16:20:00Z") },
  { caseNumber: "C-10236", subject: "Invoice 10431 shows last month's rate", intent: undefined, fromEmail: "ap@harborlightnews.com", account: "Harbor Light News", queue: "support@ inbox (unrouted)", confidence: undefined, status: "New", ownerName: undefined, receivedAt: at("2026-11-23T15:40:00Z") },
  { caseNumber: "C-10237", subject: "NDA for the Q1 publisher conversation", intent: undefined, fromEmail: "legal@kestrelgames.io", account: "Kestrel Games", queue: "support@ inbox (unrouted)", confidence: undefined, status: "New", ownerName: undefined, receivedAt: at("2026-11-23T14:50:00Z") },
];
