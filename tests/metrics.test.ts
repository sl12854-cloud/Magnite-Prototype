import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRoutingMetrics, formatBytes, type MetricsCase, type MetricsCorrection } from "../src/lib/metrics/routing";
import { NEEDS_REVIEW } from "../src/lib/router/queues";

/**
 * Builds the same case population the seed generates, without a database, and
 * checks that the metrics come out as the numbers printed on wireframe A2.
 * If someone changes the queue plan in prisma/volume.ts without changing the
 * wireframe, this is what fails.
 */
const PLAN: Record<string, [cases: number, corrected: number]> = {
  "CTV Tech Ops": [371, 22],
  "SpringServe Support": [291, 20],
  "DV+ Support": [185, 18],
  "Billing & Finance": [159, 25],
  "Legal & Contracts": [132, 24],
  "Salesforce Ops": [60, 3],
  "Client Services": [52, 7],
  "Needs review": [73, 0],
};

const FROM = new Date("2026-11-03T00:00:00Z");
const TO = new Date("2026-11-24T00:00:00Z");

function fixture() {
  const cases: MetricsCase[] = [];
  const corrections: MetricsCorrection[] = [];
  let n = 0;
  // 185 cases were not auto-routed: the 73 still in review plus the 112
  // corrected out of it. The other 7 corrections are queue-to-queue.
  let reviewExitsLeft = 112;

  for (const [queue, [count, corrected]] of Object.entries(PLAN)) {
    for (let i = 0; i < count; i++) {
      const id = `c${n++}`;
      const isCorrected = i < corrected;
      const cameFromReview = isCorrected && reviewExitsLeft > 0;
      if (cameFromReview) reviewExitsLeft--;

      const initialQueue =
        queue === NEEDS_REVIEW ? NEEDS_REVIEW : cameFromReview ? NEEDS_REVIEW : queue;

      const receivedAt = new Date(FROM.getTime() + (n % 21) * 86400000);
      cases.push({
        id,
        subject: `${queue} #${i}`,
        queue,
        initialQueue,
        confidence: initialQueue === NEEDS_REVIEW ? 60 : 90,
        // 2.1 GB spread evenly over 1,323 cases.
        attachmentBytes: Math.round(2_100_000_000 / 1323),
        receivedAt,
        assignedAt:
          queue === NEEDS_REVIEW ? null : new Date(receivedAt.getTime() + (n % 2 ? 7 : 15) * 60000),
      });
      if (isCorrected) {
        corrections.push({
          caseId: id,
          fromQueue: initialQueue,
          toQueue: queue,
          correctedBy: "D. Park",
          createdAt: new Date(receivedAt.getTime() + 3600000),
        });
      }
    }
  }
  return { cases, corrections };
}

test("the fixture is the population A2 describes", () => {
  const { cases, corrections } = fixture();
  assert.equal(cases.length, 1323, "total cases");
  assert.equal(corrections.length, 119, "corrections");
  const notAuto = cases.filter((c) => c.initialQueue === NEEDS_REVIEW).length;
  assert.equal(notAuto, 185, "cases that were never auto-routed");
});

test("the headline tiles match the wireframe", () => {
  const { cases, corrections } = fixture();
  const m = computeRoutingMetrics(cases, corrections, { from: FROM, to: TO });

  assert.equal(m.totals.cases, 1323);
  assert.equal(m.totals.correct, 1204, "1,204 of 1,323");
  assert.equal(m.totals.accuracyPct, 91, "routing accuracy");
  assert.equal(m.totals.autoRoutedPct, 86, "auto-routed");
  assert.equal(m.totals.needsReviewPct, 14, "sent to Needs review");
  assert.equal(m.totals.medianMinutesToAssign, 11, "time to first assignment");
  assert.equal(formatBytes(m.totals.bytesKeptOutOfSalesforce), "2.1 GB", "kept out of Salesforce");
});

test("the donut matches the wireframe, including the Other + review bucket", () => {
  const { cases, corrections } = fixture();
  const m = computeRoutingMetrics(cases, corrections, { from: FROM, to: TO });
  assert.deepEqual(
    m.shareByQueue.map((s) => [s.queue, s.cases]),
    [
      ["CTV Tech Ops", 371],
      ["SpringServe Support", 291],
      ["DV+ Support", 185],
      ["Billing & Finance", 159],
      ["Legal & Contracts", 132],
      ["Other + review", 185],
    ],
  );
  assert.equal(m.shareByQueue.reduce((s, q) => s + q.cases, 0), 1323);
});

test("accuracy by queue matches, and the two amber queues are the ones under 90", () => {
  const { cases, corrections } = fixture();
  const m = computeRoutingMetrics(cases, corrections, { from: FROM, to: TO });
  const got = Object.fromEntries(m.accuracyByQueue.map((q) => [q.queue, q.accuracyPct]));

  assert.equal(got["CTV Tech Ops"], 94);
  assert.equal(got["SpringServe Support"], 93);
  assert.equal(got["DV+ Support"], 90);
  assert.equal(got["Salesforce Ops"], 95);
  assert.equal(got["Billing & Finance"], 84);
  assert.equal(got["Legal & Contracts"], 82);

  const amber = m.accuracyByQueue.filter((q) => q.accuracyPct < 90).map((q) => q.queue).sort();
  assert.deepEqual(amber, ["Billing & Finance", "Client Services", "Legal & Contracts"]);
});

test("a case corrected twice is only wrong once", () => {
  const base: MetricsCase = {
    id: "x", subject: "s", queue: "DV+ Support", initialQueue: NEEDS_REVIEW,
    confidence: 50, attachmentBytes: 0, receivedAt: FROM, assignedAt: null,
  };
  const m = computeRoutingMetrics(
    [base, { ...base, id: "y", initialQueue: "DV+ Support", confidence: 95 }],
    [
      { caseId: "x", fromQueue: NEEDS_REVIEW, toQueue: "Billing & Finance", correctedBy: "A", createdAt: FROM },
      { caseId: "x", fromQueue: "Billing & Finance", toQueue: "DV+ Support", correctedBy: "B", createdAt: TO },
    ],
    { from: FROM, to: TO },
  );
  assert.equal(m.totals.correct, 1);
  assert.equal(m.totals.accuracyPct, 50);
});

test("unrouted cases sitting in support@ are left out of the rates", () => {
  const mk = (id: string, queue: string, initialQueue: string | null): MetricsCase => ({
    id, subject: id, queue, initialQueue, confidence: null,
    attachmentBytes: 0, receivedAt: FROM, assignedAt: null,
  });
  const m = computeRoutingMetrics(
    [mk("a", "DV+ Support", "DV+ Support"), mk("b", "support@ inbox (unrouted)", null)],
    [],
    { from: FROM, to: TO },
  );
  assert.equal(m.totals.cases, 2);
  assert.equal(m.totals.scored, 1);
  assert.equal(m.totals.autoRoutedPct, 100);
});
