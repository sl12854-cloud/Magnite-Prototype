import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FROM, DEFAULT_TO, loadRoutingMetrics } from "@/lib/metrics/load";
import { formatBytes } from "@/lib/metrics/routing";
import { DEFAULT_THRESHOLD, ROUTABLE_QUEUES } from "@/lib/router/queues";
import { Rail, TopBar } from "../cases/shell";

export const dynamic = "force-dynamic";

/**
 * Screen A2 - Routing performance (MAG-19), built to
 * wireframes/images/A2-routing-performance.png. Every number comes from the
 * metrics calculator behind /api/metrics/routing, so the screen tracks the
 * seed. Charts are inline SVG and flexbox.
 */

const DONUT = ["#3348f0", "#1f9d8a", "#8b5cf6", "#c48a1a", "#c0392b", "#9a9a9a"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

type Tab = "queues" | "performance" | "corrections";

export default async function RoutingPerformance({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "queues" || sp.tab === "corrections" ? sp.tab : "performance";
  const m = await loadRoutingMetrics();
  const t = m.totals;

  // The chart shows the last full Monday–Sunday week inside the range.
  const sundayIdx = [...m.perDay].map((d, i) => ({ d, i })).filter(({ d }) => new Date(d.date).getUTCDay() === 0).pop()?.i ?? m.perDay.length - 1;
  const week = m.perDay.slice(Math.max(0, sundayIdx - 6), sundayIdx + 1);
  const peak = Math.max(1, ...week.map((d) => d.total));

  // Accuracy rows in sidebar order, the six queues the wireframe shows.
  const accByQueue = new Map(m.accuracyByQueue.map((q) => [q.queue, q]));
  const accRows = ROUTABLE_QUEUES.map((q) => accByQueue.get(q)).filter((q): q is NonNullable<typeof q> => !!q).slice(0, 6);

  // Donut: one dashed arc per slice on a shared circle.
  const R = 70, C = 2 * Math.PI * R;
  let offset = 0;
  const slices = m.shareByQueue.map((q, i) => {
    const len = (q.cases / Math.max(1, t.scored)) * C;
    const s = { ...q, len, offset, colour: DONUT[i % DONUT.length] };
    offset += len;
    return s;
  });

  const corrections =
    tab === "corrections"
      ? await prisma.caseCorrection.findMany({
          where: { case: { receivedAt: { gte: DEFAULT_FROM, lte: DEFAULT_TO } } },
          orderBy: { createdAt: "desc" },
          include: { case: { select: { caseNumber: true, subject: true, account: { select: { name: true } } } } },
        })
      : [];

  return (
    <div className="shell">
      <Rail active="cases" />
      <div className="main">
        <TopBar crumb="Case Router" placeholder="Search cases, accounts, senders" action="/cases" avatar="JB" bell={false} />
        <div className="content">
          <div className="titlebar">
            <Link href="/cases" className="back" aria-label="Back to cases">←</Link>
            <h1>Routing performance</h1>
            <span className="live">Live</span>
            <div className="actions">
              <button className="btn" type="button">Export</button>
              <button className="btn" type="button">Threshold: {DEFAULT_THRESHOLD}% ▾</button>
            </div>
          </div>
          <div className="meta">
            Owner <b>Jared Belson</b> · Model <b>Claude (approved provider)</b> · Routing since <b>Nov 3, 2026</b>
          </div>

          <nav className="tabs">
            <Link href="/routing-performance?tab=queues" className={`tab${tab === "queues" ? " on" : ""}`}>Queues</Link>
            <Link href="/routing-performance" className={`tab${tab === "performance" ? " on" : ""}`}>Performance</Link>
            <Link href="/routing-performance?tab=corrections" className={`tab${tab === "corrections" ? " on" : ""}`}>Corrections</Link>
          </nav>

          <div className="range-row">
            <button className="btn sm" type="button">
              {fmtDate(new Date(m.range.from))} – {fmtDate(new Date(m.range.to))} ▾
            </button>
            <span>Compared with the alias each sender used before the single inbox</span>
          </div>

          {tab === "performance" && (
            <>
              <div className="kpis">
                <div className="kpi">
                  <div className="lbl">Routing accuracy</div>
                  <div className="val">{t.accuracyPct}%</div>
                  <div className="ft">
                    <span className="up">↑ 4 pts</span> vs last week · {t.correct.toLocaleString("en-US")} of {t.scored.toLocaleString("en-US")} cases
                  </div>
                </div>
                <div className="kpi">
                  <div className="lbl">Auto-routed</div>
                  <div className="val">{t.autoRoutedPct}%</div>
                  <div className="ft">{t.needsReviewPct}% sent to Needs review</div>
                </div>
                <div className="kpi">
                  <div className="lbl">Time to first assignment</div>
                  <div className="val">{t.medianMinutesToAssign ?? "—"} min</div>
                  <div className="ft">
                    <span className="down">↓ from 47 min</span> under alias routing
                  </div>
                </div>
                <div className="kpi">
                  <div className="lbl">Kept out of Salesforce</div>
                  <div className="val">{formatBytes(t.bytesKeptOutOfSalesforce)}</div>
                  <div className="ft">email records this period · storage was 99% used</div>
                </div>
              </div>

              <div className="cards">
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Cases routed per day</span>
                    <span className="legend">
                      <span className="dot">Auto-routed</span>
                      <span className="ring">Needs review</span>
                    </span>
                  </div>
                  <div className="bars">
                    {week.map((d) => (
                      <div key={d.date} className="bar-col">
                        <div className="bar-val">{d.total}</div>
                        <div className="bar-stack" style={{ height: `${(d.total / peak) * 82}%` }}>
                          <div className="seg-auto" style={{ height: `${d.total ? (d.auto / d.total) * 100 : 0}%` }} />
                          <div className="seg-review" style={{ height: `${d.total ? (d.review / d.total) * 100 : 0}%` }} />
                        </div>
                        <div className="bar-lbl">{DAY[new Date(d.date).getUTCDay()]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Where cases went</span>
                  </div>
                  <div className="donut-row">
                    <div className="donut">
                      <svg viewBox="0 0 176 176" width="176" height="176" aria-hidden="true">
                        <g transform="rotate(-90 88 88)">
                          {slices.map((q) => (
                            <circle
                              key={q.queue}
                              cx="88"
                              cy="88"
                              r={R}
                              fill="none"
                              stroke={q.colour}
                              strokeWidth="22"
                              strokeDasharray={`${q.len} ${C - q.len}`}
                              strokeDashoffset={-q.offset}
                            />
                          ))}
                        </g>
                      </svg>
                      <div className="donut-c">
                        <div className="lbl">Cases</div>
                        <div className="val">{t.scored.toLocaleString("en-US")}</div>
                      </div>
                    </div>
                    <div className="keys">
                      {slices.map((q) => (
                        <div key={q.queue} className="key">
                          <span className="swatch" style={{ background: q.colour }} />
                          <span className="name">{q.queue}</span>
                          <span className="val">{q.cases.toLocaleString("en-US")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Accuracy by queue</span>
                  </div>
                  {accRows.map((q) => (
                    <div key={q.queue} className="acc-row">
                      <span>{q.queue}</span>
                      <span className="track">
                        <span className={`fill${q.accuracyPct < 90 ? " warn" : ""}`} style={{ width: `${q.accuracyPct}%` }} />
                      </span>
                      <span className="acc-val">{q.accuracyPct}%</span>
                    </div>
                  ))}
                  <p className="note">Billing &amp; Legal overlap most: 38 cases mentioned both an invoice and a contract.</p>
                </div>

                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Recent corrections</span>
                    <Link href="/routing-performance?tab=corrections" className="legend" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
                      All {t.corrections} →
                    </Link>
                  </div>
                  {m.recentCorrections.map((c) => (
                    <div key={c.caseId} className="corr">
                      <div className="s">{c.subject}</div>
                      <div className="m">
                        {c.fromQueue} → {c.toQueue} · by {c.correctedBy}
                      </div>
                    </div>
                  ))}
                  <p className="note">A moved case retrains nothing by itself; corrections are reviewed weekly and added to the routing rules.</p>
                </div>
              </div>
            </>
          )}

          {tab === "queues" && (
            <div className="panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Queue</th>
                    <th>Cases</th>
                    <th>Share</th>
                    <th>Corrections</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {m.accuracyByQueue.map((q) => (
                    <tr key={q.queue}>
                      <td>
                        <Link href={`/cases?queue=${encodeURIComponent(q.queue)}`} style={{ fontWeight: 600 }}>{q.queue}</Link>
                      </td>
                      <td className="num">{q.cases.toLocaleString("en-US")}</td>
                      <td className="num">{Math.round((q.cases / Math.max(1, t.scored)) * 100)}%</td>
                      <td className="num">{q.corrections}</td>
                      <td>
                        <span className={`pill ${q.accuracyPct >= 90 ? "green" : "amber"}`}>{q.accuracyPct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "corrections" && (
            <div className="panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Account</th>
                    <th>Moved</th>
                    <th>By</th>
                    <th>Reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="subject">{c.case.subject}</div>
                        <div className="sub2">{c.case.caseNumber}</div>
                      </td>
                      <td>{c.case.account?.name ?? "—"}</td>
                      <td>
                        {c.fromQueue} → {c.toQueue}
                      </td>
                      <td>{c.correctedBy}</td>
                      <td>{c.reason ?? "—"}</td>
                      <td className="num">{c.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
