"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { classifyCase } from "@/lib/router/classify";
import { NEEDS_REVIEW, UNROUTED } from "@/lib/router/queues";

/**
 * "Route inbox with AI" / "Route with rules only" on A1. Routes every case
 * still sitting in support@ through the same classifier the ingest path uses.
 * With no model wired in (MAG-9), both buttons end up on the keyword rules,
 * and routingMode records which one actually ran. Reseeding puts the six
 * demo emails back in the inbox.
 */
export async function routeInbox(formData: FormData) {
  const wanted = formData.get("mode") === "rules" ? "rules" : "ai";
  const waiting = await prisma.case.findMany({
    where: { queue: UNROUTED },
    include: { account: { select: { name: true } } },
  });

  for (const c of waiting) {
    const r = await classifyCase({
      subject: c.subject,
      body: c.description,
      fromEmail: c.fromEmail,
      accountName: c.account?.name,
    });
    const now = new Date();
    await prisma.case.update({
      where: { id: c.id },
      data: {
        queue: r.queue,
        initialQueue: r.queue,
        confidence: r.confidence,
        intent: r.intent,
        routingMode: wanted === "rules" ? "rules" : r.mode,
        routingReason: r.reason,
        status: r.queue === NEEDS_REVIEW ? "Needs review" : "New",
        routedAt: now,
      },
    });
  }

  revalidatePath("/cases");
  revalidatePath("/routing-performance");
}
