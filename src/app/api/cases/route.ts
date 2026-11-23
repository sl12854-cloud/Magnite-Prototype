import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prepareCase, type InboundEmail } from "@/lib/ingest/email";
import { CASE_STATUSES, QUEUES, isQueue } from "@/lib/router/queues";

export const dynamic = "force-dynamic";

/**
 * GET /api/cases   (MAG-16)
 *
 * The A1 table: filter by queue, status, confidence band, free text and
 * received-after. Paged, newest first.
 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const take = Math.min(Number(p.get("limit") ?? 50) || 50, 200);
  const skip = Math.max(Number(p.get("offset") ?? 0) || 0, 0);

  const where: Record<string, unknown> = {};

  const queue = p.get("queue");
  if (queue && isQueue(queue)) where.queue = queue;

  const status = p.get("status");
  if (status && (CASE_STATUSES as readonly string[]).includes(status)) where.status = status;

  // Confidence bands are the A1 pill colours, not raw numbers.
  switch (p.get("confidence")) {
    case "high": where.confidence = { gte: 85 }; break;
    case "medium": where.confidence = { gte: 70, lt: 85 }; break;
    case "low": where.confidence = { lt: 70 }; break;
  }

  const since = p.get("since");
  if (since && !Number.isNaN(new Date(since).getTime())) {
    where.receivedAt = { gte: new Date(since) };
  }

  const q = p.get("q");
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { fromEmail: { contains: q } },
      { caseNumber: { contains: q } },
    ];
  }

  if (p.get("mine") === "true" && p.get("owner")) where.ownerName = p.get("owner");

  const [rows, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take,
      skip,
      include: {
        account: { select: { name: true } },
        corrections: { select: { fromQueue: true, toQueue: true, correctedBy: true, createdAt: true } },
      },
    }),
    prisma.case.count({ where }),
  ]);

  return NextResponse.json({ total, limit: take, offset: skip, cases: rows });
}

/**
 * POST /api/cases   (MAG-14)
 *
 * Accepts one inbound email, routes it and stores the case. This is the only
 * way a case is created: every email to support@ comes through here.
 */
export async function POST(req: Request) {
  let body: InboundEmail;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  if (!body?.from || !body?.subject) {
    return NextResponse.json({ error: "from and subject are required" }, { status: 400 });
  }

  const prepared = await prepareCase({
    ...body,
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
  });

  // Match the sender to an existing contact so the case lands on an account.
  const contact = await prisma.contact.findFirst({
    where: { email: prepared.fromEmail },
    select: { id: true, accountId: true },
  });

  const created = await prisma.case.create({
    data: {
      ...prepared,
      contactId: contact?.id,
      accountId: contact?.accountId,
    },
    include: { account: { select: { name: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}

/** Exposed so the A1 filter chips can be built from one source of truth. */
export const FILTERS = { queues: QUEUES, statuses: CASE_STATUSES };
