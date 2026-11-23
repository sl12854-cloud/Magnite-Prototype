/**
 * Generates the case history behind wireframe A2.
 *
 * A2 is not decoration: MAG-17 says the metrics endpoint has to reproduce its
 * numbers from seed data, so this file is built backwards from the wireframe.
 * Every figure below is a target taken from `wireframes/html/RoutingPerformance.html`:
 *
 *   1,323 cases            Nov 3 - Nov 24, 2026
 *   91% routing accuracy   1,204 of 1,323, so exactly 119 corrections
 *   86% auto-routed        so exactly 185 cases first landed in Needs review
 *   11 min median time to first assignment
 *   2.1 GB of email kept out of Salesforce
 *   Queue split            CTV 371, SpringServe 291, DV+ 185, Billing 159,
 *                          Legal 132, other + review 185
 *   Accuracy by queue      CTV 94, SpringServe 93, DV+ 90, Salesforce Ops 95,
 *                          Billing 84, Legal 82
 *   Last full week         Mon-Sun: 71, 82, 66, 78, 84, 25, 17
 *   38 cases mentioning both an invoice and a contract
 *
 * Quotas are filled by construction rather than sampled, so the numbers are
 * exact on every run and the metrics endpoint can be asserted against them.
 * Everything is driven by a fixed PRNG seed: re-running produces byte-identical
 * data, which is what lets MAG-20's tests pin the figures.
 */
import type { PrismaClient } from "@prisma/client";
import { NEEDS_REVIEW, type Queue } from "../src/lib/router/queues";

// ------------------------------------------------------------------ targets
export const TARGETS = {
  /**
   * 1,323 cases appear on A2. Fourteen of them are the hand-written rows in
   * seed.ts that A1 shows by name, so this generator makes up the difference.
   */
  grandTotal: 1323,
  handWritten: 14,
  total: 1309,
  corrections: 119,
  /** Cases whose first routing decision was "not confident enough". */
  initialReview: 185,
  bytesTotal: 2_100_000_000,
  windowStart: new Date("2026-11-03T00:00:00-05:00"),
  windowEnd: new Date("2026-11-24T23:59:59-05:00"),
  /** Mon 16 Nov - Sun 22 Nov, the last full week on the chart. */
  lastWeekStart: new Date("2026-11-16T00:00:00-05:00"),
  /**
   * Mon-Sun totals on the chart, less the hand-written rows that already fall
   * in that week: one on Tue 17 Nov and three on Sun 22 Nov.
   */
  lastWeek: [71, 81, 66, 78, 84, 25, 14],
} as const;

/** Final queue -> [case count, how many of them were later corrected]. */
const QUEUE_PLAN: Record<string, [count: number, corrected: number]> = {
  "CTV Tech Ops": [369, 22],
  "SpringServe Support": [290, 20],
  "DV+ Support": [183, 18],
  "Billing & Finance": [158, 25],
  "Legal & Contracts": [130, 24],
  "Salesforce Ops": [59, 3],
  "Client Services": [51, 7],
  "Needs review": [69, 0],
};

/**
 * Seven of the 119 corrections are queue-to-queue rather than out of review:
 * the router was confident and still wrong. Two of them are the ones named on
 * A2's corrections card.
 */
const QUEUE_TO_QUEUE: { from: Queue; to: Queue }[] = [
  { from: "Client Services", to: "DV+ Support" },
  { from: "Salesforce Ops", to: "Legal & Contracts" },
  { from: "Billing & Finance", to: "Legal & Contracts" },
  { from: "Legal & Contracts", to: "Billing & Finance" },
  { from: "CTV Tech Ops", to: "SpringServe Support" },
  { from: "SpringServe Support", to: "CTV Tech Ops" },
  { from: "DV+ Support", to: "Client Services" },
];

const OWNERS = ["T. Lee", "A. Nguyen", "D. Park", "M. Okafor", "S. Ruiz", "K. Tanaka", "J. Belson"];

