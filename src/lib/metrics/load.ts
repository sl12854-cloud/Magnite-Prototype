import { prisma } from "@/lib/prisma";
import { computeRoutingMetrics, type RoutingMetrics } from "./routing";

/** Default window: the period A2 shows. */
export const DEFAULT_FROM = new Date("2026-11-03T00:00:00-05:00");
export const DEFAULT_TO = new Date("2026-11-24T23:59:59-05:00");

/**
 * Reads the rows the metrics need and hands them to the pure calculator.
 * Kept separate so the maths can be tested without a database.
 */
export async function loadRoutingMetrics(range?: {
  from?: Date;
  to?: Date;
}): Promise<RoutingMetrics> {
  const from = range?.from ?? DEFAULT_FROM;
  const to = range?.to ?? DEFAULT_TO;

  const cases = await prisma.case.findMany({
    where: { receivedAt: { gte: from, lte: to } },
    select: {
      id: true,
      subject: true,
      queue: true,
      initialQueue: true,
      confidence: true,
      attachmentBytes: true,
      receivedAt: true,
      assignedAt: true,
    },
  });

  const corrections = await prisma.caseCorrection.findMany({
    where: { case: { receivedAt: { gte: from, lte: to } } },
    select: {
      caseId: true,
      fromQueue: true,
      toQueue: true,
      correctedBy: true,
      createdAt: true,
    },
  });

  return computeRoutingMetrics(cases, corrections, { from, to });
}

/** Open case counts per queue, for the A1 sidebar. */
export async function loadQueueCounts(): Promise<Record<string, number>> {
  const rows = await prisma.case.groupBy({
    by: ["queue"],
    where: { status: { not: "Closed" } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.queue, r._count._all]));
}
