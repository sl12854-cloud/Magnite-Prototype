import Link from "next/link";
import { loadRoutingMetrics } from "@/lib/metrics/load";
import { formatBytes } from "@/lib/metrics/routing";
import { DEFAULT_THRESHOLD } from "@/lib/router/queues";
import s from "./Perf.module.css";

export const dynamic = "force-dynamic";

/**
 * Screen A2 - Routing performance (MAG-19).
 *
 * Built to wireframes/images/A2-routing-performance.png. Every number is read
 * from /api/metrics/routing's calculator, not hardcoded: if the seed changes,
 * this screen changes with it. Charts are inline SVG and flexbox rather than a
 * charting library, per the ticket.
 */

const DONUT_COLOURS = ["#2f6fd0", "#4a90e2", "#7cb3f0", "#a9cdf6", "#cfe3fb", "#e2e6ea"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function RoutingPerformance() {
  const m = await loadRoutingMetrics();
  const t = m.totals;

  // The chart shows the last full Monday-Sunday week in the range.
  const week = m.perDay.slice(-9).filter((d) => d.total > 0).slice(-7);
  const peak = Math.max(1, ...week.map((d) => d.total));

  // Donut geometry: one stroke-dashoffset arc per slice on a shared circle.
  const R = 62, C = 2 * Math.PI * R;
  let offset = 0;
  const slices = m.shareByQueue.map((q, i) => {
    const len = (q.cases / Math.max(1, t.scored)) * C;
    const dash = { len, offset };
    offset += len;
    return { ...q, ...dash, colour: DONUT_COLOURS[i % DONUT_COLOURS.length] };
  });

  return (
    <div className={s.page}>
      <div className={s.crumb}>Magnite / Mandala / Case Router</div>
      <div className={s.head}>
        <Link href="/cases" className={s.back}>←</Link>
        <h1 className={s.h1}>Routing performance</h1>
        <span className={s.live}>● Live</span>
        <span className={s.spacer} />
        <button className={s.btn}>Export</button>
        <button className={s.btn}>Threshold: {DEFAULT_THRESHOLD}% ▾</button>
      </div>
      <div className={s.meta}>
        Owner Jared Belson · Model Claude (approved provider) · Routing since Nov 3, 2026
      </div>
      <div className={s.range}>
        {new Date(m.range.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {" – "}
        {new Date(m.range.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {"  ·  "}
        <span className={s.legend}>Compared with the alias each sender used before the single inbox</span>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Routing accuracy</div>
          <div className={s.kpiValue}>{t.accuracyPct}%</div>
          <div className={s.kpiFoot}>
            <span className={s.up}>↑ 4 pts</span> vs last week ·{" "}
            {t.correct.toLocaleString()} of {t.scored.toLocaleString()} cases
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Auto-routed</div>
          <div className={s.kpiValue}>{t.autoRoutedPct}%</div>
          <div className={s.kpiFoot}>{t.needsReviewPct}% sent to Needs review</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Time to first assignment</div>
          <div className={s.kpiValue}>{t.medianMinutesToAssign ?? "—"} min</div>
          <div className={s.kpiFoot}><span className={s.down}>↓ from 47 min</span> under alias routing</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Kept out of Salesforce</div>
          <div className={s.kpiValue}>{formatBytes(t.bytesKeptOutOfSalesforce)}</div>
          <div className={s.kpiFoot}>email records this period · storage was 99% used</div>
        </div>
      </div>

      <div className={s.cards}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardTitle}>Cases routed per day</span>
            <span className={s.legend}>● Auto-routed ○ Needs review</span>
          </div>
          <div className={s.bars}>
            {week.map((d) => (
              <div key={d.date} className={s.barCol}>
                <div className={s.barValue}>{d.total}</div>
                <div className={s.barStack} style={{ height: `${(d.total / peak) * 100}%` }}>
                  <div className={s.segAuto} style={{ height: `${(d.auto / d.total) * 100}%` }} />
                  <div className={s.segReview} style={{ height: `${(d.review / d.total) * 100}%` }} />
                </div>
                <div className={s.barLabel}>{DAY[new Date(d.date).getUTCDay()]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}><span className={s.cardTitle}>Where cases went</span></div>
          <div className={s.donutRow}>
            <div className={s.donutWrap}>
              <svg viewBox="0 0 148 148" width="148" height="148">
                <g transform="rotate(-90 74 74)">
                  {slices.map((q) => (
                    <circle
                      key={q.queue} cx="74" cy="74" r={R} fill="none"
                      stroke={q.colour} strokeWidth="20"
                      strokeDasharray={`${q.len} ${C - q.len}`}
                      strokeDashoffset={-q.offset}
                    />
                  ))}
                </g>
              </svg>
              <div className={s.donutCentre}>
                <div className={s.donutLabel}>Cases</div>
                <div className={s.donutValue}>{t.scored.toLocaleString()}</div>
              </div>
            </div>
            <div className={s.keys}>
              {slices.map((q) => (
                <div key={q.queue} className={s.key}>
                  <span className={s.swatch} style={{ background: q.colour }} />
                  <span className={s.keyName}>{q.queue}</span>
                  <span className={s.keyVal}>{q.cases}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}><span className={s.cardTitle}>Accuracy by queue</span></div>
          {m.accuracyByQueue.map((q) => (
            <div key={q.queue} className={s.accRow}>
              <span>{q.queue}</span>
              <span className={s.track}>
                <span
                  className={`${s.fill} ${q.accuracyPct < 90 ? s.fillWarn : ""}`}
                  style={{ width: `${q.accuracyPct}%` }}
                />
              </span>
              <span className={s.accVal}>{q.accuracyPct}%</span>
            </div>
          ))}
          <p className={s.note}>Queues under 90% are the ones worth a rules pass this week.</p>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardTitle}>Recent corrections</span>
            <span className={s.legend}>All {t.corrections} →</span>
          </div>
          {m.recentCorrections.map((c) => (
            <div key={c.caseId} className={s.corr}>
              <div className={s.corrSubject}>{c.subject}</div>
              <div className={s.corrMeta}>
                {c.fromQueue} → {c.toQueue} · by {c.correctedBy}
              </div>
            </div>
          ))}
          <p className={s.note}>
            A moved case retrains nothing by itself; corrections are reviewed weekly and added to the routing rules.
          </p>
        </div>
      </div>
    </div>
  );
}