// -------------------------------------------------------------------- prng
/** mulberry32: small, fast, and identical across Node versions. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- subjects
const SUBJECTS: Record<string, string[]> = {
  "CTV Tech Ops": [
    "Deal ID not delivering on connected TV",
    "Fill rate dropped on CTV inventory overnight",
    "Ad pod returning empty on our streaming app",
    "OTT manifest requests timing out",
    "CTV bitrate mismatch on the new player build",
    "No bids on our CTV deal since the platform update",
    "Ad break duration not matching the pod request",
  ],
  "SpringServe Support": [
    "VAST 303 errors on the preroll router",
    "SpringServe tag update broke our waterfall",
    "Ad server reporting discrepancy against our logs",
    "VPAID creative failing to render in SpringServe",
    "Router latency spike on the ad server this morning",
    "SpringServe seat not serving after the tag change",
  ],
  "DV+ Support": [
    "New seat for our trading desk in DV+",
    "Cannot log in to ClearLine after password reset",
    "DV+ access request for two new traders",
    "ClearLine deal not visible to our buyers",
    "SSO failing for our DV+ seat",
    "DV+ bid responses dropping for one buyer",
  ],
  "Salesforce Ops": [
    "Can we add a picklist to the Opportunity object",
    "Salesforce report request for the CTV pipeline",
    "Mandala field mapping question",
    "Duplicate account records in Salesforce",
    "Request: new field on Contact for consent",
  ],
  "Billing & Finance": [
    "Invoice does not match our monthly report",
    "Payment remittance advice for last month",
    "Credit note request on a disputed invoice",
    "W-9 needed for vendor onboarding",
    "Revenue share calculation looks wrong",
    "Payout missing for the October period",
  ],
  "Legal & Contracts": [
    "Redlines on MSA section 7 (data processing)",
    "DPA signature request",
    "NDA for an upcoming publisher conversation",
    "Contract amendment for the new seat",
    "GDPR data processing question from our counsel",
    "MSA renewal: who signs on your side",
  ],
  "Client Services": [
    "Who is our account manager now",
    "Introduction request for the new ad ops lead",
    "Quarterly check-in scheduling",
    "QBR deck request ahead of next month",
    "General question about our Magnite setup",
  ],
  "Needs review": [
    "Question about our contract and an unpaid invoice",
    "Fee showing higher than our contract says",
    "Reporting API returning errors and a billing question",
    "Several issues in one email",
    "Not sure who to send this to",
  ],
};

/** The 38 cases A2 calls out as mentioning both an invoice and a contract. */
const INVOICE_AND_CONTRACT = [
  "Question about our contract and an unpaid invoice",
  "Invoice fee does not match the MSA rate",
  "Contract says 12% but we were billed 15%",
  "Unpaid invoice against a contract in termination",
  "Billing dispute tied to the MSA amendment",
];

const BODY = (subject: string, account: string) =>
  `Hi team,\n\n${subject}. This is on the ${account} account. Can someone take a look and come back to us today?\n\nThanks`;

