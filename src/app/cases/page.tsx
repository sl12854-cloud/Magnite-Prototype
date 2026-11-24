import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadQueueCounts, loadRoutingMetrics } from "@/lib/metrics/load";
import { CASE_STATUSES, NEEDS_REVIEW, QUEUES, UNROUTED, confidenceBand, isQueue } from "@/lib/router/queues";
import { routeInbox } from "./actions";
import { Rail, TopBar } from "./shell";

export const dynamic = "force-dynamic";

/** Screen A1 - Case queue (MAG-18). Built to wireframes/images/A1-case-queue.png. */

type Search = { queue?: string; status?: string; confidence?: string; received?: string; tab?: string; q?: string };

const ME = "J. Belson"; // persona on the wireframe (JB)
const TZ = "America/New_York";
const PAGE = 25;

const STATUS_TONE: Record<string, string> = {
  New: "blue",
  Assigned: "amber",
  "In progress": "amber",
  "Waiting on client": "amber",
  "Needs review": "red",
  Closed: "green",
};
const BAND_TONE = { high: "green", medium: "amber", low: "red" } as const;

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** "9:12 AM" today, "Yesterday", otherwise "Oct 26", all in the office time zone. */
function fmtReceived(d: Date, now: Date): string {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
  const key = dayKey(d);
  if (key === today) return d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  if (key === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
}

function ago(from: Date, now: Date): string {
  const m = Math.max(1, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function startOfDaysAgo(now: Date, days: number): Date {
  const key = dayKey(new Date(now.getTime() - days * 86_400_000));
  return new Date(`${key}T00:00:00-05:00`);
}

const RECEIVED = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
const CONF = { high: "85% and above", medium: "70–84%", low: "Below 70%" } as const;

export default async function CaseQueue({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const now = new Date();
  const tab = sp.tab === "mine" || sp.tab === "review" ? sp.tab : "all";
  const queue = sp.queue && isQueue(sp.queue) ? sp.queue : undefined;

  const where: Record<string, unknown> = {};
  if (queue) where.queue = queue;
  else if (tab === "review") where.queue = NEEDS_REVIEW;
  else where.queue = { not: UNROUTED }; // the inbox is pre-routing; it has its own queue entry
  if (tab === "mine") where.ownerName = ME;
  if (sp.status && (CASE_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (sp.confidence === "high") where.confidence = { gte: 85 };
  if (sp.confidence === "medium") where.confidence = { gte: 70, lt: 85 };
  if (sp.confidence === "low") where.confidence = { lt: 70 };
  if (sp.received === "today") where.receivedAt = { gte: startOfDaysAgo(now, 0) };
  if (sp.received === "7d") where.receivedAt = { gte: startOfDaysAgo(now, 7) };
  if (sp.received === "30d") where.receivedAt = { gte: startOfDaysAgo(now, 30) };
  if (sp.q) {
    where.OR = [
      { subject: { contains: sp.q, mode: "insensitive" } },
      { fromEmail: { contains: sp.q, mode: "insensitive" } },
      { caseNumber: { contains: sp.q, mode: "insensitive" } },
      { account: { name: { contains: sp.q, mode: "insensitive" } } },
    ];
  }

  const [cases, total, counts, metrics, allCount, mineCount, reviewCount, latest] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: PAGE,
      include: {
        account: {
          select: {
            name: true,
            contracts: { select: { product: { select: { name: true } } }, orderBy: { startDate: "desc" }, take: 1 },
            opportunities: { select: { product: { select: { name: true } } }, orderBy: { closeDate: "desc" }, take: 1 },
          },
        },
      },
    }),
    prisma.case.count({ where }),
    loadQueueCounts(),
    loadRoutingMetrics(),
    prisma.case.count({ where: { queue: { not: UNROUTED } } }),
    prisma.case.count({ where: { ownerName: ME, status: { not: "Closed" } } }),
    prisma.case.count({ where: { queue: NEEDS_REVIEW, status: { not: "Closed" } } }),
    prisma.case.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  const waiting = counts[UNROUTED] ?? 0;

  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const qs = next.toString();
    return `/cases${qs ? `?${qs}` : ""}`;
  };

  const productOf = (c: (typeof cases)[number]) => {
    const name = c.account?.contracts[0]?.product?.name ?? c.account?.opportunities[0]?.product?.name;
    return name?.replace(/^Magnite /, "");
  };

  return (
    <div className="shell">
      <Rail active="cases" />
      <aside className="sidebar">
        <div className="side-head">
          <span className="side-label">Queues</span>
          <span className="side-email">support@magnite.com</span>
        </div>
        {QUEUES.map((q) => (
          <Link key={q} href={href({ queue: queue === q ? undefined : q, tab: undefined })} className={`qlink${queue === q ? " on" : ""}`}>
            <span>{q}</span>
            <span className="qcount">{counts[q] ?? 0}</span>
          </Link>
        ))}
        <div className="side-foot">
          <div className="lbl">Routing accuracy this week</div>
          <div className="big">
            {metrics.totals.accuracyPct}%<span className="delta">↑ 4 pts</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <TopBar crumb="Case Router" placeholder="Search cases, accounts, senders" action="/cases" query={sp.q} avatar="JB" />
        <div className="content">
          <div className="titlebar">
            <h1>Cases</h1>
            <span className="sub">
              {queue ?? (tab === "review" ? "Needs review" : tab === "mine" ? "Mine" : "All queues")} · updated {latest ? ago(latest.updatedAt, now) : "just now"}
            </span>
            <div className="actions">
              <form action={routeInbox}>
                <input type="hidden" name="mode" value="rules" />
                <button className="btn" type="submit" disabled={waiting === 0}>Route with rules only</button>
              </form>
              <form action={routeInbox}>
                <input type="hidden" name="mode" value="ai" />
                <button className="btn primary" type="submit" disabled={waiting === 0}>
                  ✦ Route inbox with AI · {waiting} waiting
                </button>
              </form>
            </div>
          </div>

          <nav className="tabs">
            <Link href={href({ tab: undefined, queue: undefined })} className={`tab${tab === "all" && !queue ? " on" : ""}`}>
              All cases<span className="n">{allCount.toLocaleString("en-US")}</span>
            </Link>
            <Link href={href({ tab: "mine", queue: undefined })} className={`tab${tab === "mine" ? " on" : ""}`}>
              Mine<span className="n">{mineCount}</span>
            </Link>
            <Link href={href({ tab: "review", queue: undefined })} className={`tab${tab === "review" ? " on" : ""}`}>
              Needs review<span className="n amber">{reviewCount}</span>
            </Link>
            <span className="tab">+ Add view</span>
            <Link href="/routing-performance" className="right">View routing performance →</Link>
          </nav>

          <div className="filters">
            <form className="fsearch" action="/cases" method="get">
              {Object.entries(sp).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
              <SearchIcon />
              <input name="q" placeholder="Search" defaultValue={sp.q ?? ""} aria-label="Search cases" />
            </form>
            <Dropdown label="Queue" set={!!queue}>
              <Link href={href({ queue: undefined })} className={!queue ? "on" : undefined}>All queues</Link>
              {QUEUES.map((q) => (
                <Link key={q} href={href({ queue: q, tab: undefined })} className={queue === q ? "on" : undefined}>
                  <span>{q}</span>
                  <span className="n">{counts[q] ?? 0}</span>
                </Link>
              ))}
            </Dropdown>
            <Dropdown label="Status" set={!!sp.status}>
              <Link href={href({ status: undefined })} className={!sp.status ? "on" : undefined}>Any status</Link>
              {CASE_STATUSES.map((st) => (
                <Link key={st} href={href({ status: st })} className={sp.status === st ? "on" : undefined}>{st}</Link>
              ))}
            </Dropdown>
            <Dropdown label="Confidence" set={!!sp.confidence}>
              <Link href={href({ confidence: undefined })} className={!sp.confidence ? "on" : undefined}>Any confidence</Link>
              {(Object.keys(CONF) as (keyof typeof CONF)[]).map((k) => (
                <Link key={k} href={href({ confidence: k })} className={sp.confidence === k ? "on" : undefined}>{CONF[k]}</Link>
              ))}
            </Dropdown>
            <Dropdown label="Received" set={!!sp.received}>
              <Link href={href({ received: undefined })} className={!sp.received ? "on" : undefined}>Any time</Link>
              {(Object.keys(RECEIVED) as (keyof typeof RECEIVED)[]).map((k) => (
                <Link key={k} href={href({ received: k })} className={sp.received === k ? "on" : undefined}>{RECEIVED[k]}</Link>
              ))}
            </Dropdown>
            <button className="btn right" type="button">Manage table</button>
          </div>

          <div className="panel">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Subject<span className="sort">⇅</span></th>
                  <th>From · account</th>
                  <th>Routed to<span className="sort">⇅</span></th>
                  <th>Confidence<span className="sort">⇅</span></th>
                  <th>Status<span className="sort">⇅</span></th>
                  <th>Owner</th>
                  <th>Received<span className="sort">⇅</span></th>
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const product = productOf(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="subject">{c.subject}</div>
                        {c.intent && <div className="sub2">{c.intent}</div>}
                      </td>
                      <td>
                        <div className="from">{c.fromEmail}</div>
                        <div className="sub2">
                          {c.account?.name ?? "Unknown sender"}
                          {product ? ` · ${product}` : ""}
                        </div>
                      </td>
                      <td className="nowrap">{c.queue === UNROUTED ? "—" : c.queue}</td>
                      <td>
                        {c.confidence == null ? (
                          <span className="pill grey">Not routed</span>
                        ) : (
                          <span className={`pill ${BAND_TONE[confidenceBand(c.confidence)]}`}>{c.confidence}%</span>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${STATUS_TONE[c.status] ?? "grey"}`}>{c.status}</span>
                      </td>
                      <td className="nowrap">{c.ownerName ?? "—"}</td>
                      <td className="num nowrap">{fmtReceived(c.receivedAt, now)}</td>
                      <td>
                        <button className="more" type="button" aria-label={`Actions for ${c.caseNumber}`}>···</button>
                      </td>
                    </tr>
                  );
                })}
                {cases.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty">No cases match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="foot">
            <span>
              Showing {cases.length} of {total.toLocaleString("en-US")} {queue === UNROUTED ? "unrouted emails" : "cases"}
            </span>
            <span>Every email to support@ becomes a case here. Nothing is written to Salesforce until a case closes.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dropdown({ label, set, children }: { label: string; set: boolean; children: React.ReactNode }) {
  return (
    <details className={`dd${set ? " set" : ""}`}>
      <summary>{label}</summary>
      <div className="menu">{children}</div>
    </details>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
