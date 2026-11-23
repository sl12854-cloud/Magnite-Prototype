import { NEEDS_REVIEW, UNROUTED } from "../router/queues";

/**
 * Routing metrics for screen A2.
 *
 * The maths lives here as a pure function over plain rows so it can be tested
 * without a database (MAG-20) and so the numbers can be checked against the
 * wireframe directly. The Prisma query that feeds it is in `load.ts`.
 *
 * Definitions, which are the part worth arguing about in review:
 *
 *  - A case is *correctly routed* if it was never corrected. Accuracy is
 *    therefore (cases - corrected cases) / cases. A case corrected twice
 *    counts once.
 *  - A case is *auto-routed* if the router's first choice was a real queue.
 *    A case that went to Needs review and was then moved by a human is not
 *    auto-routed, even though it ends up in a real queue.
 *  - *Time to first assignment* is measured from receipt, not from routing,
 *    because the 47-minute alias-routing baseline it is compared against
 *    included the time an email sat in a shared mailbox.
 *  - Cases still sitting unrouted in support@ are excluded from accuracy and
 *    the auto-routed rate, because the router has not had its turn yet.
 */

export type MetricsCase = {
  id: string;
  subject: string;
  queue: string;
  initialQueue: string | null;
  confidence: number | null;
  attachmentBytes: number;
  receivedAt: Date;
  assignedAt: Date | null;
};

export type MetricsCorrection = {
  caseId: string;
  fromQueue: string;
  toQueue: string;
  correctedBy: string;
  createdAt: Date;
};

export type RoutingMetrics = {
  range: { from: string; to: string };
  totals: {
    cases: number;
    scored: number;
    correct: number;
    corrections: number;
    /** Percent, rounded. The headline tile. */
    accuracyPct: number;
    autoRouted: number;
    autoRoutedPct: number;
    needsReviewPct: number;
    medianMinutesToAssign: number | null;
    bytesKeptOutOfSalesforce: number;
  };
  perDay: { date: string; auto: number; review: number; total: number }[];
  shareByQueue: { queue: string; cases: number; pct: number }[];
  accuracyByQueue: { queue: string; cases: number; corrections: number; accuracyPct: number }[];
  recentCorrections: {
    caseId: string;
    subject: string;
    fromQueue: string;
    toQueue: string;
    correctedBy: string;
    at: string;
  }[];
};

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function computeRoutingMetrics(
  cases: MetricsCase[],
  corrections: MetricsCorrection[],
  range: { from: Date; to: Date },
  opts: { topQueues?: number; recentLimit?: number } = {},
): RoutingMetrics {
  const topQueues = opts.topQueues ?? 5;
  const recentLimit = opts.recentLimit ?? 4;

  // Cases the router has actually seen.
  const scored = cases.filter((c) => c.queue !== UNROUTED);
  const correctedIds = new Set(corrections.map((c) => c.caseId));
  const correctedHere = scored.filter((c) => correctedIds.has(c.id)).length;
  const autoRouted = scored.filter((c) => c.initialQueue != null && c.initialQueue !== NEEDS_REVIEW).length;

  const assignMinutes = scored
    .filter((c) => c.assignedAt != null)
    .map((c) => Math.round((c.assignedAt!.getTime() - c.receivedAt.getTime()) / 60000))
    .filter((m) => m >= 0);

  // ------------------------------------------------------------- per day
  const days = new Map<string, { auto: number; review: number }>();
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    days.set(isoDay(d), { auto: 0, review: 0 });
  }
  for (const c of scored) {
    const key = isoDay(c.receivedAt);
    const bucket = days.get(key) ?? { auto: 0, review: 0 };
    if (c.initialQueue != null && c.initialQueue !== NEEDS_REVIEW) bucket.auto++;
    else bucket.review++;
    days.set(key, bucket);
  }
  const perDay = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v, total: v.auto + v.review }));

  // --------------------------------------------------------- queue splits
  const byQueue = new Map<string, { cases: number; corrections: number }>();
  for (const c of scored) {
    const e = byQueue.get(c.queue) ?? { cases: 0, corrections: 0 };
    e.cases++;
    if (correctedIds.has(c.id)) e.corrections++;
    byQueue.set(c.queue, e);
  }

  const ranked = [...byQueue.entries()].sort((a, b) => b[1].cases - a[1].cases);
  const named = ranked.filter(([q]) => q !== NEEDS_REVIEW).slice(0, topQueues);
  const namedSet = new Set(named.map(([q]) => q));
  const otherCases = ranked
    .filter(([q]) => !namedSet.has(q))
    .reduce((s, [, v]) => s + v.cases, 0);

  const shareByQueue = [
    ...named.map(([queue, v]) => ({ queue, cases: v.cases, pct: pct(v.cases, scored.length) })),
    ...(otherCases > 0
      ? [{ queue: "Other + review", cases: otherCases, pct: pct(otherCases, scored.length) }]
      : []),
  ];

  const accuracyByQueue = ranked
    .filter(([q]) => q !== NEEDS_REVIEW)
    .map(([queue, v]) => ({
      queue,
      cases: v.cases,
      corrections: v.corrections,
      accuracyPct: pct(v.cases - v.corrections, v.cases),
    }));

  // ---------------------------------------------------------- corrections
  const subjects = new Map(cases.map((c) => [c.id, c.subject]));
  const recentCorrections = [...corrections]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, recentLimit)
    .map((c) => ({
      caseId: c.caseId,
      subject: subjects.get(c.caseId) ?? "(case not in range)",
      fromQueue: c.fromQueue,
      toQueue: c.toQueue,
      correctedBy: c.correctedBy,
      at: c.createdAt.toISOString(),
    }));

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    totals: {
      cases: cases.length,
      scored: scored.length,
      correct: scored.length - correctedHere,
      corrections: corrections.length,
      accuracyPct: pct(scored.length - correctedHere, scored.length),
      autoRouted,
      autoRoutedPct: pct(autoRouted, scored.length),
      needsReviewPct: 100 - pct(autoRouted, scored.length),
      medianMinutesToAssign: median(assignMinutes),
      bytesKeptOutOfSalesforce: scored.reduce((s, c) => s + (c.attachmentBytes || 0), 0),
    },
    perDay,
    shareByQueue,
    accuracyByQueue,
    recentCorrections,
  };
}

/** "2.1 GB" from a byte count, the way the A2 tile shows it. */
export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}
