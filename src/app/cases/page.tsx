import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadQueueCounts, loadRoutingMetrics } from "@/lib/metrics/load";
import { QUEUES, NEEDS_REVIEW, confidenceBand, CASE_STATUSES, isQueue } from "@/lib/router/queues";
import s from "./Screen.module.css";

export const dynamic = "force-dynamic";

/** Screen A1 - Case queue (MAG-18). Built to wireframes/images/A1-case-queue.png. */

type Search = { queue?: string; status?: string; confidence?: string; tab?: string };

const fmtWhen = (d: Date) =>
  d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function CaseQueue({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "all";

  const where: Record<string, unknown> = {};
  if (sp.queue && isQueue(sp.queue)) where.queue = sp.queue;
  if (sp.status && (CASE_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (sp.confidence === "high") where.confidence = { gte: 85 };
  if (sp.confidence === "medium") where.confidence = { gte: 70, lt: 85 };
  if (sp.confidence === "low") where.confidence = { lt: 70 };
  if (tab === "review") where.queue = NEEDS_REVIEW;

  const [cases, counts, metrics, reviewCount] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: { account: { select: { name: true } } },
    }),
    loadQueueCounts(),
    loadRoutingMetrics(),
    prisma.case.count({ where: { queue: NEEDS_REVIEW, status: { not: "Closed" } } }),
  ]);

  const href = (patch: Search) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const qs = next.toString();
    return `/cases${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <div className={s.brand}>Mandala · Case Router</div>
        <div className={s.sideHead}>Queues</div>
        {QUEUES.map((q) => (
          <Link
            key={q}
            href={href({ queue: sp.queue === q ? undefined : q, tab: undefined })}
            className={`${s.qLink} ${sp.queue === q ? s.qActive : ""}`}
          >
            <span>{q}</span>
            <span className={s.qCount}>{counts[q] ?? 0}</span>
          </Link>
        ))}
        <div className={s.statCard}>
          <div className={s.statLabel}>Routing accuracy this week</div>
          <div className={s.statValue}>{metrics.totals.accuracyPct}%</div>
          <div className={s.statFoot}>
            {metrics.totals.correct.toLocaleString()} of {metrics.totals.scored.toLocaleString()} cases
          </div>
        </div>
      </aside>

      <main className={s.main}>
        <div className={s.crumb}>Magnite / Mandala / Case Router</div>
        <h1 className={s.h1}>Case queue</h1>

        <nav className={s.tabs}>
          <Link href={href({ tab: undefined, queue: undefined })} className={`${s.tab} ${tab === "all" ? s.tabOn : ""}`}>
            All cases
          </Link>
          <Link href={href({ tab: "review", queue: undefined })} className={`${s.tab} ${tab === "review" ? s.tabOn : ""}`}>
            Needs review <span className={s.amber}>{reviewCount}</span>
          </Link>
          <Link href="/routing-performance" className={s.tab}>
            View routing performance →
          </Link>
        </nav>

        <div className={s.filters}>
          {(["high", "medium", "low"] as const).map((b) => (
            <Link
              key={b}
              href={href({ confidence: sp.confidence === b ? undefined : b })}
              className={`${s.chip} ${sp.confidence === b ? s.chipOn : ""}`}
            >
              {b === "high" ? "Confidence 85+" : b === "medium" ? "70-84" : "Below 70"}
            </Link>
          ))}
          {["New", "Needs review", "In progress", "Closed"].map((st) => (
            <Link
              key={st}
              href={href({ status: sp.status === st ? undefined : st })}
              className={`${s.chip} ${sp.status === st ? s.chipOn : ""}`}
            >
              {st}
            </Link>
          ))}
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>From</th>
                <th>Routed to</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const band = confidenceBand(c.confidence);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={s.subject}>{c.subject}</div>
                      {c.intent && <div className={s.intent}>{c.intent}</div>}
                    </td>
                    <td>
                      <div className={s.muted}>{c.fromEmail}</div>
                      <div className={s.intent}>{c.account?.name ?? "—"}</div>
                    </td>
                    <td className={s.nowrap}>{c.queue}</td>
                    <td>
                      {c.confidence == null ? (
                        <span className={`${s.pill} ${s.neutral}`}>not routed</span>
                      ) : (
                        <span className={`${s.pill} ${s[band]}`}>{c.confidence}%</span>
                      )}
                    </td>
                    <td>
                      <span className={`${s.pill} ${c.status === "Needs review" ? s.medium : s.neutral}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className={s.muted}>{c.ownerName ?? "—"}</td>
                    <td className={`${s.muted} ${s.nowrap}`}>{fmtWhen(c.receivedAt)}</td>
                  </tr>
                );
              })}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={7} className={s.empty}>No cases match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className={s.foot}>
          Every email to support@ becomes a case here. Nothing is written to Salesforce until a case closes.
        </p>
      </main>
    </div>
  );
}
