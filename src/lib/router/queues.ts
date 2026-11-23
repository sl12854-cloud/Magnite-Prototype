/**
 * The nine queues on wireframe A1, in sidebar order.
 *
 * "support@ inbox (unrouted)" is where a case sits between arriving and being
 * routed; "Needs review" is where the router puts anything it is not confident
 * enough about. Neither is a destination a human would pick on purpose, so
 * `ROUTABLE_QUEUES` excludes both.
 */
export const QUEUES = [
  "support@ inbox (unrouted)",
  "CTV Tech Ops",
  "SpringServe Support",
  "DV+ Support",
  "Salesforce Ops",
  "Billing & Finance",
  "Legal & Contracts",
  "Client Services",
  "Needs review",
] as const;

export type Queue = (typeof QUEUES)[number];

export const UNROUTED: Queue = "support@ inbox (unrouted)";
export const NEEDS_REVIEW: Queue = "Needs review";

/** Queues the router is allowed to choose as a final destination. */
export const ROUTABLE_QUEUES = QUEUES.filter(
  (q) => q !== UNROUTED && q !== NEEDS_REVIEW,
) as Exclude<Queue, typeof UNROUTED | typeof NEEDS_REVIEW>[];

export const isQueue = (v: string): v is Queue => (QUEUES as readonly string[]).includes(v);

/**
 * Confidence threshold, in percent. A case scoring below this goes to
 * Needs review instead of its predicted queue.
 *
 * MAG-21 asks whether this is global or per queue. The wireframe header shows
 * one global value, so global is the default and `QUEUE_THRESHOLDS` is the
 * escape hatch: add an entry to raise the bar for a queue where a wrong route
 * is expensive. Billing and Legal are the two with accuracy under 90% on A2,
 * so they are the realistic first candidates.
 */
export const DEFAULT_THRESHOLD = 70;

export const QUEUE_THRESHOLDS: Partial<Record<Queue, number>> = {};

export function thresholdFor(queue: Queue, globalThreshold = DEFAULT_THRESHOLD): number {
  return QUEUE_THRESHOLDS[queue] ?? globalThreshold;
}

/** Pill colour bands on A1: green >= 85, amber 70-84, red below 70. */
export type ConfidenceBand = "high" | "medium" | "low";

export function confidenceBand(confidence: number | null | undefined): ConfidenceBand {
  if (confidence == null || confidence < 70) return "low";
  if (confidence < 85) return "medium";
  return "high";
}

export const CASE_STATUSES = [
  "New",
  "Assigned",
  "In progress",
  "Waiting on client",
  "Needs review",
  "Closed",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