// ------------------------------------------------------------------- helper
function allocateDays(rand: () => number): Date[] {
  const dates: Date[] = [];
  const push = (day: Date, n: number) => {
    for (let i = 0; i < n; i++) {
      // Business hours, weighted toward the morning, so the day curve looks real.
      const hour = 7 + Math.floor(rand() * 11);
      const minute = Math.floor(rand() * 60);
      const d = new Date(day);
      d.setHours(hour, minute, Math.floor(rand() * 60), 0);
      dates.push(d);
    }
  };

  // The last full week is pinned to the chart.
  TARGETS.lastWeek.forEach((n, i) => {
    const day = new Date(TARGETS.lastWeekStart);
    day.setDate(day.getDate() + i);
    push(day, n);
  });

  // The remaining days share whatever is left, weekends lighter.
  const pinnedFrom = TARGETS.lastWeekStart.getTime();
  const pinnedTo = pinnedFrom + 7 * 86400000;
  const others: Date[] = [];
  for (let t = new Date(TARGETS.windowStart); t <= TARGETS.windowEnd; t.setDate(t.getDate() + 1)) {
    const ts = t.getTime();
    if (ts >= pinnedFrom && ts < pinnedTo) continue;
    others.push(new Date(t));
  }
  const weight = (d: Date) => (d.getDay() === 0 || d.getDay() === 6 ? 0.28 : 1);
  const totalWeight = others.reduce((s, d) => s + weight(d), 0);
  const remaining = TARGETS.total - TARGETS.lastWeek.reduce((a, b) => a + b, 0);

  let placed = 0;
  others.forEach((d, i) => {
    const isLast = i === others.length - 1;
    const n = isLast
      ? remaining - placed
      : Math.round((weight(d) / totalWeight) * remaining);
    push(d, Math.max(0, n));
    placed += Math.max(0, n);
  });

  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

// --------------------------------------------------------------------- main
export async function seedVolume(prisma: PrismaClient) {
  const rand = prng(20261123);
  const dates = allocateDays(rand);
  if (dates.length !== TARGETS.total) {
    throw new Error(`date allocation produced ${dates.length}, expected ${TARGETS.total}`);
  }

  const accounts = await prisma.account.findMany({
    where: { type: { not: "Internal" } },
    select: { id: true, name: true },
  });
  const internal = await prisma.account.findFirst({ where: { type: "Internal" }, select: { id: true, name: true } });

  // Build the exact queue roster, then shuffle it against the date list.
  type Slot = { queue: Queue; corrected: boolean };
  const slots: Slot[] = [];
  for (const [queue, [count, corrected]] of Object.entries(QUEUE_PLAN)) {
    for (let i = 0; i < count; i++) slots.push({ queue: queue as Queue, corrected: i < corrected });
  }
  if (slots.length !== TARGETS.total) {
    throw new Error(`queue plan sums to ${slots.length}, expected ${TARGETS.total}`);
  }
  const correctedCount = slots.filter((s) => s.corrected).length;
  if (correctedCount !== TARGETS.corrections) {
    throw new Error(`queue plan has ${correctedCount} corrections, expected ${TARGETS.corrections}`);
  }

  // Fisher-Yates with the seeded PRNG.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  // Decide which corrected cases are queue-to-queue rather than out of review.
  const correctedIdx = slots.map((s, i) => (s.corrected ? i : -1)).filter((i) => i >= 0);
  const q2qAt = new Map<number, { from: Queue; to: Queue }>();
  QUEUE_TO_QUEUE.forEach((pair, n) => {
    const idx = correctedIdx.find((i) => slots[i].queue === pair.to && !q2qAt.has(i));
    if (idx != null) q2qAt.set(idx, pair);
  });

  // How many cases must have started in Needs review, beyond those corrected
  // out of it: the ones still sitting there.
  const movedOutOfReview = correctedIdx.length - q2qAt.size;
  const stillInReview = QUEUE_PLAN["Needs review"][0];
  const initialReview = movedOutOfReview + stillInReview;
  // The queue plan yields 112 moved out of review plus 69 still there: 181.
  // The hand-written rows supply the rest of A2's 185 not auto-routed: two
  // sitting in Needs review and one routed below the 70% threshold (C-10204).
  // The two unrouted support@ rows sit outside the queue split altogether.
  const expectedInitialReview = TARGETS.initialReview - 4;
  if (initialReview !== expectedInitialReview) {
    throw new Error(`initial review count is ${initialReview}, expected ${expectedInitialReview}`);
  }

  // Attachment sizes: log-normal-ish, then scaled so the total lands on 2.1 GB.
  const rawBytes = dates.map(() => Math.exp(12.5 + rand() * 2.2));
  const scale = TARGETS.bytesTotal / rawBytes.reduce((a, b) => a + b, 0);
  const bytes = rawBytes.map((b) => Math.round(b * scale));
  bytes[0] += TARGETS.bytesTotal - bytes.reduce((a, b) => a + b, 0);

  // Time to first assignment: median must come out at 11 minutes.
  const assignMinutes = dates.map((_, i) => {
    const r = rand();
    if (i % 2 === 0) return 3 + Math.floor(r * 8); // 3-10
    return 11 + Math.floor(r * 34); // 11-44
  });

  const rows: any[] = [];
  const corrections: { caseIndex: number; fromQueue: string; toQueue: string; correctedBy: string; reason: string }[] = [];
  let invoiceContractLeft = 38;

  slots.forEach((slot, i) => {
    const receivedAt = dates[i];
    const q2q = q2qAt.get(i);
    const finalQueue = slot.queue;

    const isInternal = finalQueue === "Salesforce Ops";
    const account = isInternal && internal ? internal : accounts[Math.floor(rand() * accounts.length)];

    let subject: string;
    if (invoiceContractLeft > 0 && (finalQueue === "Billing & Finance" || finalQueue === "Legal & Contracts" || finalQueue === NEEDS_REVIEW) && rand() < 0.3) {
      subject = INVOICE_AND_CONTRACT[Math.floor(rand() * INVOICE_AND_CONTRACT.length)];
      invoiceContractLeft--;
    } else {
      const pool = SUBJECTS[finalQueue] ?? SUBJECTS[NEEDS_REVIEW];
      subject = pool[Math.floor(rand() * pool.length)];
    }

    // Provenance: where the router first put it.
    const initialQueue: Queue = q2q ? q2q.from : slot.corrected || finalQueue === NEEDS_REVIEW ? NEEDS_REVIEW : finalQueue;
    const autoRouted = initialQueue !== NEEDS_REVIEW;

    // Confidence has to agree with the decision: below 70 means review.
    const confidence = autoRouted
      ? 70 + Math.floor(rand() * 30)
      : 35 + Math.floor(rand() * 34);

    const routedAt = new Date(receivedAt.getTime() + (2 + Math.floor(rand() * 5)) * 60000);
    const assignedAt = new Date(routedAt.getTime() + assignMinutes[i] * 60000);
    const open = rand() < 0.14;
    const closedAt = open ? null : new Date(assignedAt.getTime() + (30 + Math.floor(rand() * 2600)) * 60000);
    const owner = finalQueue === NEEDS_REVIEW ? null : OWNERS[Math.floor(rand() * OWNERS.length)];

    rows.push({
      caseNumber: `C-2${String(20000 + i)}`,
      subject,
      intent: null,
      description: BODY(subject, account?.name ?? "the account"),
      fromEmail: `team@${(account?.name ?? "client").toLowerCase().replace(/[^a-z]+/g, "")}.example`,
      accountId: account?.id ?? null,
      queue: finalQueue,
      confidence,
      status: finalQueue === NEEDS_REVIEW ? "Needs review" : closedAt ? "Closed" : open ? "In progress" : "Assigned",
      ownerName: owner,
      routingMode: "ai",
      initialQueue,
      routingReason: autoRouted
        ? `Model routed to ${initialQueue} with ${confidence}% confidence.`
        : `Confidence ${confidence}% is below the 70% threshold.`,
      attachmentBytes: bytes[i],
      receivedAt,
      routedAt,
      assignedAt: finalQueue === NEEDS_REVIEW ? null : assignedAt,
      closedAt,
    });

    if (slot.corrected) {
      corrections.push({
        caseIndex: i,
        fromQueue: initialQueue,
        toQueue: finalQueue,
        correctedBy: OWNERS[Math.floor(rand() * OWNERS.length)],
        reason: q2q ? "Router was confident but wrong." : "Moved out of review in the weekly pass.",
      });
    }
  });

  // Write in batches; SQLite does not love one 1,300-row statement.
  for (let i = 0; i < rows.length; i += 200) {
    await prisma.case.createMany({ data: rows.slice(i, i + 200) });
  }

  const created = await prisma.case.findMany({
    where: { caseNumber: { startsWith: "C-2" } },
    select: { id: true, caseNumber: true, routedAt: true },
  });
  const byNumber = new Map(created.map((c) => [c.caseNumber, c]));

  const correctionRows = corrections.map((c) => {
    const row = byNumber.get(`C-2${String(20000 + c.caseIndex)}`)!;
    return {
      caseId: row.id,
      fromQueue: c.fromQueue,
      toQueue: c.toQueue,
      correctedBy: c.correctedBy,
      reason: c.reason,
      createdAt: new Date((row.routedAt ?? new Date()).getTime() + (20 + Math.floor(rand() * 2000)) * 60000),
    };
  });
  for (let i = 0; i < correctionRows.length; i += 200) {
    await prisma.caseCorrection.createMany({ data: correctionRows.slice(i, i + 200) });
  }

  await pinRecentCorrections(prisma);

  return { cases: rows.length, corrections: correctionRows.length };
}

/**
 * A2's corrections card names four moves. They are real rows in the generated
 * data, but the card is the first thing anyone checks against the wireframe,
 * so the four most recent corrections are relabelled to match it exactly.
 */
const PINNED: { subject: string; fromQueue: Queue; toQueue: Queue; correctedBy: string }[] = [
  { subject: "Fee showing as 15% on new SpringServe seat", fromQueue: NEEDS_REVIEW, toQueue: "SpringServe Support", correctedBy: "D. Park" },
  { subject: "Question about our contract and an unpaid invoice", fromQueue: NEEDS_REVIEW, toQueue: "Billing & Finance", correctedBy: "M. Okafor" },
  { subject: "Cannot log in to ClearLine since password reset", fromQueue: "Client Services", toQueue: "DV+ Support", correctedBy: "T. Lee" },
  { subject: "DPA signature request", fromQueue: "Salesforce Ops", toQueue: "Legal & Contracts", correctedBy: "S. Ruiz" },
];

async function pinRecentCorrections(prisma: PrismaClient) {
  const recent = await prisma.caseCorrection.findMany({
    orderBy: { createdAt: "desc" },
    take: PINNED.length,
    select: { id: true, caseId: true },
  });
  for (let i = 0; i < recent.length && i < PINNED.length; i++) {
    const pin = PINNED[i];
    await prisma.caseCorrection.update({
      where: { id: recent[i].id },
      data: { fromQueue: pin.fromQueue, toQueue: pin.toQueue, correctedBy: pin.correctedBy },
    });
    await prisma.case.update({
      where: { id: recent[i].caseId },
      data: { subject: pin.subject, queue: pin.toQueue, initialQueue: pin.fromQueue },
    });
  }
}
