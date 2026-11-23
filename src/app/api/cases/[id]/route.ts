import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CASE_STATUSES, isQueue, NEEDS_REVIEW } from "@/lib/router/queues";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const row = await prisma.case.findUnique({
    where: { id },
    include: {
      account: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      corrections: { orderBy: { createdAt: "desc" } },
    },
  });
  return row ? NextResponse.json(row) : NextResponse.json({ error: "not found" }, { status: 404 });
}

/**
 * PATCH /api/cases/:id   (MAG-16)
 *
 * Updates status, owner, or queue. Moving a case to a different queue is a
 * *correction*: it writes a CaseCorrection row, which is what makes routing
 * accuracy drop. That is the whole point - accuracy is measured by what
 * humans had to fix, not by what the model said about itself.
 *
 * A correction retrains nothing by itself (A2's footnote). It is evidence for
 * the weekly rules review.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  let body: { queue?: string; status?: string; ownerName?: string | null; correctedBy?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!(CASE_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: `unknown status: ${body.status}` }, { status: 400 });
    }
    data.status = body.status;
    if (body.status === "Closed") data.closedAt = new Date();
  }

  if (body.ownerName !== undefined) {
    data.ownerName = body.ownerName;
    if (body.ownerName && !existing.assignedAt) data.assignedAt = new Date();
  }

  const movingQueue = body.queue !== undefined && body.queue !== existing.queue;
  if (body.queue !== undefined) {
    if (!isQueue(body.queue)) {
      return NextResponse.json({ error: `unknown queue: ${body.queue}` }, { status: 400 });
    }
    data.queue = body.queue;
    // Coming out of review, the case is live again unless the caller said so.
    if (existing.queue === NEEDS_REVIEW && body.queue !== NEEDS_REVIEW && body.status === undefined) {
      data.status = "Assigned";
    }
    if (!existing.assignedAt && body.queue !== NEEDS_REVIEW) data.assignedAt = new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.case.update({ where: { id }, data });
    if (movingQueue) {
      await tx.caseCorrection.create({
        data: {
          caseId: id,
          fromQueue: existing.queue,
          toQueue: body.queue!,
          correctedBy: body.correctedBy ?? "Unknown",
          reason: body.reason ?? null,
        },
      });
    }
    return row;
  });

  return NextResponse.json({ ...updated, corrected: movingQueue });
}
